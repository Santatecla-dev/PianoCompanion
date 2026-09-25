import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import './layout.css'
import { createMilestone, createPracticeSession, deleteMilestone, deletePracticeSession, getMilestones, getPieces, getPracticeSessions, updatePracticeSession } from './api'
import type { ApiUser, Milestone, PracticeSession } from './api'
import { AuthScreen } from './AuthScreen'
import { RepertoireManager } from './RepertoireManager'
import { ActivityView } from './ActivityView'

type View = 'Today' | 'Repertoire' | 'History' | 'Activity' | (string & {})
export type Piece = { id?: string; title: string; composer: string; level: string; progress: number; tone: string; symbol: string }
const fallbackPieces: Piece[] = [
  { title: 'Clair de Lune', composer: 'Claude Debussy', level: 'Intermediate', progress: 68, tone: 'lavender', symbol: 'C' },
  { title: 'Nocturne in E-flat Major, Op. 9 No. 2', composer: 'Frederic Chopin', level: 'Intermediate', progress: 42, tone: 'blue', symbol: 'N' },
  { title: 'Prelude in C Major, BWV 846', composer: 'J. S. Bach', level: 'Early intermediate', progress: 91, tone: 'sand', symbol: 'P' },
]
function pieceKey(piece: Piece) { return piece.id ?? `${piece.title}::${piece.composer}` }
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const REPERTOIRE_VERSION = '2'

function formatTime(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}` }
function formatDuration(seconds: number) { const minutes = Math.floor(seconds / 60); return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m` }
function mondayFor(date: Date) { const result = new Date(date); const day = result.getDay() || 7; result.setDate(result.getDate() - day + 1); result.setHours(0, 0, 0, 0); return result }
function weekMinutes(sessions: PracticeSession[], offset = 0) { const start = mondayFor(new Date()); start.setDate(start.getDate() + offset * 7); const end = new Date(start); end.setDate(end.getDate() + 7); return dayLabels.map((day, index) => { const date = new Date(start); date.setDate(start.getDate() + index); const next = new Date(date); next.setDate(date.getDate() + 1); const seconds = sessions.filter((session) => { const when = new Date(session.startedAt); return when >= date && when < next }).reduce((total, session) => total + session.durationSeconds, 0); return { day, minutes: Math.round(seconds / 60) } }).map((item) => ({ ...item, offset })) }
function sumSeconds(sessions: PracticeSession[]) { return sessions.reduce((total, session) => total + session.durationSeconds, 0) }

