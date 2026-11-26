import { randomUUID } from 'node:crypto'
import { HttpException, Injectable, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service.js'
import { ExamsService } from '../exams/exams.service.js'
import { userSummary } from '../accounts/user-summary.js'
import { bootstrapId } from '../config.js'
import { objectFields } from '../types.js'
import { testSummary, validateTest } from './test-input.js'

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService, private readonly exams: ExamsService) {}

  private async findUser(id: string) {
    const user = await this.db.users.findOne({ _id: id })
    if (!user) throw new NotFoundException('User not found.')
    return user
  }

  async listUsers() {
    const { users } = this.db
    const rows = await users.find().sort({ name: 1, _id: 1 }).toArray()
    return rows.map(user => userSummary(user, bootstrapId))
  }

  async getUser(userId: string) {
    const target = await this.findUser(userId)
    return { ...userSummary(target, bootstrapId), ...await this.exams.getProgress(target._id) }
  }

  async updateUser(owner: string, userId: string, input: unknown) {
    const { users } = this.db
    const target = await this.findUser(userId)
    const { role, disabled } = objectFields(input)
    if ((role !== 'admin' && role !== 'student') || typeof disabled !== 'boolean') {
      throw new HttpException('Choose a valid role and account status.', 400)
    }
    if ((target._id === owner || target._id === bootstrapId) && (role !== 'admin' || disabled)) {
      throw new HttpException('The signed-in admin and the bootstrap admin must stay active administrators.', 400)
    }
    const updated = await users.findOneAndUpdate({ _id: target._id }, {
      $set: { role, disabled },
    }, { returnDocument: 'after' })
    if (!updated) throw new HttpException('User not found.', 404)
    return userSummary(updated, bootstrapId)
  }

  async assignTest(userId: string, testId: string, input: unknown) {
    const { users, tests } = this.db
    const target = await this.findUser(userId)
    const { assigned } = objectFields(input)
    if (typeof assigned !== 'boolean') throw new HttpException('Choose whether to assign the test.', 400)
    const test = await tests.findOne({ _id: testId }, { projection: { archived: 1 } })
    if (assigned && (!test || test.archived)) throw new HttpException('Active test not found.', 404)
    const update = assigned
      ? { $addToSet: { assignedTests: testId } }
      : { $pull: { assignedTests: testId } }
    const updated = await users.findOneAndUpdate({ _id: target._id }, update, { returnDocument: 'after' })
    if (!updated) throw new HttpException('User not found.', 404)
    return userSummary(updated, bootstrapId)
  }

  async listCourses() {
    const { courseStore } = this.db
    return (await courseStore.list()).map(({ _id, ...course }) => ({ id: _id, ...course }))
  }

  async listTests() {
    const { tests, courseStore } = this.db
    const rows = await tests.find({}, { projection: { questions: 0 } }).sort({ title: 1 }).toArray()
    const names = new Map((await courseStore.list()).map(course => [course._id, course.name]))
    return rows.map(({ _id, ...test }) => ({ id: _id, ...test, courseName: names.get(test.courseId) }))
  }

  async createTest(input: unknown) {
    const { tests, courseStore, topicStore } = this.db
    const fields = validateTest(input)
    const course = await courseStore.find(fields.courseId)
    if (!course) throw new HttpException('Choose a course from the catalog.', 400)
    const _id = randomUUID()
    const referenced = await topicStore.referenceQuestions({ _id, ...fields })
    const test = { _id, ...fields, ...referenced, questionCount: fields.questions.length, revision: 1, archived: false }
    await tests.insertOne(test)
    return testSummary(test, course.name)
  }

  async getTest(testId: string) {
    const { tests, courseStore, topicStore } = this.db
    const test = await tests.findOne({ _id: testId })
    if (!test) throw new HttpException('Test not found.', 404)
    const questions = await topicStore.resolveQuestions(test.questions)
    const course = await courseStore.find(test.courseId)
    return { ...testSummary(test, course?.name), questions: questions.map(({ topicDetails, ...question }) => {
      const topics = topicDetails?.map(topic => topic.label) ?? []
      return { ...question, topics, ...(topics.length === 1 && { topic: topics[0] }) }
    }) }
  }

  async updateTest(testId: string, input: unknown) {
    const { tests, courseStore, topicStore } = this.db
    const fields = validateTest(input)
    const { revision } = objectFields(input)
    if (typeof revision !== 'number' || !Number.isInteger(revision)) throw new HttpException('A test revision is required.', 400)
    const filter = { _id: testId, revision, archived: false }
    const current = await tests.findOne(filter, { projection: { _id: 1 } })
    if (!current) throw new HttpException('The test changed or was archived. Reopen it before editing again.', 409)
    const course = await courseStore.find(fields.courseId)
    if (!course) throw new HttpException('Choose a course from the catalog.', 400)
    const referenced = await topicStore.referenceQuestions({ ...current, ...fields })
    const test = await tests.findOneAndUpdate(filter,
      { $set: { ...fields, ...referenced, questionCount: fields.questions.length }, $inc: { revision: 1 } },
      { returnDocument: 'after' })
    if (!test) throw new HttpException('The test changed or was archived. Reopen it before editing again.', 409)
    return testSummary(test, course.name)
  }

  async archiveTest(testId: string) {
    const { tests } = this.db
    const result = await tests.updateOne({ _id: testId, archived: false },
      { $set: { archived: true }, $inc: { revision: 1 } })
    if (!result.matchedCount) throw new HttpException('Active test not found.', 404)
  }
}
