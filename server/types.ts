import type { ObjectId } from 'mongodb'

export interface TopicDetails {
  id?: string
  label?: string
  name?: string
  code?: string
  bigIdea?: string
}

export interface CourseTopic {
  _id: string
  courseId: string
  label: string
  name: string
  code?: string
  bigIdea?: string
}

export interface ScorableQuestion {
  id: string
  correct: number[]
  select: number
  topic?: string
  topics?: string[]
  topicId?: string
  topicIds?: string[]
  topicDetails?: TopicDetails[]
}

export interface Question extends ScorableQuestion {
  prompt: string
  options: string[]
  passage: string | null
}

export type Answers = Record<string, number[]>
export type TopicScores = Record<string, { correct: number; total: number }>

export interface Score {
  rawScore: number
  total: number
  estimatedScore: number
  topics: TopicScores
}

export interface TopicPerformance {
  topicId?: string
  name?: string
  code?: string
  bigIdea?: string
  correct: number
  incorrect: number
  incomplete: number
}

export interface Attempt {
  _id: ObjectId
  owner: string
  examId: string
  status: 'active' | 'submitted'
  title?: string
  courseId?: string
  questions?: Question[]
  startedAt: Date
  expiresAt: Date
  submittedAt?: Date
  submission?: 'time' | 'student'
  answers: Answers
  result?: Score
  revision: number
}

export interface Course {
  _id: string
  name: string
  subject: string
  official: boolean
}

export interface Exam {
  _id: string
  title: string
  description: string
  duration: number
  access: 'open' | 'assigned'
  questions: Question[]
  questionCount: number
  courseId: string
  archived: boolean
  revision: number
}

export interface Account {
  _id: string
  name?: string
  email?: string
  role: 'student' | 'admin'
  disabled: boolean
  assignedTests: string[]
  createdAt: Date
  profileSyncedAt?: Date
}

export interface LatestSkill {
  mastered: boolean
  correct: number
  total: number
  submittedAt: Date
  testTitle: string
}

export interface ProfileSkill {
  id: string
  name: string
  code?: string
  bigIdea?: string
  latest: LatestSkill | null
}

declare global {
  namespace Express {
    interface Request {
      owner: string
      account: Account
    }
  }
}

export function objectFields(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}
