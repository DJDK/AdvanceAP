import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import type { Account, ActiveAttempt, Api, Attempt, AttemptSummary, ExamSummary, SubmittedAttempt } from './api'
import { errorMessage } from './api'
import { createRoot } from 'react-dom/client'
import { Admin } from './admin'
import { authCache } from './auth-cache'
import { TestCatalog } from './catalog'
import { TopicFeedback } from './topic-feedback'
import { Profile, SkillCheck } from './profile'
import './styles.css'

const { VITE_AUTH0_DOMAIN: domain, VITE_AUTH0_CLIENT_ID: clientId, VITE_AUTH0_AUDIENCE: audience } = import.meta.env
class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly value: unknown) {
    super(message)
  }
}

type OpenAttempt = (ActiveAttempt & { receivedTime: number }) | SubmittedAttempt

const sessionTimeoutSeconds = 8
const course = 'AP Computer Science Principles'
const timeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function Brand() {
  return <div className="brand"><span className="monogram" aria-hidden="true">AP</span> AP Practice</div>
}

function SiteHeader({ children }: { children?: ReactNode }) {
  return <><a className="skip-link" href="#main-content">Skip to content</a><header className="site-header"><div className="bar"><Brand />{children}</div></header></>
}

function SignInPanel({ children }: { children?: ReactNode }) {
  return (
    <section className="welcome">
      <div className="welcome-main">
        <h1>Practice for your AP exams</h1>
        <p className="description">Take timed practice tests, resume saved attempts, and track your scores.</p>
        {children}
      </div>
      <div className="welcome-courses">
        <h2>Available courses</h2>
        <ul>
          <li><strong>AP Computer Science A</strong><span>Java · Timed sample</span></li>
          <li><strong>AP Computer Science Principles</strong><span>Full-length multiple-choice section</span></li>
        </ul>
      </div>
    </section>
  )
}

