import { useMemo, useState } from 'react'
import type { Milestone, PracticeSession } from './api'
import type { Piece } from './App'
import './ActivityView.css'

type Props = {
  sessions: PracticeSession[]
  milestones: Milestone[]
  catalog: Piece[]
  onCreateSession: (input: { pieceId?: string; durationSeconds: number; date: string }) => Promise<void>
  onUpdateSession: (id: string, input: { pieceId?: string | null; durationSeconds?: number; date?: string }) => Promise<void>
  onDeleteSession: (id: string) => Promise<void>
  onCreateMilestone: (input: { title: string; date: string; kind: Milestone['kind'] }) => Promise<void>
  onDeleteMilestone: (id: string) => Promise<void>
}

const pad = (value: number) => value.toString().padStart(2, '0')
function dateKey(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
function sessionDate(value: string) { return dateKey(new Date(value)) }
function todayKey() { return dateKey(new Date()) }
function monthTitle(date: Date) { return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }

function SessionEditor({ session, catalog, onSave, onDelete }: { session: PracticeSession; catalog: Piece[]; onSave: Props['onUpdateSession']; onDelete: Props['onDeleteSession'] }) {
  const [date, setDate] = useState(sessionDate(session.startedAt))
  const [minutes, setMinutes] = useState(Math.max(1, Math.round(session.durationSeconds / 60)))
  const [pieceId, setPieceId] = useState(session.piece?.id ?? '')
  const [saving, setSaving] = useState(false)
  async function save() { setSaving(true); await onSave(session.id, { date: `${date}T12:00:00`, durationSeconds: minutes * 60, pieceId: pieceId || null }); setSaving(false) }
  return <article className="activity-session"><div className="activity-session-title"><span className="activity-dot" /><strong>{session.piece?.title ?? 'Unassigned session'}</strong><button className="activity-delete" aria-label="Delete practice session" onClick={() => void onDelete(session.id)}>x</button></div><div className="activity-session-fields"><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Piece<select value={pieceId} onChange={(event) => setPieceId(event.target.value)}>{!pieceId && <option value="" disabled>Choose from repertoire</option>}{catalog.map((piece) => <option value={piece.id} key={piece.id}>{piece.title}</option>)}</select></label><label>Minutes<input type="number" min="1" max="1440" value={minutes} onChange={(event) => setMinutes(Math.max(1, Number(event.target.value)))} /></label><button className="save-mini" disabled={saving || !pieceId} onClick={() => void save()}>{saving ? '...' : 'Save'}</button></div></article>
}

export function ActivityView({ sessions, milestones, catalog, onCreateSession, onUpdateSession, onDeleteSession, onCreateMilestone, onDeleteMilestone }: Props) {
  const now = new Date()
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selected, setSelected] = useState(todayKey())
  const [newMinutes, setNewMinutes] = useState(30)
  const [newPieceId, setNewPieceId] = useState('')
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneKind, setMilestoneKind] = useState<Milestone['kind']>('concert')
  const [isAddingMilestone, setIsAddingMilestone] = useState(false)
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const leading = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: leading + daysInMonth }, (_, index) => index < leading ? null : index - leading + 1)
  const selectedSessions = sessions.filter((session) => sessionDate(session.startedAt) === selected)
  const sessionMinutes = useMemo(() => new Map(sessions.map((session) => [sessionDate(session.startedAt), (sessions.filter((item) => sessionDate(item.startedAt) === sessionDate(session.startedAt)).reduce((sum, item) => sum + item.durationSeconds, 0) / 60)])), [sessions])
  function chooseDay(day: number) { setSelected(dateKey(new Date(cursor.getFullYear(), cursor.getMonth(), day))) }
  async function addSession() { if (!newPieceId) return; await onCreateSession({ pieceId: newPieceId, durationSeconds: newMinutes * 60, date: `${selected}T12:00:00` }); setNewMinutes(30) }
  async function addMilestone() { if (!milestoneTitle.trim()) return; await onCreateMilestone({ title: milestoneTitle.trim(), date: selected, kind: milestoneKind }); setMilestoneTitle(''); setIsAddingMilestone(false) }
  return <section className="full-view activity-view"><div className="activity-heading"><div><p className="eyebrow">PRACTICE JOURNAL</p><h1>Activity</h1><p className="subtitle">Edit each session, track your real minutes and mark the moments that matter.</p></div><button className="session-button" onClick={() => setIsAddingMilestone(true)}>+ Add milestone</button></div><div className="activity-grid"><section className="calendar-card"><div className="calendar-header"><button aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>&lt;</button><h2>{monthTitle(cursor)}</h2><button aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>&gt;</button></div><div className="calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((day, index) => { const key = day ? dateKey(new Date(cursor.getFullYear(), cursor.getMonth(), day)) : `blank-${index}`; const minutes = key && day ? Math.round(sessionMinutes.get(key) ?? 0) : 0; const hasMilestone = day ? milestones.some((milestone) => milestone.date === key) : false; return <button className={`calendar-day ${key === selected ? 'selected' : ''} ${key === todayKey() ? 'today' : ''}`} key={key} disabled={!day} onClick={() => day && chooseDay(day)}><span>{day ?? ''}</span>{minutes > 0 && <small>{minutes}m</small>}{hasMilestone && <i aria-label="Milestone" />}</button> })}</div><div className="calendar-legend"><span><b className="legend-practice" /> Practice</span><span><b className="legend-milestone" /> Milestone</span></div></section><section className="day-card"><p className="eyebrow">SELECTED DAY</p><h2>{new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2><div className="day-total"><strong>{Math.round(selectedSessions.reduce((sum, session) => sum + session.durationSeconds, 0) / 60)} min</strong><span>{selectedSessions.length} {selectedSessions.length === 1 ? 'session' : 'sessions'}</span></div>{selectedSessions.length === 0 && <p className="activity-empty">No practice recorded for this date. Add a session below.</p>}{selectedSessions.map((session) => <SessionEditor key={session.id} session={session} catalog={catalog} onSave={onUpdateSession} onDelete={onDeleteSession} />)}<div className="add-session-box"><strong>Add practice from your repertoire</strong>{catalog.length === 0 ? <p className="activity-empty">Add a piece to your repertoire first.</p> : <div><select value={newPieceId} onChange={(event) => setNewPieceId(event.target.value)}><option value="">Choose a repertoire piece</option>{catalog.map((piece) => <option value={piece.id} key={piece.id}>{piece.title}</option>)}</select><input type="number" min="1" max="1440" value={newMinutes} onChange={(event) => setNewMinutes(Math.max(1, Number(event.target.value)))} aria-label="Practice minutes" /><button className="save-mini" disabled={!newPieceId} onClick={() => void addSession()}>Add</button></div>}</div></section></div><section className="milestones-section"><div className="section-heading"><div><p className="eyebrow">MILESTONES</p><h2>Exams, concerts and goals</h2></div><button className="text-button" onClick={() => setIsAddingMilestone(true)}>Add milestone -&gt;</button></div>{milestones.length === 0 && <p className="activity-empty">No milestones yet. Add a concert or exam to place it on your calendar.</p>}<div className="milestone-list">{milestones.map((milestone) => <article className={`milestone-card ${milestone.date < todayKey() ? 'past' : ''}`} key={milestone.id}><span className={`milestone-kind ${milestone.kind}`}>{milestone.kind}</span><div><strong>{milestone.title}</strong><small>{new Date(`${milestone.date}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })}</small></div><button className="remove-piece" aria-label={`Delete ${milestone.title}`} onClick={() => void onDeleteMilestone(milestone.id)}>x</button></article>)}</div></section>{isAddingMilestone && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAddingMilestone(false) }}><section className="add-modal milestone-modal" role="dialog" aria-modal="true" aria-labelledby="milestone-title"><button className="modal-close" aria-label="Close" onClick={() => setIsAddingMilestone(false)}>x</button><p className="eyebrow">PLAN A MOMENT</p><h2 id="milestone-title">Add a milestone</h2><label className="search-field">What are you preparing for?<input value={milestoneTitle} onChange={(event) => setMilestoneTitle(event.target.value)} placeholder="Spring recital" /></label><label className="search-field">Date<input type="date" value={selected} onChange={(event) => setSelected(event.target.value)} /></label><label className="search-field">Type<select value={milestoneKind} onChange={(event) => setMilestoneKind(event.target.value as Milestone['kind'])}><option value="concert">Concert</option><option value="exam">Exam</option><option value="audition">Audition</option><option value="event">Other event</option></select></label><button className="auth-submit" disabled={!milestoneTitle.trim()} onClick={() => void addMilestone()}>Save milestone -&gt;</button></section></div>}</section>
}