function App() {
  const [view, setView] = useState<View>('Today')
  const [catalog, setCatalog] = useState<Piece[]>(fallbackPieces)
  const [selectedPieceKey, setSelectedPieceKey] = useState<string | null>(null)
  const [repertoire, setRepertoire] = useState<Piece[]>(() => {
    if (window.localStorage.getItem('piano-companion-repertoire-version') !== REPERTOIRE_VERSION) { window.localStorage.removeItem('piano-companion-repertoire'); window.localStorage.setItem('piano-companion-repertoire-version', REPERTOIRE_VERSION); return [] }
    const saved = window.localStorage.getItem('piano-companion-repertoire')
    return saved ? JSON.parse(saved) as Piece[] : []
  })
  const selectedPiece = repertoire.find((piece) => pieceKey(piece) === selectedPieceKey) ?? null
  function selectPiece(piece: Piece) { setSelectedPieceKey(pieceKey(piece)) }
  const sessionStart = useRef(0)
  const [sessionPiece, setSessionPiece] = useState<Piece | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [authUser, setAuthUser] = useState<ApiUser | null>(() => { const saved = window.localStorage.getItem('piano-companion-user'); return saved ? JSON.parse(saved) as ApiUser : null })

  useEffect(() => { if (!isSessionActive) return undefined; const timer = window.setInterval(() => setSessionSeconds(Math.floor((Date.now() - sessionStart.current) / 1000)), 1000); return () => window.clearInterval(timer) }, [isSessionActive])
  useEffect(() => { window.localStorage.setItem('piano-companion-repertoire', JSON.stringify(repertoire)) }, [repertoire])
  useEffect(() => { if (!authUser) return; getPracticeSessions().then(setPracticeSessions).catch(() => setPracticeSessions([])); getMilestones().then(setMilestones).catch(() => setMilestones([])) }, [authUser])
  useEffect(() => {
    getPieces().then((remotePieces) => {
      const mapped = remotePieces.map((piece, index) => ({ id: piece.id, title: piece.title, composer: piece.composer, level: piece.difficulty, progress: 0, tone: fallbackPieces[index % fallbackPieces.length].tone, symbol: fallbackPieces[index % fallbackPieces.length].symbol }))
      if (!mapped.length) return
      setCatalog(mapped)
      setRepertoire((current) => current.map((piece) => {
        if (piece.id?.startsWith('custom-')) return piece
        const remote = mapped.find((item) => item.id === piece.id || (item.title === piece.title && item.composer === piece.composer))
        return remote ? { ...remote, progress: piece.progress } : piece
      }))
    }).catch(() => undefined)
  }, [])

  const thisWeek = useMemo(() => weekMinutes(practiceSessions), [practiceSessions])
  const lastWeek = useMemo(() => weekMinutes(practiceSessions, -1), [practiceSessions])
  const thisWeekSeconds = thisWeek.reduce((total, item) => total + item.minutes * 60, 0)
  const allTimeSeconds = sumSeconds(practiceSessions)
  const firstName = authUser?.name.split(' ')[0] ?? ''

  function startSession() {
    if (isSessionActive || isSaving) return
    sessionStart.current = Date.now()
    setSessionPiece(selectedPiece)
    setSessionSeconds(0)
    setSessionError('')
    setIsSessionActive(true)
  }
  async function toggleSession() {
    if (isSaving) return
    if (!isSessionActive) { startSession(); return }
    const durationSeconds = Math.max(1, Math.floor((Date.now() - sessionStart.current) / 1000))
    setIsSaving(true)
    setSessionError('')
    try {
      const piece = sessionPiece
      const saved = await createPracticeSession({
        pieceId: piece?.id?.startsWith('custom-') ? undefined : piece?.id,
        durationSeconds,
      })
      setPracticeSessions((current) => [saved, ...current])
      setIsSessionActive(false)
    } catch {
      setSessionError('Your session could not be saved. The timer is still running; please try again.')
    } finally { setIsSaving(false) }
  }
  function addToRepertoire(piece: Piece) {
    setRepertoire((current) => current.some((item) => pieceKey(item) === pieceKey(piece)) ? current : [...current, piece])
    if (!selectedPiece) selectPiece(piece)
  }
  function updateProgress(piece: Piece, progress: number) {
    setRepertoire((current) => current.map((item) => pieceKey(item) === pieceKey(piece) ? { ...item, progress } : item))
  }
  function removeFromRepertoire(piece: Piece) {
    setRepertoire((current) => current.filter((item) => pieceKey(item) !== pieceKey(piece)))
    if (selectedPieceKey === pieceKey(piece)) setSelectedPieceKey(null)
  }
  async function addActivitySession(input: { pieceId?: string; durationSeconds: number; date: string }) { const saved = await createPracticeSession(input); setPracticeSessions((current) => [saved, ...current]) }
  async function editActivitySession(id: string, input: { pieceId?: string | null; durationSeconds?: number; date?: string }) { const saved = await updatePracticeSession(id, input); setPracticeSessions((current) => current.map((session) => session.id === id ? saved : session)) }
  async function removeActivitySession(id: string) { await deletePracticeSession(id); setPracticeSessions((current) => current.filter((session) => session.id !== id)) }
  async function addActivityMilestone(input: { title: string; date: string; kind: Milestone['kind'] }) { const saved = await createMilestone(input); setMilestones((current) => [...current, saved].sort((a, b) => a.date.localeCompare(b.date))) }
  async function removeActivityMilestone(id: string) { await deleteMilestone(id); setMilestones((current) => current.filter((milestone) => milestone.id !== id)) }
  function authenticate(token: string, user: ApiUser) { window.localStorage.setItem('piano-companion-token', token); window.localStorage.setItem('piano-companion-user', JSON.stringify(user)); setAuthUser(user) }
  function signOut() { window.localStorage.removeItem('piano-companion-token'); window.localStorage.removeItem('piano-companion-user'); setAuthUser(null); setPracticeSessions([]); setSelectedPieceKey(null); setIsSessionActive(false); setSessionSeconds(0); setSessionError('') }
  if (!authUser) return <AuthScreen onAuthenticated={authenticate} />
  const showActivity = view === 'Activity' || view === 'History'
  if (showActivity) return <div className="app-shell activity-shell"><main className="main-content"><header className="topbar"><div className="mobile-brand"><span className="brand-mark" aria-hidden="true">O</span> PianoCompanion</div><button className="text-button" onClick={() => setView('Today')}>Back to dashboard</button></header><ActivityView sessions={practiceSessions} milestones={milestones} catalog={repertoire} onCreateSession={addActivitySession} onUpdateSession={editActivitySession} onDeleteSession={removeActivitySession} onCreateMilestone={addActivityMilestone} onDeleteMilestone={removeActivityMilestone} /></main></div>

  return <div className="app-shell"><aside className="sidebar" aria-label="Main navigation"><div className="brand"><span className="brand-mark" aria-hidden="true">O</span><span>Piano<span>Companion</span></span></div><div className="profile-mini"><div className="avatar">{authUser.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{authUser.name}</strong><span>{authUser.level}</span></div><button className="icon-button" aria-label="Sign out" onClick={signOut}>x</button></div><nav className="nav-list">{(['Today', 'Repertoire', 'Activity'] as View[]).map((item, index) => <button key={item} aria-current={view === item ? 'page' : undefined} className={`nav-item ${view === item ? 'active' : ''}`} onClick={() => setView(item)}><span className="nav-icon" aria-hidden="true">{['H', 'P', 'A'][index]}</span>{item}</button>)}</nav><div className="sidebar-bottom"><div className="goal-card"><div className="goal-icon">*</div><div><strong>Weekly goal</strong><span>{Math.min(Math.round(thisWeekSeconds / 60), 180)} / 180 min</span></div><div className="mini-ring"><span>{Math.min(100, Math.round(thisWeekSeconds / 108))}%</span></div></div></div></aside><main className="main-content"><header className="topbar"><div className="mobile-brand"><span className="brand-mark" aria-hidden="true">O</span> PianoCompanion</div><div className="topbar-actions"><button className="text-button mobile-sign-out" onClick={signOut}>Sign out</button><div className="avatar">{authUser.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div></div></header>
    {view === 'Today' && <><section className="welcome-row"><div><p className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</p><h1>Good morning, {firstName} <span aria-hidden="true">*</span></h1><p className="subtitle">A little progress every day becomes something beautiful.</p></div><button className={`session-button ${isSessionActive ? 'recording' : ''}`} onClick={toggleSession} disabled={isSaving}><span className="play-icon" aria-hidden="true">{isSessionActive ? '[]' : '>'}</span>{isSaving ? 'Saving…' : isSessionActive ? 'End session' : 'Start a session'}</button></section>{isSessionActive && <div className="active-session" role="status"><span className="pulse" /> Session in progress <strong role="timer">{formatTime(sessionSeconds)}</strong><span>{sessionPiece?.title ?? 'General practice'}</span><button onClick={toggleSession} disabled={isSaving}>Finish &amp; save</button></div>}{sessionError && <p className="session-feedback" role="alert">{sessionError}</p>}<section className="stats-grid" aria-label="Practice overview"><article className="stat-card"><div className="stat-label">TOTAL PRACTICE</div><strong>{formatDuration(allTimeSeconds)}</strong><span className="stat-note">Across {practiceSessions.length} saved sessions</span></article><article className="stat-card"><div className="stat-label">THIS WEEK</div><strong>{Math.round(thisWeekSeconds / 60)} <small>min</small></strong><span className="stat-note">Goal: 180 min</span><div className="progress-line"><span style={{ width: `${Math.min(100, (thisWeekSeconds / 60 / 180) * 100)}%` }} /></div></article><article className="stat-card"><div className="stat-label">SESSIONS</div><strong>{practiceSessions.length} <small>total</small></strong><span className="stat-note">Saved to your practice log</span></article></section><div className="content-grid"><section className="panel continue-panel">{selectedPiece ? <><div className="panel-heading"><div><p className="eyebrow">CONTINUE PRACTICING</p><h2>{selectedPiece.title}</h2><p className="muted">{selectedPiece.composer}</p></div><span className="focus-label">Current focus</span></div><div className={`piece-art ${selectedPiece.tone}`}><span>{selectedPiece.symbol}</span><small>{selectedPiece.composer.split(' ').slice(-1)[0].toUpperCase()}</small></div><div className="piece-meta"><div><span>Progress</span><strong>{selectedPiece.progress}%</strong></div><div className="piece-progress"><span style={{ width: `${selectedPiece.progress}%` }} /></div><button className="text-button" onClick={startSession} disabled={isSessionActive || isSaving}>{isSessionActive ? 'Session in progress' : 'Practice now'} <span aria-hidden="true">-&gt;</span></button></div></> : <div className="empty-focus"><p className="eyebrow">CONTINUE PRACTICING</p><h2>Choose a piece to begin</h2><p className="muted">Add something to your repertoire and make it your focus.</p><button className="text-button" onClick={() => setView('Repertoire')}>Manage repertoire -&gt;</button></div>}</section><section className="panel week-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR WEEK</p><h2>Keep your rhythm</h2></div><span className="target-badge">{Math.round(thisWeekSeconds / 60)} / 180 min</span></div><div className="week-chart">{thisWeek.map((item, index) => <div className="day-column" key={`${item.day}-${index}`} aria-label={`${dayNames[index]}: ${item.minutes} minutes`}><small className="day-minutes" aria-hidden="true">{item.minutes}</small><div className="bar-track" aria-hidden="true"><span className={item.minutes ? 'bar filled' : 'bar'} style={{ height: `${item.minutes ? (item.minutes / Math.max(60, ...thisWeek.map((day) => day.minutes))) * 100 : 0}px` }} /></div><small>{item.day}</small></div>)}</div><p className="chart-caption"><span className="dot" /> Practice minutes <span className="caption-muted">From your saved sessions</span></p></section></div><section className="repertoire-section"><div className="section-heading"><div><p className="eyebrow">MY REPERTOIRE</p><h2>Pieces in progress</h2></div><button className="text-button" onClick={() => setView('Repertoire')}>Manage repertoire <span aria-hidden="true">-&gt;</span></button></div><div className="piece-list">{repertoire.slice(0, 4).map((piece) => <button className={`piece-row ${selectedPieceKey === pieceKey(piece) ? 'selected' : ''}`} key={piece.id ?? piece.title} aria-pressed={selectedPieceKey === pieceKey(piece)} onClick={() => selectPiece(piece)}><div className={`piece-thumb ${piece.tone}`}>{piece.symbol}</div><div className="piece-name"><strong>{piece.title}</strong><span>{piece.composer}</span>{selectedPieceKey === pieceKey(piece) && <span className="focus-label">Current focus</span>}</div><span className="level-pill">{piece.level}</span><div className="row-progress"><span>{piece.progress}%</span><div className="progress-line"><span style={{ width: `${piece.progress}%` }} /></div></div><span className="row-arrow" aria-hidden="true">-&gt;</span></button>)}</div></section></>}
    {view === 'Repertoire' && <RepertoireManager selectedPieceKey={selectedPieceKey} catalog={catalog} repertoire={repertoire} onAdd={addToRepertoire} onRemove={removeFromRepertoire} onUpdate={updateProgress} onUse={(piece) => { selectPiece(piece); setView('Today') }} />}
    {view === 'History' && <section className="full-view"><p className="eyebrow">PRACTICE LOG</p><h1>Your history</h1><p className="subtitle">Every saved session contributes to these totals.</p><div className="history-card"><div className="history-total"><strong>{formatDuration(allTimeSeconds)}</strong><span>Total practice time</span></div>{[{ label: 'This week', seconds: thisWeekSeconds }, { label: 'Last week', seconds: sumSeconds(lastWeek.length ? practiceSessions.filter((session) => { const when = new Date(session.startedAt); const start = mondayFor(new Date()); start.setDate(start.getDate() - 7); const end = new Date(start); end.setDate(end.getDate() + 7); return when >= start && when < end }) : []) }, { label: 'This month', seconds: sumSeconds(practiceSessions.filter((session) => { const date = new Date(session.startedAt); const now = new Date(); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() })) }].map((item) => <div className="history-row" key={item.label}><span className="history-dot" /><span>{item.label} - {formatDuration(item.seconds)}</span><span className="history-bar"><i style={{ width: `${allTimeSeconds ? Math.max(3, (item.seconds / allTimeSeconds) * 100) : 0}%` }} /></span></div>)}</div></section>}
  </main><nav className="mobile-nav" aria-label="Mobile navigation">{(['Today', 'Repertoire', 'Activity'] as View[]).map((item, index) => <button key={item} aria-current={view === item ? 'page' : undefined} className={view === item ? 'active' : ''} onClick={() => setView(item)}><span aria-hidden="true">{['H', 'P', 'H'][index]}</span>{item}</button>)}</nav></div>
}

export default App
