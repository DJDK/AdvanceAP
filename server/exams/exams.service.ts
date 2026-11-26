import { HttpException, Injectable, NotFoundException } from '@nestjs/common'
import type { BeforeApplicationShutdown, OnApplicationBootstrap } from '@nestjs/common'
import { MongoServerError, ObjectId } from 'mongodb'
import type { Filter } from 'mongodb'
import { DatabaseService, defaultTitle } from '../database/database.service.js'
import { examId, grade, studentQuestions, topicFeedback } from './exam.js'
import { isArray, objectFields } from '../types.js'
import type { Account, Attempt, Exam } from '../types.js'

function summarize(attempt: Attempt) {
  return {
    id: attempt._id.toString(),
    status: attempt.status,
    examId: attempt.examId,
    title: attempt.title ?? defaultTitle,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt,
    submission: attempt.submission,
    result: attempt.result && {
      rawScore: attempt.result.rawScore,
      total: attempt.result.total,
      estimatedScore: attempt.result.estimatedScore,
    },
  }
}

export function availableTests(account: Account): Filter<Exam> {
  return { archived: false, $or: [{ access: 'open' }, { _id: { $in: account.assignedTests } }] }
}

@Injectable()
export class ExamsService implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private sweeping = false
  private sweeper?: ReturnType<typeof setInterval>
  constructor(private readonly db: DatabaseService) {}

  onApplicationBootstrap() {
    this.sweeper = setInterval(() => void this.sweepExpired(), 5000)
    void this.sweepExpired()
  }

  beforeApplicationShutdown() {
    clearInterval(this.sweeper)
  }

  async originalExam(account: Account) {
    const { tests } = this.db
    const test = await tests.findOne({ _id: examId, ...availableTests(account) })
    if (!test) throw new HttpException('Test not available.', 404)
    return { duration: test.duration, questionCount: test.questionCount }
  }

  async listAttempts(owner: string) {
    const { attempts } = this.db
    const [active, recent] = await Promise.all([
      attempts.find({ owner: owner, status: 'active' }).toArray(),
      attempts.find({ owner: owner, status: 'submitted' }).sort({ startedAt: -1 }).limit(25).toArray(),
    ])
    const updated = await Promise.all(active.map(row => this.finalize(row)))
    const history = [...new Map([...updated, ...recent].map(row => [row._id.toString(), row])).values()]
    return history.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()).map(summarize)
  }

  async startAttempt(account: Account, input: unknown) {
    const { attempts, tests } = this.db
    const selectedId = objectFields(input).examId ?? examId
    if (typeof selectedId !== 'string') throw new HttpException('Choose a test.', 400)
    const active = await attempts.findOne({ owner: account._id, examId: selectedId, status: 'active' })
    if (active) {
      const current = await this.finalize(active)
      if (current.status === 'active') {
        return { created: false, attempt: await this.detail(current) }
      }
    }
    const test = await tests.findOne({ _id: selectedId, ...availableTests(account) })
    if (!test) throw new HttpException('Test not available.', 404)
    const startedAt = new Date()
    const attempt: Attempt = {
      _id: new ObjectId(), owner: account._id, examId: selectedId, status: 'active',
      title: test.title, courseId: test.courseId, questions: test.questions,
      startedAt, expiresAt: new Date(startedAt.getTime() + test.duration * 1000),
      answers: {}, revision: 0,
    }
    try {
      await attempts.insertOne(attempt)
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000) throw error
      const existing = await attempts.findOne({ owner: account._id, examId: selectedId, status: 'active' })
      if (existing) {
        return { created: false, attempt: await this.detail(await this.finalize(existing)) }
      }
      throw new HttpException('Another tab just changed your attempt. Try again.', 409)
    }
    return { created: true, attempt: await this.detail(attempt) }
  }

  async getAttempt(owner: string, attemptId: string) {
    const owned = await this.findAttempt(owner, attemptId)
    return this.detail(await this.finalize(owned))
  }

  async saveAnswer(owner: string, attemptId: string, questionId: string, input: unknown) {
    const { attempts, originalQuestionRefs } = this.db
    const owned = await this.findAttempt(owner, attemptId)
    const question = (owned.questions ?? originalQuestionRefs).find(item => item.id === questionId)
    if (!question) throw new HttpException('Question not found.', 404)
    const { selected } = objectFields(input)
    if (!isArray(selected) || selected.length > question.select
      || new Set(selected).size !== selected.length
      || selected.some(option => typeof option !== 'number' || !Number.isInteger(option) || option < 0 || option >= question.options.length)) {
      throw new HttpException('Invalid answer selection.', 400)
    }
    const update = await attempts.updateOne({
      _id: owned._id,
      status: 'active',
      $expr: { $gt: ['$expiresAt', '$$NOW'] },
    }, {
      $set: { [`answers.${question.id}`]: selected },
      $inc: { revision: 1 },
    })
    if (!update.matchedCount) {
      const attempt = await attempts.findOne({ _id: owned._id })
      if (!attempt) throw new HttpException('Attempt not found.', 404)
      throw new HttpException(await this.detail(await this.finalize(attempt)), 409)
    }
  }

  async submitAttempt(owner: string, attemptId: string) {
    const owned = await this.findAttempt(owner, attemptId)
    return this.detail(await this.finalize(owned, true))
  }

  async findAttempt(owner: string, id: string) {
    const attempt = /^[a-f\d]{24}$/i.test(id)
      ? await this.db.attempts.findOne({ _id: new ObjectId(id), owner })
      : null
    if (!attempt) throw new NotFoundException('Attempt not found.')
    return attempt
  }

  async getProgress(owner: string) {
    const rows = await this.db.attempts.find({ owner }).sort({ startedAt: -1 }).toArray()
    const progress = await Promise.all(rows.map(async row => {
      const attempt = await this.finalize(row)
      const questions = await this.attemptQuestions(attempt)
      return {
        ...summarize(attempt),
        answered: questions.filter(question => attempt.answers[question.id]?.length === question.select).length,
        questionCount: questions.length,
        topics: attempt.result && grade(attempt.answers, questions).topics,
      }
    }))
    return { attempts: progress }
  }

  attemptQuestions(attempt: Attempt) {
    return this.db.topicStore.resolveQuestions(attempt.questions ?? this.db.originalQuestionRefs)
  }

  async detail(attempt: Attempt) {
    const summary = { ...summarize(attempt), serverTime: new Date() }
    if (attempt.status === 'active') {
      return { ...summary, answers: attempt.answers, questions: studentQuestions(attempt.questions ?? this.db.originalQuestionRefs) }
    }
    if (summary.result) {
      const questions = await this.attemptQuestions(attempt)
      return { ...summary, result: {
        ...summary.result,
        topicFeedback: topicFeedback(attempt.answers, questions),
        incompleteQuestions: questions.filter(question =>
          (attempt.answers[question.id]?.length ?? 0) < question.select).length,
      } }
    }
    return summary
  }

  async finalize(attempt: Attempt, requested = false): Promise<Attempt> {
    while (attempt.status === 'active') {
      const now = new Date()
      const expired = now >= attempt.expiresAt
      if (!requested && !expired) return attempt

      const updated = await this.db.attempts.findOneAndUpdate(
        { _id: attempt._id, status: 'active', revision: attempt.revision },
        { $set: {
          status: 'submitted',
          submittedAt: expired ? attempt.expiresAt : now,
          submission: expired ? 'time' : 'student',
          result: grade(attempt.answers, await this.attemptQuestions(attempt)),
        } },
        { returnDocument: 'after' },
      )
      if (updated) return updated
      const current = await this.db.attempts.findOne({ _id: attempt._id })
      if (!current) throw new Error('Attempt disappeared during submission.')
      attempt = current
    }
    return attempt
  }

  async sweepExpired() {
    if (this.sweeping) return
    this.sweeping = true
    try {
      for await (const attempt of this.db.attempts.find({ status: 'active', expiresAt: { $lte: new Date() } })) {
        await this.finalize(attempt)
      }
    } catch (error) {
      console.error('Could not finalize expired attempts', error)
    } finally {
      this.sweeping = false
    }
  }
}

