import { useEffect, useRef, useState } from 'react'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function SkillCheck({ label = 'All correct' }) {
  return <span className="skill-check"><span aria-hidden="true">✓</span><span className="sr-only">{label}</span></span>
}

export function Profile({ api, name }) {
  const [courses, setCourses] = useState(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const query = search.trim().toLowerCase()
  const terms = query ? query.split(/\s+/) : []
  const filtering = Boolean(query) || status !== 'all'
  const filterKey = filtering ? `${status}:${query}` : ''
  const matching = (courses ?? []).map(course => ({
    course,
    skills: course.skills.filter(skill => {
      const mastered = Boolean(skill.latest?.mastered)
      if ((status === 'mastered' && !mastered) || (status === 'not-mastered' && mastered)) return false
      const text = [skill.name, skill.code, skill.bigIdea, course.name].join(' ').toLowerCase()
      return terms.every(term => text.includes(term))
    }),
  })).filter(item => item.skills.length > 0)
  const matchCount = matching.reduce((total, item) => total + item.skills.length, 0)

  useEffect(() => {
    let current = true
    api('/profile').then(profile => {
      if (current) setCourses(profile.courses)
    }).catch(err => {
      if (current) setError(err.message)
    })
    return () => { current = false }
  }, [api, retry])

  return (
    <section className="profile" aria-labelledby="profile-title">
      <header className="catalog-header">
        <h1 id="profile-title">My profile</h1>
        {name && <p>{name}</p>}
      </header>
      <h2>Skills by course</h2>
      <p className="description profile-intro">A checkmark means you got every question for that skill right the last time a submitted test covered it.</p>
      {error ? <p className="error" role="alert">{error} <button className="quiet" onClick={() => {
        setError('')
        setRetry(current => current + 1)
      }}>Try again</button></p>
        : !courses && <p role="status">Loading skills…</p>}
      {courses?.length === 0 && <p>No course skills are available yet.</p>}
      {courses?.length > 0 && <>
        <div className="profile-filters">
          <label className="catalog-search">
            Search skills
            <input type="search" value={search} placeholder="Skill name, topic code, or course"
              onChange={event => setSearch(event.target.value)} />
          </label>
          <label className="profile-mastery">
            Mastery
            <select value={status} onChange={event => setStatus(event.target.value)}>
              <option value="all">All skills</option>
              <option value="mastered">Mastered</option>
              <option value="not-mastered">Not mastered</option>
            </select>
          </label>
        </div>
        {filtering && <p role="status" className="note">
          {matchCount ? `${matchCount} matching ${matchCount === 1 ? 'skill' : 'skills'}` : 'No skills match your filters.'}
        </p>}
        {matching.map(({ course, skills }) => (
          <CourseSkills key={course.id} course={course} skills={skills} filterKey={filterKey} />
        ))}
      </>}
    </section>
  )
}

function CourseSkills({ course, skills, filterKey }) {
  const details = useRef(null)
  useEffect(() => {
    if (filterKey) details.current.open = true
  }, [filterKey])

  const checked = course.skills.filter(skill => skill.latest?.mastered).length
  const groups = new Map()
  for (const skill of skills) {
    const group = skill.bigIdea ?? ''
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push(skill)
  }

  return (
    <details className="profile-course" ref={details}>
      <summary className="profile-course-heading">
        <strong>{course.name}</strong>
        <span className="note">{checked} of {course.skills.length} mastered</span>
      </summary>
      {[...groups].map(([group, skills]) => (
        <section key={group} className="profile-group">
          {group && <h3>{group}</h3>}
          <ul className="topic-priorities">
            {skills.map(skill => (
              <li key={skill.id}>
                <div>
                  <strong>{skill.code && `${skill.code} `}{skill.name}</strong>
                  {skill.latest && <span>{skill.latest.testTitle} · {dateFormat.format(new Date(skill.latest.submittedAt))}</span>}
                </div>
                <span className="skill-status">
                  {skill.latest?.mastered && <SkillCheck />}
                  {skill.latest ? `${skill.latest.correct} of ${skill.latest.total} correct` : 'Not tested yet'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </details>
  )
}
