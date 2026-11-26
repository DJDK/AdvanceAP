import { Injectable } from '@nestjs/common'
import { DatabaseService, defaultTitle } from '../database/database.service.js'
import { ExamsService, availableTests } from '../exams/exams.service.js'
import { cspCourseId, csaCourseId } from '../catalog/courses.js'
import { topicFeedback } from '../exams/exam.js'
import { bootstrapId, domain } from '../config.js'
import { objectFields } from '../types.js'
import type { Account, LatestSkill, ProfileSkill } from '../types.js'
import { userSummary } from './user-summary.js'

@Injectable()
export class AccountsService {
  constructor(private readonly db: DatabaseService, private readonly exams: ExamsService) {}

  async me(account: Account, token?: string) {
    const { users } = this.db
    if (!account.profileSyncedAt) {
      try {
        const response = await fetch(`https://${domain}/userinfo`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(3500),
        })
        const profile = objectFields(response.ok ? await response.json() : null)
        if (profile.sub === account._id) {
          const fields: Partial<Account> = { profileSyncedAt: new Date() }
          if (typeof profile.name === 'string') fields.name = profile.name.slice(0, 200)
          if (typeof profile.email === 'string') fields.email = profile.email.slice(0, 254)
          await users.updateOne({ _id: account._id }, { $set: fields })
          Object.assign(account, fields)
        }
      } catch {
        // The verified subject still identifies the account when Auth0 profile data is unavailable.
      }
    }
    return userSummary(account, bootstrapId)
  }

  async profile(account: Account) {
    const { attempts, tests, courseStore, topicStore, originalQuestionRefs } = this.db
    const owner = account._id
    for await (const expired of attempts.find({ owner, status: 'active', expiresAt: { $lte: new Date() } })) {
      await this.exams.finalize(expired)
    }

    const [available, attempted] = await Promise.all([
      tests.find(availableTests(account), { projection: { courseId: 1 } }).toArray(),
      attempts.distinct('courseId', { owner, status: 'submitted' }),
    ])
    const visibleCourseIds = new Set([cspCourseId, csaCourseId, ...available.map(test => test.courseId), ...attempted])
    const courses = new Map((await courseStore.list())
      .filter(course => visibleCourseIds.has(course._id)).map(course => [course._id, course.name]))

    const skills = await topicStore.listCourses([...courses.keys()])
    const remaining = new Set(skills.map(skill => skill._id))
    const latest = new Map<string, LatestSkill>()
    const submitted = attempts.find({ owner, status: 'submitted' }, {
      projection: {
        title: 1, submittedAt: 1, expiresAt: 1, answers: 1,
        'questions.id': 1, 'questions.topicIds': 1, 'questions.select': 1, 'questions.correct': 1,
      },
    }).sort({ submittedAt: -1, _id: -1 })
    for await (const attempt of submitted) {
      const questions = (attempt.questions ?? originalQuestionRefs).filter(question => question.topicIds?.some(id => remaining.has(id)))
      for (const skill of topicFeedback(attempt.answers, questions)) {
        if (!skill.topicId || !remaining.delete(skill.topicId)) continue
        latest.set(skill.topicId, {
          mastered: skill.mastered,
          correct: skill.correct,
          total: skill.correct + skill.incorrect + skill.incomplete,
          submittedAt: attempt.submittedAt ?? attempt.expiresAt,
          testTitle: attempt.title ?? defaultTitle,
        })
      }
      if (!remaining.size) break
    }

    const byCourse = new Map<string, { id: string; name: string; skills: ProfileSkill[] }>([...courses].map(([id, name]) => [id, { id, name, skills: [] }]))
    for (const { _id, courseId, name, code, bigIdea } of skills) {
      byCourse.get(courseId)?.skills.push({ id: _id, name, code, bigIdea, latest: latest.get(_id) ?? null })
    }
    return { courses: [...byCourse.values()]
      .filter(course => course.skills.length)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(course => ({
        ...course,
        skills: course.skills.sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '', 'en', { numeric: true })
          || a.name.localeCompare(b.name)),
      })) }
  }
}
