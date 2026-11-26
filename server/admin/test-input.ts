import { isArray, objectFields } from '../types.js'
import type { Exam } from '../types.js'

export function testSummary(test: Exam, courseName?: string) {
  return {
    id: test._id,
    title: test.title,
    courseId: test.courseId,
    courseName,
    description: test.description,
    duration: test.duration,
    access: test.access,
    questionCount: test.questions.length,
    archived: Boolean(test.archived),
    revision: test.revision,
  }
}

const validText = (value: unknown, limit: number, required = true): value is string => typeof value === 'string'
  && value.length <= limit && (!required || Boolean(value.trim()))

export function validateTest(input: unknown): Pick<Exam, 'title' | 'description' | 'courseId' | 'duration' | 'access' | 'questions'> {
  const body = objectFields(input)
  if (!validText(body.title, 120) || !validText(body.description, 500, false)
    || !validText(body.courseId, 100)
    || typeof body.duration !== 'number' || !Number.isInteger(body.duration) || body.duration < 1 || body.duration > 86400
    || (body.access !== 'open' && body.access !== 'assigned')
    || !isArray(body.questions) || body.questions.length < 1 || body.questions.length > 150) {
    throw Object.assign(new Error('Enter a title, a course, a time limit from 1 to 86,400 seconds, and 1 to 150 questions.'), { status: 400 })
  }

  const questions = body.questions.map((inputQuestion, index) => {
    const question = objectFields(inputQuestion)
    const topics = question.topics ?? (question.topic ? [question.topic] : [])
    const correct = question.correct
    if (!validText(question.prompt, 5000)
      || !isArray(topics) || !topics.length || topics.length > 12
      || !topics.every(topic => validText(topic, 100))
      || (question.passage != null && !validText(question.passage, 8000, false))
      || !isArray(question.options) || question.options.length !== 4
      || !question.options.every(option => validText(option, 1000))
      || new Set(question.options.map(option => option.trim().toLowerCase())).size !== 4
      || !isArray(correct) || ![1, 2].includes(correct.length)
      || !correct.every((option): option is number => typeof option === 'number' && Number.isInteger(option) && option >= 0 && option < 4)
      || new Set(correct).size !== correct.length) {
      throw Object.assign(new Error(`Question ${index + 1} needs a prompt, up to 12 topics, four distinct options, and one or two correct answers.`), { status: 400 })
    }

    return {
      id: `q${index + 1}`,
      prompt: question.prompt.trim(),
      topics: topics.map(topic => topic.trim()),
      passage: question.passage?.trim() || null,
      options: question.options.map(option => option.trim()),
      correct,
      select: correct.length,
    }
  })

  return {
    title: body.title.trim(), description: body.description.trim(),
    courseId: body.courseId,
    duration: body.duration, access: body.access, questions,
  }
}

