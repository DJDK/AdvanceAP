import { useEffect, useState } from 'react'
import { CoursePicker } from './course-picker.jsx'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
const userPath = id => `/admin/users/${encodeURIComponent(id)}`
const testPath = id => `/admin/tests/${encodeURIComponent(id)}`
const emptyQuestion = () => ({ prompt: '', topics: [''], passage: '', options: ['', '', '', ''], correct: [] })
const emptyTest = () => ({ title: '', courseId: '', description: '', duration: 7200, access: 'assigned', questions: [emptyQuestion()] })

export function Admin({ api, account }) {
  const [users, setUsers] = useState(null)
  const [tests, setTests] = useState(null)
  const [courses, setCourses] = useState(null)
  const [person, setPerson] = useState(null)
  const [draft, setDraft] = useState(null)
  const [section, setSection] = useState('users')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let current = true
    Promise.all([api('/admin/users'), api('/admin/tests'), api('/admin/courses')]).then(([people, exams, catalog]) => {
      if (current) {
        setUsers(people)
        setTests(exams)
        setCourses(catalog)
      }
    }).catch(err => {
      if (current) setError(err.message)
    }).finally(() => {
      if (current) setBusy(false)
    })
    return () => { current = false }
  }, [api])

  async function run(task) {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await task()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function replaceUser(updated) {
    setUsers(current => current.map(user => user.id === updated.id ? updated : user))
    setPerson(current => ({ ...current, ...updated }))
  }

  function openUser(id) {
    setPerson(null)
    return run(async () => setPerson(await api(userPath(id))))
  }

  function saveUser(values) {
    return run(async () => {
      const updated = await api(userPath(person.id), json('PATCH', values))
      replaceUser(updated)
      setNotice('Account updated.')
    })
  }

  function assign(testId, assigned) {
    return run(async () => {
      const updated = await api(`${userPath(person.id)}/assignments/${testId}`, json('PUT', { assigned }))
      replaceUser(updated)
      setNotice(assigned ? 'Test assigned.' : 'Assignment removed.')
    })
  }

  function saveTest() {
    return run(async () => {
      const questions = draft.questions.map(question => ({
        ...question,
        topics: (question.topics ?? [question.topic ?? '']).map(topic => topic.trim()).filter(Boolean),
      }))
      await api(draft.id ? testPath(draft.id) : '/admin/tests', json(draft.id ? 'PUT' : 'POST', { ...draft, questions }))
      setDraft(null)
      setTests(await api('/admin/tests'))
      setNotice('Test saved.')
    })
  }

  function archive(test) {
    if (!window.confirm(`Archive “${test.title}”? Students with an active attempt can still finish it.`)) return
    return run(async () => {
      await api(testPath(test.id), { method: 'DELETE' })
      setDraft(current => current?.id === test.id ? null : current)
      setTests(await api('/admin/tests'))
      setNotice('Test archived.')
    })
  }

  return (
    <div className="admin">
      <h1>Admin dashboard</h1>
      <nav aria-label="Admin sections" className="admin-actions">
        <button className={section === 'users' ? 'primary' : 'secondary'} aria-pressed={section === 'users'} disabled={busy} onClick={() => { setSection('users'); setError(''); setNotice('') }}>Users</button>
        <button className={section === 'tests' ? 'primary' : 'secondary'} aria-pressed={section === 'tests'} disabled={busy} onClick={() => { setSection('tests'); setError(''); setNotice('') }}>Tests</button>
      </nav>
      {error && <p className="error" role="alert">{error}</p>}
      <p className="note" role="status">{busy ? 'Working…' : notice}</p>
      {users && tests && (section === 'users'
        ? <div className="admin-layout">
          <section className="admin-panel">
            <h2>Registered users</h2>
            <ul className="admin-list">{users.map(user => <li key={user.id}>
              <button className="secondary" disabled={busy} onClick={() => openUser(user.id)}
                aria-current={person?.id === user.id ? 'true' : undefined}>
                <strong>{user.name || user.email || user.id}</strong>
                <span>{user.role === 'admin' ? 'Admin' : 'Student'}{user.disabled ? ' · Disabled' : ''}</span>
              </button>
            </li>)}</ul>
          </section>
          {person ? <UserDetails key={person.id} person={person} account={account} tests={tests} busy={busy}
            onSave={saveUser} onAssign={assign} onRefresh={() => openUser(person.id)} />
            : <section className="admin-panel"><p>Select a user to manage their account, assign tests, and view progress.</p></section>}
        </div>
        : <div className="admin-layout">
          <section className="admin-panel">
            <div className="admin-actions admin-heading"><h2>Tests</h2>
              <button className="primary" disabled={busy} onClick={() => { setError(''); setNotice(''); setDraft(emptyTest()) }}>Add test</button>
            </div>
            <ul className="admin-list">{tests.map(test => <li key={test.id} className="admin-test-row">
              <div><strong>{test.title}</strong>
                <span>{test.courseName || 'Uncategorized'} · {test.questionCount} questions · {test.archived ? 'Archived' : test.access === 'open' ? 'Open to everyone' : 'Assignment only'}</span>
              </div>
              {!test.archived && <div className="admin-actions">
                <button className="secondary" disabled={busy} onClick={() => run(async () => setDraft(await api(testPath(test.id))))}>Edit</button>
                <button className="quiet" disabled={busy} onClick={() => archive(test)}>Archive</button>
              </div>}
            </li>)}</ul>
          </section>
          {draft && <TestEditor key={draft.id ?? 'new'} draft={draft} setDraft={setDraft} courses={courses} busy={busy} onSave={saveTest} />}
        </div>)}
    </div>
  )
}