function App() {
  const { isAuthenticated, isLoading, error, user, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()
  const [authError, setAuthError] = useState('')
  const [sessionTimedOut, setSessionTimedOut] = useState(false)
  const [sessionNeedsSignIn, setSessionNeedsSignIn] = useState(false)
  const [account, setAccount] = useState<Account | null>(null)
  const [accountError, setAccountError] = useState('')
  const [path, setPath] = useState(() => window.location.pathname)
  const adminPage = path === '/admin' || path === '/admin/'
  const profilePage = path === '/profile' || path === '/profile/'
  const api: Api = useCallback(async <Response,>(path: string, options?: RequestInit): Promise<Response> => {
    let token
    try {
      token = await getAccessTokenSilently({ timeoutInSeconds: sessionTimeoutSeconds })
      setSessionNeedsSignIn(false)
    } catch {
      setSessionNeedsSignIn(true)
      throw new Error('Your session could not be renewed. Sign in again to continue.')
    }
    const headers = new Headers(options?.headers)
    headers.set('Authorization', `Bearer ${token}`)
    const response = await fetch(`/api${path}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(12000),
    })
    if (response.status === 401) setSessionNeedsSignIn(true)
    const value: unknown = response.status === 204 ? null : await response.json().catch(() => null)
    if (!response.ok) {
      const message = value && typeof value === 'object' && 'message' in value && typeof value.message === 'string'
        ? value.message : 'The request could not be completed.'
      throw new ApiError(message, response.status, value)
    }
    if (response.status !== 204 && value === null) throw new Error('The API returned an unexpected response.')
    return value as Response
  }, [getAccessTokenSilently])

  useEffect(() => {
    if (!isLoading) return
    const timeout = window.setTimeout(() => setSessionTimedOut(true), sessionTimeoutSeconds * 1000)
    return () => window.clearTimeout(timeout)
  }, [isLoading])

  function signIn() {
    setAuthError('')
    loginWithRedirect({ appState: { returnTo: adminPage ? '/admin' : profilePage ? '/profile' : '/' } })
      .catch(err => setAuthError(errorMessage(err)))
  }

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const path = event.currentTarget.pathname
    window.history.pushState({}, '', path)
    setPath(path)
  }

  useEffect(() => {
    if (!isAuthenticated) return
    let current = true
    api<Account>('/me').then(profile => {
      if (current) setAccount(profile)
    }).catch(err => {
      if (current) setAccountError(errorMessage(err))
    })
    return () => { current = false }
  }, [api, isAuthenticated])

  return (
    <>
      <SiteHeader>
        {isAuthenticated && <div className="account">
          <span>{user?.name}</span>
          {(adminPage || profilePage) && <a href="/" onClick={navigate}>Practice</a>}
          {!profilePage && <a href="/profile" onClick={navigate}>Profile</a>}
          {!adminPage && account?.role === 'admin' && <a href="/admin" onClick={navigate}>Admin</a>}
          <button className="quiet" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Sign out</button>
        </div>}
      </SiteHeader>
      <main id="main-content" className="frame" tabIndex={-1}>
        {isAuthenticated && sessionNeedsSignIn && (
          <div className="session-recovery" role="alert">
            <p>Your session needs to be renewed.</p>
            <button className="secondary" onClick={signIn}>Sign in again</button>
            {authError && <p className="error">{authError}</p>}
          </div>
        )}
        {isLoading && !sessionTimedOut ? <p role="status">Checking your session…</p>
          : isAuthenticated ? (
            adminPage ? accountError ? <p className="error" role="alert">{accountError}</p>
              : !account ? <p role="status">Checking access…</p>
                : account.role === 'admin' ? <Admin api={api} account={account} />
                  : <p role="alert">Admin access is required.</p>
              : profilePage ? <Profile api={api} name={user?.name} /> : <Student api={api} />
          )
          : <SignInPanel>
            <button className="primary" onClick={signIn}>Sign in to practice</button>
            {isLoading && sessionTimedOut && <p className="note" role="status">Session recovery is taking too long. You can sign in again.</p>}
            {(error || authError) && <p className="error" role="alert">{error?.message || authError}</p>}
          </SignInPanel>}
      </main>
    </>
  )
}

function Student({ api }: { api: Api }) {
  const [exams, setExams] = useState<ExamSummary[] | null>(null)
  const [filters, setFilters] = useState({ courseId: '', query: '' })
  const [history, setHistory] = useState<AttemptSummary[] | null>(null)
  const [attempt, setAttempt] = useState<OpenAttempt | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const [details, rows] = await Promise.all([api<ExamSummary[]>('/exams'), api<AttemptSummary[]>('/attempts')])
      setExams(details)
      setHistory(rows)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [api])

  useEffect(() => { void load() }, [load])

  async function open(path: string, method: 'GET' | 'POST', selection?: string) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const next = await api<Attempt>(path, {
        method,
        ...(selection && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ examId: selection }) }),
      })
      setAttempt(next.status === 'active' ? { ...next, receivedTime: performance.now() } : next)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  function dashboard() {
    setAttempt(null)
    void load()
  }

  if (attempt?.status === 'active') {
    return <Exam key={attempt.id} api={api} attempt={attempt} onComplete={setAttempt} onExit={dashboard} />
  }
  if (attempt?.result) return <Results attempt={attempt} result={attempt.result} onBack={dashboard} />

  const active = new Map(history?.filter(row => row.status === 'active').map(row => [row.examId, row]))

  return (
    <>
      <TestCatalog exams={exams} active={active} busy={busy || !history} loading={!exams && !error}
        filters={filters} setFilters={setFilters}
        onOpen={exam => {
          const running = active.get(exam.id)
          return running ? open(`/attempts/${running.id}`, 'GET') : open('/attempts', 'POST', exam.id)
        }} />
      {error && <div className="error" role="alert">{error} <button className="quiet" onClick={load}>Reload dashboard</button></div>}
      <section className="history">
        <h2>Recent attempts</h2>
        {!history ? <p role="status">{error ? 'Attempt history unavailable.' : 'Loading attempts…'}</p>
          : history.length === 0 ? <p className="empty">Your attempts will appear here after you start an exam.</p>
          : <ul>{history.map(row => (
            <li key={row.id}>
              <div><strong>{row.title}</strong>
                <time dateTime={row.startedAt}>{timeFormat.format(new Date(row.startedAt))}</time>
                <span className="attempt-score">
                  {row.result && row.result.rawScore === row.result.total && <SkillCheck label="Perfect test score" />}
                  {row.status === 'active' ? 'In progress' : row.result && `Raw score ${row.result.rawScore}/${row.result.total} · Estimated AP score ${row.result.estimatedScore}/5`}
                </span></div>
              <button className="secondary" disabled={busy} onClick={() => open(`/attempts/${row.id}`, 'GET')}>
                {row.status === 'active' ? 'Resume exam' : 'View score'}
              </button>
            </li>
          ))}</ul>}
      </section>
    </>
  )
}

function Results({ attempt, result, onBack }: {
  attempt: SubmittedAttempt
  result: NonNullable<SubmittedAttempt['result']>
  onBack: () => void
}) {
  const { rawScore, total, estimatedScore, topicFeedback, incompleteQuestions } = result
  return (
    <section className="result-card">
      <h1>Exam results</h1>
      <p className="result-title">{attempt.title}{rawScore === total && <SkillCheck label="Perfect test score" />}</p>
      <p>{attempt.submission === 'time' ? 'Submitted when time expired.' : 'Your exam was submitted.'}</p>
      <dl className="scores">
        <div><dt>Raw score</dt><dd>{rawScore}<small> / {total}</small><progress className="score-progress" aria-label="Correct answers" value={rawScore} max={total} /></dd></div>
        <div><dt>Estimated AP score</dt><dd>{estimatedScore}<small> / 5</small></dd></div>
      </dl>
      <p className="note">The estimate uses practice cutoffs for the multiple-choice section. Official AP scoring depends on the course and exam sections.</p>
      {!!topicFeedback?.length && <TopicFeedback topics={topicFeedback} incomplete={incompleteQuestions ?? 0} />}
      <button className="primary" onClick={onBack}>Back to dashboard</button>
    </section>
  )
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = String(seconds % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}

function readReviewMarks(attemptId: string): string[] {
  try {
    const marks: unknown = JSON.parse(sessionStorage.getItem(`ap-practice:review:${attemptId}`) ?? '[]')
    return Array.isArray(marks) ? marks.filter(mark => typeof mark === 'string') : []
  } catch {
    return []
  }
}

function QuestionPrompt({ prompt }: { prompt: string }) {
  const divider = prompt.indexOf('\n\n')
  const code = divider < 0 ? '' : prompt.slice(divider + 2)
  const hasCode = /^(?:[\w]+ ←|(?:int|double|boolean|String|ArrayList|class|for|while|PROCEDURE)\b)/.test(code)
  return <div id="prompt" className="question-prompt">
    <p>{hasCode ? prompt.slice(0, divider) : prompt}</p>
    {hasCode && <pre><code>{code}</code></pre>}
  </div>
}

function Exam({ api, attempt, onComplete, onExit }: {
  api: Api
  attempt: ActiveAttempt & { receivedTime: number }
  onComplete: (attempt: SubmittedAttempt) => void
  onExit: () => void
}) {
  const { id, questions } = attempt
  const [answers, setAnswers] = useState(attempt.answers)
  const [index, setIndex] = useState(() => Math.max(0, questions.findIndex(q => (attempt.answers[q.id]?.length ?? 0) < q.select)))
  const [now, setNow] = useState(() => performance.now())
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [review, setReview] = useState(false)
  const [marked, setMarked] = useState(() => readReviewMarks(id))
  const lock = useRef(false)
  const nextCheck = useRef(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const seconds = Math.max(0, Math.ceil((Date.parse(attempt.expiresAt) - Date.parse(attempt.serverTime)
    - (now - attempt.receivedTime)) / 1000))
  const question = questions[index]
  const selected = answers[question.id] ?? []
  const answered = questions.filter(item => answers[item.id]?.length === item.select).length

  useEffect(() => {
    const interval = setInterval(() => setNow(performance.now()), 250)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { heading.current?.focus() }, [index, review])

  useEffect(() => {
    try {
      if (marked.length) sessionStorage.setItem(`ap-practice:review:${id}`, JSON.stringify(marked))
      else sessionStorage.removeItem(`ap-practice:review:${id}`)
    } catch {
      // Review marks remain available in memory if browser storage is blocked.
    }
  }, [id, marked])

  useEffect(() => {
    if (seconds > 0 || lock.current || now < nextCheck.current) return
    nextCheck.current = now + 3000
    lock.current = true
    setBusy('checking')
    api<Attempt>(`/attempts/${id}`).then(next => {
      if (next.status === 'submitted') onComplete(next)
    }).catch(err => {
      setError(`Could not load your result. Retrying automatically. ${errorMessage(err)}`)
    }).finally(() => {
      lock.current = false
      setBusy('')
    })
  }, [api, id, now, onComplete, seconds])

  async function save(option: number) {
    if (lock.current || seconds === 0) return
    const updated = selected.includes(option) ? selected.filter(item => item !== option)
      : question.select === 1 ? [option] : [...selected, option]
    if (updated.length > question.select) return
    lock.current = true
    setBusy('saving')
    setError('')
    setAnswers(current => ({ ...current, [question.id]: updated }))
    try {
      await api<null>(`/attempts/${id}/answers/${question.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected: updated }),
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const attempt = err.value as Attempt | null
        if (attempt?.status === 'submitted') return onComplete(attempt)
      }
      try {
        const latest = await api<Attempt>(`/attempts/${id}`)
        if (latest.status === 'submitted') return onComplete(latest)
        setAnswers(latest.answers)
        setError('The save could not be confirmed. Check your selection and try again if needed.')
      } catch {
        setAnswers(current => ({ ...current, [question.id]: selected }))
        setError('The save could not be confirmed. Select your answer again to retry.')
      }
    } finally {
      lock.current = false
      setBusy('')
    }
  }

  async function submit() {
    if (lock.current || seconds === 0) return
    lock.current = true
    setBusy('submitting')
    setError('')
    try {
      const next = await api<Attempt>(`/attempts/${id}/submit`, { method: 'POST' })
      if (next.status === 'submitted') onComplete(next)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      lock.current = false
      setBusy('')
    }
  }

  function jump(target: number) {
    setReview(false)
    setIndex(target)
  }

  return (
    <div className="exam">
      <div className="exam-top">
        <div><h1>{attempt.title ?? course}</h1><p className="note">Timed practice</p></div>
        <div className={`timer ${seconds <= 60 ? 'urgent' : ''}`} role="timer" aria-label="Time remaining"><span>Time left</span><strong>{formatTime(seconds)}</strong></div>
      </div>
      <div className="exam-layout">
        <section className="question-card">
          {review ? <>
            <h2 ref={heading} tabIndex={-1}>Review and submit</h2>
            <div className="review-counts">
              <p><strong>{answered}</strong> answered</p>
              <p><strong>{questions.length - answered}</strong> incomplete</p>
              <p><strong>{marked.length}</strong> marked</p>
            </div>
            {marked.length > 0 && <div className="review-marks">
              <h3>Marked for review</h3>
              {questions.map((item, i) => marked.includes(item.id)
                && <button key={item.id} className="secondary" onClick={() => jump(i)}>Question {i + 1}</button>)}
            </div>}
            <p>{answered < questions.length ? 'Unanswered or partially answered questions earn zero points.' : 'All questions have a saved answer.'}</p>
            <div className="question-actions">
              <button className="secondary" onClick={() => setReview(false)}>Keep working</button>
              <button className="primary" disabled={Boolean(busy) || seconds === 0} onClick={submit}>Submit exam</button>
            </div>
          </> : <>
            <div className="question-heading">
              <h2 ref={heading} tabIndex={-1}>Question {index + 1} of {questions.length}</h2>
              <button className="secondary mark-button" aria-pressed={marked.includes(question.id)}
                disabled={seconds === 0} onClick={() => setMarked(current => current.includes(question.id)
                  ? current.filter(item => item !== question.id) : [...current, question.id])}>
                {marked.includes(question.id) ? 'Marked for review' : 'Mark for review'}
              </button>
            </div>
            {question.passage && <aside className="passage"><h3>Reading passage</h3><p>{question.passage}</p></aside>}
            <fieldset disabled={busy === 'submitting' || seconds === 0}>
              <legend className="sr-only">Question {index + 1} answers</legend>
              <QuestionPrompt prompt={question.prompt} />
              <p className="note" id="instructions">{question.select === 2 ? 'Choose two answers.' : 'Choose one answer.'}</p>
              {question.options.map((option, optionIndex) => (
                <label className={`option ${selected.includes(optionIndex) ? 'chosen' : ''}`} key={optionIndex}>
                  <input type={question.select === 1 ? 'radio' : 'checkbox'} name={question.id}
                    aria-describedby="prompt instructions"
                    checked={selected.includes(optionIndex)}
                    disabled={question.select === 2 && selected.length === 2 && !selected.includes(optionIndex)}
                    onChange={() => void save(optionIndex)} />
                  <span className="choice-letter" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
                  <span className="choice-text">{option}</span>
                </label>
              ))}
              {question.select === 1 && selected.length > 0 && <button className="quiet" disabled={busy === 'saving'} onClick={() => save(selected[0])}>Clear answer</button>}
            </fieldset>
            <div className="question-actions">
              <button className="secondary" disabled={index === 0} onClick={() => jump(index - 1)}>Previous</button>
              <button className="primary" onClick={() => index < questions.length - 1 ? jump(index + 1) : setReview(true)}>
                {index < questions.length - 1 ? 'Next question' : 'Review exam'}
              </button>
            </div>
          </>}
          <div role="status" className="note">
            {seconds === 0 ? 'Time is up. Checking your submission…' : busy === 'saving' ? 'Saving answer…' : busy === 'submitting' ? 'Submitting exam…' : ''}
          </div>
          {error && <p role="alert" className="error">{error}</p>}
        </section>
        <aside className="navigator">
          <h2>Questions</h2>
          <p className="note">{answered} of {questions.length} answered</p>
          <progress className="exam-progress" aria-label="Questions answered" value={answered} max={questions.length} />
          <nav aria-label="Exam questions" className="question-grid">
            {questions.map((item, i) => {
              const complete = answers[item.id]?.length === item.select
              return <button key={item.id} className={[complete && 'answered', marked.includes(item.id) && 'marked'].filter(Boolean).join(' ')}
                aria-label={`Question ${i + 1}, ${complete ? 'answered' : 'incomplete'}${marked.includes(item.id) ? ', marked for review' : ''}`}
                aria-current={!review && i === index ? 'step' : undefined}
                onClick={() => jump(i)}>{i + 1}</button>
            })}
          </nav>
          <p className="note question-key"><span className="key-answered">Answered</span><span className="key-marked">Marked</span></p>
          <button className="secondary full" onClick={() => setReview(true)}>Review and submit</button>
          <button className="quiet full" disabled={Boolean(busy)} onClick={onExit}>Back to dashboard</button>
        </aside>
      </div>
    </div>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('The app root element is missing.')

createRoot(root).render(domain && clientId && audience
  ? <Auth0Provider domain={domain} clientId={clientId} authorizationParams={{ redirect_uri: window.location.origin, audience }}
      cache={authCache} useRefreshTokens useRefreshTokensFallback={false} httpTimeoutInSeconds={sessionTimeoutSeconds}
      onRedirectCallback={state => {
        const returnTo = state?.returnTo === '/admin' || state?.returnTo === '/profile' ? state.returnTo : '/'
        window.history.replaceState({}, '', returnTo)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }}>
      <App />
    </Auth0Provider>
  : <><SiteHeader /><main id="main-content" className="frame" tabIndex={-1}><SignInPanel><p className="error" role="alert">Auth0 setup is required. Follow the local setup instructions in README.md, then restart the frontend.</p></SignInPanel></main></>)
