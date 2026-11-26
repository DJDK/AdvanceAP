import assert from 'node:assert/strict'
import test from 'node:test'
import { bank, topicFeedback, grade, publicQuestions, tagLegacyCspQuestions } from './exam.js'
import { cspBigIdeas, cspTopics } from './csp-topics.js'
import { csaSample } from './csa-sample.js'
import { csaTopics } from './csa-topics.js'

test('the first form has 57 standard, five passage, and eight multi-select questions', () => {
  assert.equal(bank.length, 70)
  assert.equal(new Set(bank.map(q => q.id)).size, bank.length)
  assert.equal(bank.filter(q => q.select === 1 && !q.passage).length, 57)
  assert.equal(bank.filter(q => q.select === 1 && q.passage).length, 5)
  assert.equal(bank.filter(q => q.select === 2).length, 8)
  for (const question of bank) {
    assert.equal(new Set(question.options).size, 4)
    assert.equal(new Set(question.correct).size, question.select)
    assert.ok(question.correct.every(index => Number.isInteger(index) && index >= 0 && index < 4))
  }
})

test('grading requires an exact choice set and keeps topic counts out of public questions', () => {
  const key = Object.fromEntries(bank.map(q => [q.id, [...q.correct].reverse()]))
  const perfect = grade(key)
  assert.equal(perfect.rawScore, 70)
  assert.equal(perfect.estimatedScore, 5)
  assert.equal(Object.values(perfect.topics).reduce((total, topic) => total + topic.correct, 0), 70)
  assert.equal(grade({}).estimatedScore, 1)
  const multi = bank.find(q => q.select === 2)
  assert.ok(multi)
  key[multi.id] = [multi.correct[0]]
  const partial = grade(key)
  assert.equal(partial.rawScore, 69)
  assert.equal(partial.topics[multi.topic].correct, partial.topics[multi.topic].total - 1)
  assert.ok(publicQuestions.every(question => !('correct' in question) && !('topic' in question)))
})

test('fixed AP practice cutoffs are inclusive', () => {
  const estimate = (count: number) => grade(Object.fromEntries(bank.slice(0, count).map(q => [q.id, q.correct]))).estimatedScore
  assert.deepEqual([24, 25, 34, 35, 45, 46, 55, 56].map(estimate), [1, 2, 2, 3, 3, 4, 4, 5])
})

test('each AP CSP item uses a framework topic and old bank snapshots keep the same scoring', () => {
  const oldBank = bank.map(question => {
    const topic = cspTopics.get(question.topic)
    assert.ok(topic, `Missing framework topic ${question.topic}`)
    return { ...question, topic: topic.bigIdea }
  })
  assert.equal(new Set(oldBank.map(question => question.topic)).size, cspBigIdeas.length)
  assert.deepEqual(tagLegacyCspQuestions(oldBank), bank)
  const custom = { ...oldBank[0], correct: [(oldBank[0].correct[0] + 1) % 4] }
  assert.equal(tagLegacyCspQuestions([custom])[0], custom)
})

test('AP CSP feedback counts complete errors separately from blanks and partial selections', () => {
  const topic = '3.5 Boolean Expressions'
  const questions = [
    { id: 'q1', topic, select: 1, correct: [0] },
    { id: 'q2', topic, select: 1, correct: [0] },
    { id: 'q3', topic, select: 2, correct: [0, 1] },
    { id: 'q4', topic, select: 2, correct: [0, 1] },
  ]
  const answers = { q1: [0], q2: [1], q3: [0] }
  assert.deepEqual(topicFeedback(answers, questions), [{
    code: '3.5', name: 'Boolean Expressions', bigIdea: 'Algorithms and Programming',
    correct: 1, incorrect: 1, incomplete: 2, mastered: false,
  }])
  assert.equal(grade(answers, questions).rawScore, 1)
})

test('AP CSA sample questions use registered topics across all four units', () => {
  assert.equal(csaTopics.size, 53)
  assert.equal(csaSample.questions.length, 12)
  const labels = csaSample.questions.flatMap(question => {
    assert.ok(question.topics.length > 0)
    assert.equal(new Set(question.topics).size, question.topics.length)
    return question.topics
  })
  const units = labels.map(label => {
    const topic = csaTopics.get(label)
    assert.ok(topic, `Missing framework topic ${label}`)
    return topic.bigIdea
  })
  assert.equal(new Set(units).size, 4)
})

test('a question with multiple skills contributes once to the raw score and to each skill', () => {
  const questions = [{ id: 'q1', select: 1, correct: [0], topicDetails: [
    { id: 'search', label: '4.14 Searching Algorithms', name: 'Searching Algorithms' },
    { id: 'runtime', label: '2.12 Informal Run-Time Analysis', name: 'Informal Run-Time Analysis' },
  ] }]
  assert.equal(grade({ q1: [0] }, questions).rawScore, 1)
  assert.deepEqual(Object.values(grade({ q1: [0] }, questions).topics), [
    { correct: 1, total: 1 }, { correct: 1, total: 1 },
  ])
  assert.ok(topicFeedback({ q1: [0] }, questions).every(skill => skill.mastered))
  assert.ok(topicFeedback({}, questions).every(skill => skill.incomplete === 1 && !skill.mastered))
})
