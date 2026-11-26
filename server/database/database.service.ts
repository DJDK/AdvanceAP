import { Injectable } from '@nestjs/common'
import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common'
import { MongoClient } from 'mongodb'
import { bank, examId } from '../exams/exam.js'
import { csaSample } from '../exams/csa-sample.js'
import { createTopicStore } from '../catalog/course-topics.js'
import { createCourseStore, csaCourseId, cspCourseId, legacyCourseId, officialCourses } from '../catalog/courses.js'
import { bootstrapId, database, duration, mongoUri } from '../config.js'
import type { Account, Attempt, Course, CourseTopic, Exam, Question } from '../types.js'

export const defaultTitle = 'AP Computer Science Principles'

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly client = new MongoClient(mongoUri!, { serverSelectionTimeoutMS: 5000 })
  private readonly db = this.client.db(database)
  readonly attempts = this.db.collection<Attempt>('attempts')
  readonly users = this.db.collection<Account>('users')
  readonly tests = this.db.collection<Exam>('tests')
  readonly courseStore = createCourseStore(this.db.collection<Course>('courses'))
  readonly topicStore = createTopicStore(this.db.collection<CourseTopic>('courseTopics'))
  originalQuestionRefs: Question[] = []

  async onModuleInit() {
    await this.client.connect()
    const { attempts, users, tests, courseStore, topicStore } = this
    await courseStore.seed()
    await topicStore.seed()
    const defaultDescription = 'Take a full-length multiple-choice section and see your raw score and estimated AP score when you finish.'

    const builtInTests = [
      { _id: examId, title: defaultTitle, courseId: cspCourseId, description: defaultDescription, duration, access: 'open' as const, questions: bank },
      csaSample,
    ]
    for (const { _id, ...test } of builtInTests) {
      const referenced = await topicStore.referenceQuestions({ _id, ...test })
      await tests.updateOne({ _id }, { $setOnInsert: {
        ...test, ...referenced, questionCount: test.questions.length, archived: false, revision: 1,
      } }, { upsert: true })
    }
    // Normalize older course links and question snapshots without changing answers or scores.
    const legacyTopics = [
      { 'questions.topic': { $exists: true } },
      { 'questions.topicId': { $exists: true } },
    ]
    const registeredCourses = new Set(officialCourses.map(course => course._id))
    async function registerLegacyCourse(id: string, name?: string) {
      if (registeredCourses.has(id)) return
      await courseStore.ensureLegacy(id, name)
      registeredCourses.add(id)
    }
    const testCourses = new Map<string, string>()
    for await (const test of tests.find<Exam & { topic?: string }>({})) {
      const builtInId = test._id === examId ? cspCourseId : test._id === csaSample._id ? csaCourseId : undefined
      const courseId = legacyCourseId(test.courseId || builtInId || test.topic)
      testCourses.set(test._id, courseId)
      await registerLegacyCourse(courseId, test.topic)
      if (test.courseId === courseId && test.topic === undefined
        && test.questions.every(question => question.topicIds && !question.topic && !question.topicId)) continue
      const referenced = await topicStore.referenceQuestions({ ...test, courseId }, Boolean(test.courseId && test.courseId !== courseId))
      await tests.updateOne({ _id: test._id, revision: test.revision }, { $set: referenced, $unset: { topic: '' } })
    }

    const oldCourseIds = (await attempts.distinct('courseId'))
      .filter((id): id is string => typeof id === 'string' && legacyCourseId(id) !== id)
    const legacyAttempts = { $or: [
      ...legacyTopics, { courseId: { $exists: false } }, { courseId: { $in: oldCourseIds } },
    ] }
    for await (const attempt of attempts.find(legacyAttempts, {
      projection: { examId: 1, courseId: 1, questions: 1 },
    })) {
      const courseId = attempt.courseId ? legacyCourseId(attempt.courseId)
        : testCourses.get(attempt.examId) ?? (attempt.examId === examId ? cspCourseId : 'uncategorized')
      await registerLegacyCourse(courseId)
      const fields = attempt.questions
        ? await topicStore.referenceQuestions({ _id: attempt.examId, courseId, questions: attempt.questions },
          Boolean(attempt.courseId && attempt.courseId !== courseId))
        : { courseId }
      await attempts.updateOne({ _id: attempt._id, ...legacyAttempts }, { $set: fields })
    }
    const { questions: originalQuestionRefs } = await topicStore.referenceQuestions({
      _id: examId, courseId: cspCourseId, questions: bank,
    })

    this.originalQuestionRefs = originalQuestionRefs

    // Keep the existing environment-based timer override until the original test is edited.
    await tests.updateOne({ _id: examId, revision: 1, archived: false }, { $set: { duration } })

    if (bootstrapId) await this.register(bootstrapId)

    // Preserve discoverability for users who attempted the original exam before accounts existed.
    for await (const row of attempts.aggregate<{ _id: string; firstAttempt: Date }>([{ $group: { _id: '$owner', firstAttempt: { $min: '$startedAt' } } }])) {
      await users.updateOne({ _id: row._id }, { $setOnInsert: {
        role: 'student', disabled: false, assignedTests: [], createdAt: row.firstAttempt,
      } }, { upsert: true })
    }
    await attempts.createIndex({ owner: 1, examId: 1 }, {
      unique: true,
      partialFilterExpression: { status: 'active' },
    })
    await attempts.createIndex({ status: 1, expiresAt: 1 })
    await attempts.createIndex({ owner: 1, startedAt: -1 })
    await attempts.createIndex({ owner: 1, status: 1, submittedAt: -1, _id: -1 })
  }

  async ping() {
    await this.db.command({ ping: 1 })
  }

  async onApplicationShutdown() {
    await this.client.close()
  }

  async register(id: string) {
    const bootstrap = id === bootstrapId
    const account = await this.users.findOneAndUpdate({ _id: id }, {
      $setOnInsert: { assignedTests: [], createdAt: new Date(), ...(bootstrap ? {} : { role: 'student', disabled: false }) },
      ...(bootstrap ? { $set: { role: 'admin', disabled: false } } : {}),
    }, { upsert: true, returnDocument: 'after' })
    if (!account) throw new Error('Account registration did not return a document.')
    return account
  }
}
