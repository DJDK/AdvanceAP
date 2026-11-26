import type { Collection } from 'mongodb'
import type { Course } from '../types.js'

export const cspCourseId = 'ap-computer-science-principles'
export const csaCourseId = 'ap-computer-science-a'

const subjects = [
  ['Arts', ['2-D Art and Design', '3-D Art and Design', 'Drawing', 'Art History', 'Music Theory']],
  ['English', ['English Language and Composition', 'English Literature and Composition']],
  ['History and Social Sciences', [
    'African American Studies', 'Comparative Government and Politics', 'European History',
    'Human Geography', 'Macroeconomics', 'Microeconomics', 'Psychology',
    'United States Government and Politics', 'United States History', 'World History: Modern',
  ]],
  ['Math and Computer Science', [
    'Calculus AB', 'Calculus BC', 'Computer Science A', 'Computer Science Principles', 'Precalculus', 'Statistics',
  ]],
  ['Sciences', [
    'Biology', 'Chemistry', 'Environmental Science', 'Physics 1: Algebra-Based', 'Physics 2: Algebra-Based',
    'Physics C: Electricity and Magnetism', 'Physics C: Mechanics',
  ]],
  ['World Languages and Cultures', [
    'Chinese Language and Culture', 'French Language and Culture', 'German Language and Culture',
    'Italian Language and Culture', 'Japanese Language and Culture', 'Latin',
    'Spanish Language and Culture', 'Spanish Literature and Culture',
  ]],
  ['Capstone', ['Research', 'Seminar']],
  ['Career Kickstart', ['Business with Personal Finance', 'Cybersecurity']],
] satisfies [string, string[]][]

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export const officialCourses: Course[] = subjects.flatMap(([subject, names]) => names.map(name => ({
  _id: slug(`AP ${name}`), name: `AP ${name}`, subject, official: true,
})))

const aliases = new Map(officialCourses.flatMap(course => [
  [course._id, course._id], [course._id.slice(3), course._id],
]))

export function legacyCourseId(value?: string) {
  const label = value?.trim()
  if (!label) return 'uncategorized'
  return aliases.get(slug(label)) ?? label.toLowerCase().replace(/\s+/g, ' ')
}

export function createCourseStore(collection: Collection<Course>) {
  async function seed() {
    await collection.bulkWrite(officialCourses.map(({ _id, ...fields }) => ({
      updateOne: { filter: { _id }, update: { $set: fields }, upsert: true },
    })), { ordered: false })
  }

  async function ensureLegacy(id: string, name?: string) {
    await collection.updateOne({ _id: id }, { $setOnInsert: {
      name: name?.trim() || (id === 'uncategorized' ? 'Uncategorized' : id),
      subject: 'Other', official: false,
    } }, { upsert: true })
  }

  async function list() {
    return collection.find().sort({ name: 1 }).toArray()
  }

  function find(id: string) {
    return collection.findOne({ _id: id })
  }

  return { seed, ensureLegacy, list, find }
}
