export type Api = <Response>(path: string, options?: RequestInit) => Promise<Response>

export interface Account {
  id: string
  name?: string
  email?: string
  role: 'student' | 'admin'
  disabled: boolean
  assignedTests: string[]
  bootstrap: boolean
}

export interface Course {
  id: string
  name: string
  subject: string
  official: boolean
}

export interface ExamSummary {
  id: string
  title: string
  description: string
  courseId: string
  courseName?: string
  duration: number
  questionCount: number
}

export interface Question {
  id: string
  prompt: string
  options: string[]
  passage: string | null
  select: number
}

export interface Score {
  rawScore: number
  total: number
  estimatedScore: number
}

export interface TopicPerformance {
  topicId?: string
  name?: string
  code?: string
  bigIdea?: string
  correct: number
  incorrect: number
  incomplete: number
  mastered: boolean
}

export interface AttemptSummary {
  id: string
  examId: string
  title: string
  status: 'active' | 'submitted'
  startedAt: string
  expiresAt: string
  submission?: 'time' | 'student'
  result?: Score
}

export interface ActiveAttempt extends AttemptSummary {
  status: 'active'
  serverTime: string
  questions: Question[]
  answers: Record<string, number[]>
}

export interface SubmittedAttempt extends AttemptSummary {
  status: 'submitted'
  result?: Score & {
    topicFeedback?: TopicPerformance[]
    incompleteQuestions?: number
  }
}

export type Attempt = ActiveAttempt | SubmittedAttempt

export interface ProfileSkill {
  id: string
  name: string
  code?: string
  bigIdea?: string
  latest: {
    mastered: boolean
    correct: number
    total: number
    submittedAt: string
    testTitle: string
  } | null
}

export interface ProfileCourse {
  id: string
  name: string
  skills: ProfileSkill[]
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
