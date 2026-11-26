import type { Collection } from 'mongodb'
import type { CourseTopic, Question } from '../types.js'
import { createHash } from 'node:crypto'
import { cspTopics } from '../exams/csp-topics.js'
import { csaSample, legacyCsaQuestions } from '../exams/csa-sample.js'
import { csaTopics, csaUnits } from '../exams/csa-topics.js'
import { examId, tagLegacyCspQuestions } from '../exams/exam.js'

import { csaCourseId as csa, cspCourseId as csp } from './courses.js'

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function topicRecord(courseId: string, label: string): CourseTopic {
  const normalizedLabel = normalize(label)
  const _id = createHash('sha256').update(JSON.stringify([courseId, normalizedLabel])).digest('hex')
  const taxonomy = courseId === csp ? cspTopics : courseId === csa ? csaTopics : null
  const metadata = taxonomy?.get(label)
  return { _id, courseId, label, ...(metadata ?? { name: label }) }
}

export function createTopicStore(collection: Collection<CourseTopic>) {
  async function ensure(records: CourseTopic[]) {
    const unique = [...new Map(records.map(record => [record._id, record])).values()]
    if (!unique.length) return
    await collection.bulkWrite(unique.map(({ _id, ...fields }) => ({
      updateOne: { filter: { _id }, update: { $setOnInsert: fields }, upsert: true },
    })), { ordered: false })
  }

  async function seed() {
    await collection.createIndex({ courseId: 1, label: 1 })
    await ensure([
      ...[...cspTopics.keys()].map(label => topicRecord(csp, label)),
      ...[...csaTopics.keys()].map(label => topicRecord(csa, label)),
    ])
  }

  async function referenceQuestions(test: { _id: string; courseId: string; questions: Question[] }, reassign = false) {
    const { courseId } = test
    const questions = test._id === examId ? tagLegacyCspQuestions(test.questions) : test.questions
    const records: CourseTopic[] = []
    const oldIds = reassign ? [...new Set(questions.flatMap(question => question.topicIds
      ?? (question.topicId ? [question.topicId] : [])))] : []
    const previousLabels = new Map((oldIds.length
      ? await collection.find({ _id: { $in: oldIds } }).toArray() : []).map(topic => [topic._id, topic.label]))
    const referenced = questions.map(({ topic, topics, topicId, topicIds, ...question }) => {
      const previousIds = topicIds ?? (topicId ? [topicId] : [])
      let labels = topics ?? (topic ? [topic] : undefined)
      if (test._id === csaSample._id) {
        const original = legacyCsaQuestions.get(question.prompt)
        const unitId = original && topicRecord(csa, original.unit)._id
        const hasLegacyUnit = original && (topic === original.unit
          || (!labels && previousIds.length === 1 && previousIds[0] === unitId))
        if (hasLegacyUnit && JSON.stringify(original.options) === JSON.stringify(question.options)
          && JSON.stringify(original.correct) === JSON.stringify(question.correct)) {
          labels = original.topics
        }
      }

      if (!labels && reassign && previousIds.length) {
        labels = previousIds.map(id => {
          const label = previousLabels.get(id)
          if (!label) throw new Error(`Missing question topic ${id}`)
          return label
        })
      }
      if (!labels) return { ...question, topicIds: previousIds }
      const topicsForQuestion = labels.map(label => topicRecord(courseId, label))
      records.push(...topicsForQuestion)
      return { ...question, topicIds: [...new Set(topicsForQuestion.map(record => record._id))] }
    })
    await ensure(records)
    return { courseId, questions: referenced }
  }

  async function resolveQuestions(questions: Question[]) {
    const ids = [...new Set(questions.flatMap(question => question.topicIds ?? []))]
    if (!ids.length) return questions
    const records = await collection.find({ _id: { $in: ids } }).toArray()
    const byId = new Map(records.map(record => [record._id, record]))
    return questions.map(question => ({
      ...question,
      topicDetails: (question.topicIds ?? []).map(id => {
        const topic = byId.get(id)
        if (!topic) throw new Error(`Missing question topic ${id}`)
        const { label, code, name, bigIdea } = topic
        return { id, label, code, name, bigIdea }
      }),
    }))
  }

  async function listCourses(courseIds: string[]) {
    return collection.find({
      courseId: { $in: courseIds },
      $nor: [{ courseId: csa, label: { $in: csaUnits } }],
    }).toArray()
  }

  return { seed, referenceQuestions, resolveQuestions, listCourses }
}
