import type { Dispatch, SetStateAction } from 'react'
import type { AttemptSummary, ExamSummary } from './api'

interface Filters {
  query: string
  courseId: string
}

const uncategorized = 'Uncategorized'

function groupTests(exams: ExamSummary[]) {
  const groups = new Map<string, { key: string; label: string; exams: ExamSummary[] }>()
  for (const exam of exams) {
    const label = exam.courseName || uncategorized
    const key = exam.courseId || 'uncategorized'
    const group = groups.get(key)
    if (group) group.exams.push(exam)
    else groups.set(key, { key, label, exams: [exam] })
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label))
}

function durationLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return [minutes && `${minutes} min`, remaining && `${remaining} sec`].filter(Boolean).join(' ')
}

export function TestCatalog({ exams, active, busy, loading, filters, setFilters, onOpen }: {
  exams: ExamSummary[] | null
  active: ReadonlyMap<string, AttemptSummary>
  busy: boolean
  loading: boolean
  filters: Filters
  setFilters: Dispatch<SetStateAction<Filters>>
  onOpen: (exam: ExamSummary) => void
}) {
  const { query, courseId } = filters
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const groups = groupTests(exams ?? [])
  const visibleCourse = groups.some(group => group.key === courseId) ? courseId : ''
  const resultGroups = terms.length
    ? groups.map(group => ({
      ...group,
      exams: group.exams.filter(exam => {
        const text = [exam.title, group.label, exam.description].join(' ').toLowerCase()
        return terms.every(term => text.includes(term))
      }),
    })).filter(group => group.exams.length)
    : groups.filter(group => !visibleCourse || group.key === visibleCourse)
  const count = resultGroups.reduce((total, group) => total + group.exams.length, 0)

  return (
    <section className="test-catalog" aria-labelledby="catalog-title">
      <header className="catalog-header">
        <h1 id="catalog-title">Practice tests</h1>
        <p>Choose a course or search the catalog to find a timed test.</p>
      </header>
      {loading && <p role="status">Loading tests…</p>}
      {exams?.length === 0 && <p>No tests are currently available to you.</p>}
      {!!exams?.length && <>
        <div className="catalog-layout">
          <aside className="catalog-sidebar">
            <h2>Courses</h2>
            <nav className="catalog-topics" aria-label="Practice courses">
              {[{ key: '', label: 'All courses' }, ...groups].map(group => (
                <button key={group.key} type="button" className="secondary"
                  aria-pressed={!terms.length && visibleCourse === group.key}
                  onClick={() => setFilters({ courseId: group.key, query: '' })}>{group.label}</button>
              ))}
            </nav>
          </aside>
          <div className="catalog-content">
            <label className="catalog-search">
              Search all tests
              <input type="search" value={query} placeholder="Search by title, course, or description"
                onChange={event => setFilters(current => ({ ...current, query: event.target.value }))} />
            </label>
            <p className="note" role="status">
              {count ? `${count} ${count === 1 ? 'test' : 'tests'}${terms.length ? ' found across all courses' : ''}.`
                : 'No tests match your search.'}
            </p>
            {resultGroups.map(group => (
              <section key={group.key} className="catalog-group">
                <h2>{group.label}</h2>
                <ul className="catalog-list">
                  {group.exams.map(exam => (
                    <li key={exam.id} className="catalog-test">
                      <div>
                        <h3>{exam.title}</h3>
                        {exam.description && <p>{exam.description}</p>}
                        <ul className="test-details">
                          <li>{exam.questionCount} {exam.questionCount === 1 ? 'question' : 'questions'}</li>
                          <li>{durationLabel(exam.duration)}</li>
                          {active.has(exam.id) && <li className="in-progress">In progress</li>}
                        </ul>
                      </div>
                      <button className="primary" disabled={busy} onClick={() => onOpen(exam)}>
                        {active.has(exam.id) ? 'Resume timed exam' : 'Start timed exam'}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {count > 0 && <p className="note">Your timer keeps running if you leave. Saved answers submit when time expires.</p>}
          </div>
        </div>
      </>}
    </section>
  )
}
