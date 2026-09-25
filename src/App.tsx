import { useEffect, useMemo, useState } from 'react'
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
  const [repertoire, setRepertoire] = useState<Piece[]>(() => {
    if (window.localStorage.getItem('piano-companion-repertoire-version') !== REPERTOIRE_VERSION) { window.localStorage.removeItem('piano-companion-repertoire'); window.localStorage.setItem('piano-companion-repertoire-version', REPERTOIRE_VERSION); return [] }
    const saved = window.localStorage.getItem('piano-companion-repertoire')
    return saved ? JSON.parse(saved) as Piece[] : []
  })
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(() => {
    if (window.localStorage.getItem('piano-companion-repertoire-version') !== REPERTOIRE_VERSION) return null
    const saved = window.localStorage.getItem('piano-companion-repertoire')
    const parsed = saved ? JSON.parse(saved) as Piece[] : []
    return parsed[0] ?? null
  })
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [authUser, setAuthUser] = useState<ApiUser | null>(() => { const saved = window.localStorage.getItem('piano-companion-user'); return saved ? JSON.parse(saved) as ApiUser : null })

  useEffect(() => { if (!isSessionActive) return undefined; const timer = window.setInterval(() => setSessionSeconds((current) => current + 1), 1000); return () => window.clearInterval(timer) }, [isSessionActive])
  useEffect(() => { window.localStorage.setItem('piano-companion-repertoire', JSON.stringify(repertoire)) }, [repertoire])
  useEffect(() => { if (!authUser) return; getPracticeSessions().then(setPracticeSessions).catch(() => setPracticeSessions([])); getMilestones().then(setMilestones).catch(() => setMilestones([])) }, [authUser])
  useEffect(() => {
    getPieces().then((remotePieces) => {
      const mapped = remotePieces.map((piece, index) => ({ id: piece.id, title: piece.title, composer: piece.composer, level: piece.difficulty, progress: fallbackPieces[index % fallbackPieces.length].progress, tone: fallbackPieces[index % fallbackPieces.length].tone, symbol: fallbackPieces[index % fallbackPieces.length].symbol }))
      if (!mapped.length) return
      setCatalog(mapped)
      setRepertoire((current) => {
        const nextRepertoire = current.map((piece) => piece.id?.startsWith('custom-') ? piece : mapped.find((remote) => remote.title === piece.title) ?? piece)
        setSelectedPiece((prevSelected) => {
          if (!prevSelected) return null
          const found = nextRepertoire.find((p) => (p.id ?? p.title) === (prevSelected.id ?? prevSelected.title))
          return found ?? (nextRepertoire[0] ?? null)
        })
        return nextRepertoire
      })
    }).catch(() => undefined)
  }, [])

  const thisWeek = useMemo(() => weekMinutes(practiceSessions), [practiceSessions])
  const lastWeek = useMemo(() => weekMinutes(practiceSessions, -1), [practiceSessions])
  const thisWeekSeconds = thisWeek.reduce((total, item) => total + item.minutes * 60, 0)
  const allTimeSeconds = sumSeconds(practiceSessions)
  const firstName = authUser?.name.split(' ')[0] ?? ''

  async function toggleSession() {
    if (!isSessionActive) { setSessionSeconds(0); setIsSessionActive(true); return }
    const durationSeconds = Math.max(sessionSeconds, 1); setIsSessionActive(false)
    try { const saved = await createPracticeSession({ pieceId: selectedPiece?.id, durationSeconds }); setPracticeSessions((current) => [saved, ...current]) } catch { /* keep the timer usable if the API is temporarily unavailable */ }
  }
  function addToRepertoire(piece: Piece) {
    const pieceKey = piece.id ?? piece.title
    setRepertoire((current) => current.some((item) => (item.id ?? item.title) === pieceKey) ? current : [...current, piece])
    setSelectedPiece((current) => current ?? piece)
  }
  function updateProgress(piece: Piece, progress: number) {
    const pieceKey = piece.id ?? piece.title
    setRepertoire((current) => current.map((item) => (item.id ?? item.title) === pieceKey ? { ...item, progress } : item))
    setSelectedPiece((current) => (current && (current.id ?? current.title) === pieceKey) ? { ...current, progress } : current)
  }
  function removeFromRepertoire(piece: Piece) {
    const pieceKey = piece.id ?? piece.title
    setRepertoire((current) => {
      const updated = current.filter((item) => (item.id ?? item.title) !== pieceKey)
      setSelectedPiece((prevSelected) => {
        if (!prevSelected) return null
        if ((prevSelected.id ?? prevSelected.title) === pieceKey) {
          return updated[0] ?? null
        }
        return prevSelected
      })
      return updated
    })
  }
  async function addActivitySession(input: { pieceId?: string; durationSeconds: number; date: string }) { const saved = await createPracticeSession(input); setPracticeSessions((current) => [saved, ...current]) }
  async function editActivitySession(id: string, input: { pieceId?: string | null; durationSeconds?: number; date?: string }) { const saved = await updatePracticeSession(id, input); setPracticeSessions((current) => current.map((session) => session.id === id ? saved : session)) }
  async function removeActivitySession(id: string) { await deletePracticeSession(id); setPracticeSessions((current) => current.filter((session) => session.id !== id)) }
  async function addActivityMilestone(input: { title: string; date: string; kind: Milestone['kind'] }) { const saved = await createMilestone(input); setMilestones((current) => [...current, saved].sort((a, b) => a.date.localeCompare(b.date))) }
  async function removeActivityMilestone(id: string) { await deleteMilestone(id); setMilestones((current) => current.filter((milestone) => milestone.id !== id)) }
  function authenticate(token: string, user: ApiUser) { window.localStorage.setItem('piano-companion-token', token); window.localStorage.setItem('piano-companion-user', JSON.stringify(user)); setAuthUser(user) }
  function signOut() { window.localStorage.removeItem('piano-companion-token'); window.localStorage.removeItem('piano-companion-user'); setAuthUser(null); setPracticeSessions([]) }
  if (!authUser) return <AuthScreen onAuthenticated={authenticate} />
  const showActivity = view === 'Activity' || view === 'History'
  if (showActivity) return <div className="app-shell activity-shell"><main className="main-content"><header className="topbar"><div className="mobile-brand"><span className="brand-mark" aria-hidden="true">O</span> PianoCompanion</div><button className="text-button" onClick={() => setView('Today')}>Back to dashboard</button></header><ActivityView sessions={practiceSessions} milestones={milestones} catalog={repertoire} onCreateSession={addActivitySession} onUpdateSession={editActivitySession} onDeleteSession={removeActivitySession} onCreateMilestone={addActivityMilestone} onDeleteMilestone={removeActivityMilestone} /></main></div>

  return <div className="app-shell"><aside className="sidebar" aria-label="Main navigation"><div className="brand"><span className="brand-mark" aria-hidden="true">O</span><span>Piano<span>Companion</span></span></div><div className="profile-mini"><div className="avatar">{authUser.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{authUser.name}</strong><span>{authUser.level}</span></div><button className="icon-button" aria-label="Sign out" onClick={signOut}>x</button></div><nav className="nav-list">{(['Today', 'Repertoire', 'Activity'] as View[]).map((item, index) => <button key={item} className={`nav-item ${view === item ? 'active' : ''}`} onClick={() => setView(item)}><span className="nav-icon" aria-hidden="true">{['H', 'P', 'A'][index]}</span>{item}</button>)}</nav><div className="sidebar-bottom"><div className="goal-card"><div className="goal-icon">*</div><div><strong>Weekly goal</strong><span>{Math.min(Math.round(thisWeekSeconds / 60), 180)} / 180 min</span></div><div className="mini-ring"><span>{Math.min(100, Math.round(thisWeekSeconds / 108))}%</span></div></div></div></aside><main className="main-content"><header className="topbar"><div className="mobile-brand"><span className="brand-mark" aria-hidden="true">O</span> PianoCompanion</div><div className="topbar-actions"><button className="notification" aria-label="Notifications"><span aria-hidden="true">o</span><i /></button><div className="avatar">{authUser.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div></div></header>
    {view === 'Today' && <><section className="welcome-row"><div><p className="eyebrow">FRIDAY, SEPTEMBER 25</p><h1>Good morning, {firstName} <span aria-hidden="true">*</span></h1><p className="subtitle">A little progress every day becomes something beautiful.</p></div><button className={`session-button ${isSessionActive ? 'recording' : ''}`} onClick={toggleSession}><span className="play-icon" aria-hidden="true">{isSessionActive ? '[]' : '>'}</span>{isSessionActive ? 'End session' : 'Start a session'}</button></section>{isSessionActive && <div className="active-session" role="status"><span className="pulse" /> Session in progress <strong>{formatTime(sessionSeconds)}</strong><button onClick={toggleSession}>Finish &amp; save</button></div>}<section className="stats-grid" aria-label="Practice overview"><article className="stat-card"><div className="stat-label">TOTAL PRACTICE</div><strong>{formatDuration(allTimeSeconds)}</strong><span className="stat-note">Across {practiceSessions.length} saved sessions</span></article><article className="stat-card"><div className="stat-label">THIS WEEK</div><strong>{Math.round(thisWeekSeconds / 60)} <small>min</small></strong><span className="stat-note">Goal: 180 min</span><div className="progress-line"><span style={{ width: `${Math.min(100, (thisWeekSeconds / 60 / 180) * 100)}%` }} /></div></article><article className="stat-card"><div className="stat-label">SESSIONS</div><strong>{practiceSessions.length} <small>total</small></strong><span className="stat-note">Saved to your practice log</span></article></section><div className="content-grid"><section className="panel continue-panel">{selectedPiece ? <><div className="panel-heading"><div><p className="eyebrow">CONTINUE PRACTICING</p><h2>{selectedPiece.title}</h2><p className="muted">{selectedPiece.composer}</p></div><button className="more-button" aria-label="More options">...</button></div><div className={`piece-art ${selectedPiece.tone}`}><span>{selectedPiece.symbol}</span><small>{selectedPiece.composer.split(' ').slice(-1)[0].toUpperCase()}</small></div><div className="piece-meta"><div><span>Progress</span><strong>{selectedPiece.progress}%</strong></div><div className="piece-progress"><span style={{ width: `${selectedPiece.progress}%` }} /></div><button className="text-button" onClick={() => setIsSessionActive(true)}>Practice now <span aria-hidden="true">-&gt;</span></button></div></> : <div className="empty-focus"><p className="eyebrow">CONTINUE PRACTICING</p><h2>Choose a piece to begin</h2><p className="muted">Add something to your repertoire and make it your focus.</p><button className="text-button" onClick={() => setView('Repertoire')}>Manage repertoire -&gt;</button></div>}</section><section className="panel week-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR WEEK</p><h2>Keep your rhythm</h2></div><span className="target-badge">{Math.round(thisWeekSeconds / 60)} / 180 min</span></div><div className="week-chart">{thisWeek.map((item, index) => <div className="day-column" key={`${item.day}-${index}`}>                  <div className="bar-track">
                    <span
                      className={item.minutes ? 'bar filled' : 'bar'}
                      style={{ height: `${item.minutes ? Math.max(12, Math.min(100, Math.round((item.minutes / 60) * 100))) : 8}%` }}
                      title={`${item.minutes} min`}
                    />
                  </div><small>{item.day}</small></div>)}</div><p className="chart-caption"><span className="dot" /> Practice minutes <span className="caption-muted">From your saved sessions</span></p></section></div><section className="repertoire-section"><div className="section-heading"><div><p className="eyebrow">MY REPERTOIRE</p><h2>Pieces in progress</h2></div><button className="text-button" onClick={() => setView('Repertoire')}>Manage repertoire <span aria-hidden="true">-&gt;</span></button></div><div className="piece-list">{repertoire.slice(0, 4).map((piece) => <button className={`piece-row ${(selectedPiece?.id ?? selectedPiece?.title) === (piece.id ?? piece.title) ? 'selected' : ''}`} key={piece.id ?? piece.title} onClick={() => setSelectedPiece(piece)}><div className={`piece-thumb ${piece.tone}`}>{piece.symbol}</div><div className="piece-name"><strong>{piece.title}</strong><span>{piece.composer}</span></div><span className="level-pill">{piece.level}</span><div className="row-progress"><span>{piece.progress}%</span><div className="progress-line"><span style={{ width: `${piece.progress}%` }} /></div></div><span className="row-arrow" aria-hidden="true">-&gt;</span></button>)}</div></section></>}
    {view === 'Repertoire' && <RepertoireManager catalog={catalog} repertoire={repertoire} selectedPiece={selectedPiece} onAdd={addToRepertoire} onRemove={removeFromRepertoire} onUpdate={updateProgress} onUse={(piece) => { setSelectedPiece(piece); setView('Today') }} />}
    {view === 'History' && <section className="full-view"><p className="eyebrow">PRACTICE LOG</p><h1>Your history</h1><p className="subtitle">Every saved session contributes to these totals.</p><div className="history-card"><div className="history-total"><strong>{formatDuration(allTimeSeconds)}</strong><span>Total practice time</span></div>{[{ label: 'This week', seconds: thisWeekSeconds }, { label: 'Last week', seconds: sumSeconds(lastWeek.length ? practiceSessions.filter((session) => { const when = new Date(session.startedAt); const start = mondayFor(new Date()); start.setDate(start.getDate() - 7); const end = new Date(start); end.setDate(end.getDate() + 7); return when >= start && when < end }) : []) }, { label: 'This month', seconds: sumSeconds(practiceSessions.filter((session) => { const date = new Date(session.startedAt); const now = new Date(); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() })) }].map((item) => <div className="history-row" key={item.label}><span className="history-dot" /><span>{item.label} - {formatDuration(item.seconds)}</span><span className="history-bar"><i style={{ width: `${allTimeSeconds ? Math.max(3, (item.seconds / allTimeSeconds) * 100) : 0}%` }} /></span></div>)}</div></section>}
  </main><nav className="mobile-nav" aria-label="Mobile navigation">{(['Today', 'Repertoire', 'History'] as View[]).map((item, index) => <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}><span aria-hidden="true">{['H', 'P', 'H'][index]}</span>{item}</button>)}</nav></div>
}

export default App