function UserDetails({ person, account, tests, busy, onSave, onAssign, onRefresh }) {
  const [role, setRole] = useState(person.role)
  const [disabled, setDisabled] = useState(person.disabled)
  const [selection, setSelection] = useState('')
  const protectedAccount = person.bootstrap || person.id === account.id
  const assignable = tests.filter(test => !test.archived && !person.assignedTests.includes(test.id))

  return (
    <section className="admin-panel">
      <h2>{person.name || person.email || person.id}</h2>
      {person.email && person.email !== person.name && <p>{person.email}</p>}
      <p className="note admin-id">{person.id}</p>
      <form onSubmit={event => { event.preventDefault(); onSave({ role, disabled }) }}>
        <fieldset disabled={busy || protectedAccount} className="admin-actions">
          <label>Role<select value={role} onChange={event => setRole(event.target.value)}>
            <option value="student">Student</option><option value="admin">Admin</option>
          </select></label>
          <label>Status<select value={disabled ? 'disabled' : 'active'} onChange={event => setDisabled(event.target.value === 'disabled')}>
            <option value="active">Active</option><option value="disabled">Disabled</option>
          </select></label>
          <button className="secondary" disabled={role === person.role && disabled === person.disabled}>Save account</button>
        </fieldset>
        {protectedAccount && <p className="note">This administrator’s role and status are protected.</p>}
      </form>
      <h3>Assigned tests</h3>
      {person.assignedTests.length ? (
        <ul className="admin-list">{person.assignedTests.map(id => {
          const test = tests.find(item => item.id === id)
          return <li key={id} className="admin-test-row"><span>{test?.title ?? id}{test?.archived ? ' · Archived' : ''}</span>
            <button className="quiet" disabled={busy} onClick={() => onAssign(id, false)}>Remove assignment</button>
          </li>
        })}</ul>
      ) : <p className="note">No tests assigned.</p>}
      <form className="admin-actions" onSubmit={event => { event.preventDefault(); void onAssign(selection, true); setSelection('') }}>
        <label>Test<select value={selection} disabled={busy || !assignable.length} onChange={event => setSelection(event.target.value)}>
          <option value="">Choose a test</option>
          {assignable.map(test => <option key={test.id} value={test.id}>{test.title}</option>)}
        </select></label>
        <button className="secondary" disabled={!selection || busy}>Assign test</button>
      </form>
      <div className="admin-actions admin-heading">
        <h3>Attempt progress and results</h3>
        <button className="quiet" disabled={busy} onClick={onRefresh}>Refresh</button>
      </div>
      {!person.attempts.length ? <p className="note">No attempts yet.</p> : <ul className="admin-list">
        {person.attempts.map(attempt => <li key={attempt.id} className="admin-attempt">
          <strong>{attempt.title}</strong>
          <p className="note">{dateFormat.format(new Date(attempt.startedAt))} · {attempt.result ? 'Submitted' : 'In progress'}</p>
          <p>{attempt.answered} / {attempt.questionCount} answered</p>
          {attempt.result && <p>Raw score {attempt.result.rawScore}/{attempt.result.total} · Estimated AP score {attempt.result.estimatedScore}/5</p>}
          {attempt.topics && <details>
            <summary>Topic breakdown</summary>
            <dl className="admin-topics">{Object.entries(attempt.topics).map(([topic, scores]) =>
              <div key={topic}><dt>{topic}</dt><dd>{scores.correct} / {scores.total}</dd></div>)}</dl>
          </details>}
        </li>)}
      </ul>}
    </section>
  )
}

