import { useEffect, useId, useState } from 'react'

import type { KeyboardEvent } from 'react'
import type { Course } from './api'

export function CoursePicker({ courses, value, onChange }: {
  courses: Course[]
  value: string
  onChange: (id: string) => void
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const selected = courses.find(course => course.id === value)
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const groups = new Map<string, Course[]>()
  for (const course of courses) {
    const subject = course.official ? course.subject : 'Legacy courses'
    const text = course.name.toLowerCase()
    if (!terms.every(term => text.includes(term))) continue
    const group = groups.get(subject)
    if (group) group.push(course)
    else groups.set(subject, [course])
  }
  const options = [...groups.values()].flat()
  const activeOption = open ? options[active] : undefined
  const activeId = activeOption ? `${id}-option-${activeOption.id}` : undefined

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  function close() {
    setOpen(false)
    setQuery('')
    setActive(-1)
  }

  function choose(course: Course) {
    onChange(course.id)
    close()
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      if (options.length) {
        const next = active < 0
          ? event.key === 'ArrowDown' ? 0 : options.length - 1
          : Math.max(0, Math.min(options.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)))
        setActive(next)
      }
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      close()
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      if (activeOption) choose(activeOption)
    }
  }

  return (
    <div className="course-picker">
      <label htmlFor={id}>Course</label>
      <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open}
        aria-controls={`${id}-courses`} aria-activedescendant={activeId} autoComplete="off" required
        placeholder={open ? 'Search courses' : selected?.name ?? 'Search courses'}
        value={open ? query : selected?.name ?? ''}
        onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onBlur={close} onKeyDown={handleKey}
        onChange={event => {
          setOpen(true)
          setQuery(event.target.value)
          setActive(0)
        }} />
      <div className="course-options" hidden={!open}>
        <div id={`${id}-courses`} role="listbox" aria-label="Courses">
          {[...groups].map(([subject, choices]) => (
            <div key={subject} role="group" aria-label={subject}>
              <div className="course-option-group" aria-hidden="true">{subject}</div>
              {choices.map(course => (
                <div key={course.id} id={`${id}-option-${course.id}`} role="option"
                  aria-selected={course.id === value}
                  className={course.id === activeOption?.id ? 'course-option active' : 'course-option'}
                  onMouseDown={event => event.preventDefault()} onClick={() => choose(course)}>
                  {course.name}
                </div>
              ))}
            </div>
          ))}
        </div>
        {!options.length && <p className="note" role="status">No courses match your search.</p>}
      </div>
    </div>
  )
}