function TestEditor({ draft, setDraft, courses, busy, onSave }) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const index = Math.min(questionIndex, draft.questions.length - 1)
  const question = draft.questions[index]
  const change = fields => setDraft(current => ({ ...current, ...fields }))
  const editQuestion = fields => setDraft(current => ({
    ...current,
    questions: current.questions.map((item, i) => i === index ? { ...item, ...fields } : item),
  }))

  function toggleCorrect(option) {
    const correct = question.correct.includes(option) ? question.correct.filter(value => value !== option) : [...question.correct, option]
    if (correct.length <= 2) editQuestion({ correct })
  }

  return (
    <form className="admin-panel test-editor" onSubmit={event => { event.preventDefault(); onSave() }}>
      <h2>{draft.id ? 'Edit test' : 'New test'}</h2>
      <fieldset disabled={busy} className="editor-fields">
        <label>Title<input required maxLength={120} value={draft.title} onChange={event => change({ title: event.target.value })} /></label>
        <CoursePicker courses={courses} value={draft.courseId} onChange={courseId => change({ courseId })} />
        <label>Description<textarea rows={2} maxLength={500} value={draft.description} onChange={event => change({ description: event.target.value })} /></label>
        <div className="admin-actions">
          <label>Time limit (seconds)<input type="number" required min="1" max="86400" value={draft.duration}
            onChange={event => change({ duration: event.target.value === '' ? '' : Number(event.target.value) })} /></label>
          <label>Availability<select value={draft.access} onChange={event => change({ access: event.target.value })}>
            <option value="assigned">Assigned users</option><option value="open">All users</option>
          </select></label>
        </div>
        <div className="admin-actions">
          <label>Question<select value={index} onChange={event => setQuestionIndex(Number(event.target.value))}>
            {draft.questions.map((item, i) => <option key={i} value={i}>
              {i + 1}. {item.prompt ? item.prompt.slice(0, 45) : 'Untitled question'}
            </option>)}
          </select></label>
          <button className="secondary" type="button" disabled={draft.questions.length >= 150} onClick={() => {
            change({ questions: [...draft.questions, emptyQuestion()] })
            setQuestionIndex(draft.questions.length)
          }}>Add question</button>
          <button className="quiet" type="button" disabled={draft.questions.length < 2} onClick={() => {
            if (window.confirm(`Remove question ${index + 1} from this draft?`)) {
              change({ questions: draft.questions.filter((_, i) => i !== index) })
            }
          }}>Remove question</button>
        </div>
        <label>Topics (one per line)<textarea rows={3} value={(question.topics ?? [question.topic ?? '']).join('\n')}
          onChange={event => editQuestion({ topics: event.target.value.split('\n') })} /></label>
        <label>Prompt<textarea rows={4} maxLength={5000} value={question.prompt} onChange={event => editQuestion({ prompt: event.target.value })} /></label>
        <label>Reading passage (optional)<textarea rows={3} maxLength={8000} value={question.passage ?? ''} onChange={event => editQuestion({ passage: event.target.value })} /></label>
        <fieldset className="editor-fields">
          <legend>Answer choices</legend>
          <p className="note">Mark one or two choices as correct.</p>
          {question.options.map((option, i) => <div key={i} className="admin-choice">
            <label>Choice {i + 1}<input maxLength={1000} value={option}
              onChange={event => editQuestion({ options: question.options.map((value, j) => j === i ? event.target.value : value) })} /></label>
            <label><input type="checkbox" checked={question.correct.includes(i)}
              disabled={question.correct.length === 2 && !question.correct.includes(i)}
              onChange={() => toggleCorrect(i)} aria-label={`Mark choice ${i + 1} correct`} /> Correct</label>
          </div>)}
        </fieldset>
        <div className="admin-actions">
          <button className="primary">Save test</button>
          <button className="quiet" type="button" onClick={() => setDraft(null)}>Cancel</button>
        </div>
      </fieldset>
    </form>
  )
}
