import { useEffect, useMemo, useRef, useState } from 'react'
import type { Milestone, PracticeSession } from './api'
import type { Piece } from './App'
import './ActivityView.css'

type SessionInput = { pieceId?: string; durationSeconds: number; date: string; notes?: string }
type SessionUpdate = { pieceId?: string | null; durationSeconds?: number; date?: string; notes?: string | null }
type Props = { sessions: PracticeSession[]; milestones: Milestone[]; catalog: Piece[]; onCreateSession: (input: SessionInput) => Promise<void>; onUpdateSession: (id: string, input: SessionUpdate) => Promise<void>; onDeleteSession: (id: string) => Promise<void>; onCreateMilestone: (input: { title: string; date: string; kind: Milestone['kind']; notes?: string }) => Promise<void>; onDeleteMilestone: (id: string) => Promise<void> }
type ChecklistItem = { id: number; label: string; done: boolean }

const pad = (value: number) => value.toString().padStart(2, '0')
function dateKey(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
function sessionDate(value: string) { return dateKey(new Date(value)) }
function todayKey() { return dateKey(new Date()) }
function monthTitle(date: Date) { return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }
function daysUntil(date: string, today = todayKey()) { return Math.round((Date.parse(date) - Date.parse(today)) / 86400000) }
const validMinutes = (value: number) => Number.isFinite(value) && value >= 1 && value <= 1440
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unable to save changes. Please try again.'
function pieceTotals(sessions: PracticeSession[]) {
  const totals = new Map<string, { id: string; title: string; seconds: number }>()
  for (const session of sessions) {
    const id = session.piece?.id ?? 'general'
    const entry = totals.get(id) ?? { id, title: session.piece?.title ?? 'General practice', seconds: 0 }
    entry.seconds += session.durationSeconds
    totals.set(id, entry)
  }
  return [...totals.values()].sort((a, b) => b.seconds - a.seconds)
}

function SessionEditor({ session, catalog, onSave, onDelete }: { session: PracticeSession; catalog: Piece[]; onSave: Props['onUpdateSession']; onDelete: Props['onDeleteSession'] }) {
  const [date, setDate] = useState(sessionDate(session.startedAt))
  const [minutes, setMinutes] = useState(Math.max(1, Math.round(session.durationSeconds / 60)))
  const [pieceId, setPieceId] = useState(session.piece?.id ?? '')
  const [notes, setNotes] = useState(session.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function change(remove = false) {
    if (saving || (!remove && (!date || !validMinutes(minutes)))) return
    setSaving(true); setError('')
    try {
      if (remove) await onDelete(session.id)
      else await onSave(session.id, { date: date === sessionDate(session.startedAt) ? undefined : new Date(`${date}T12:00:00`).toISOString(), durationSeconds: minutes === Math.max(1, Math.round(session.durationSeconds / 60)) ? undefined : minutes * 60, pieceId: pieceId || null, notes: notes.trim() || null })
    } catch (error) { setError(errorMessage(error)) }
    finally { setSaving(false) }
  }
  return <article className="activity-session"><div className="activity-session-title"><span className="activity-dot" /><strong>{session.piece?.title ?? 'Unassigned session'}</strong><button className="activity-delete" aria-label="Delete practice session" disabled={saving} onClick={() => void change(true)}>x</button></div><div className="activity-session-fields"><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Piece<select value={pieceId} onChange={(event) => setPieceId(event.target.value)}><option value="">General practice</option>{pieceId && !catalog.some(piece => piece.id === pieceId) && <option value={pieceId}>{session.piece?.title ?? 'Previously selected piece'}</option>}{catalog.map((piece) => <option value={piece.id} key={piece.id}>{piece.title}</option>)}</select></label><label>Minutes<input type="number" min="1" max="1440" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label><button className="save-mini" disabled={saving || !date || !validMinutes(minutes)} onClick={() => void change()}>{saving ? '...' : 'Save'}</button></div><label className="session-notes">Practice notes<textarea aria-label="Practice notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What did you work on?" maxLength={500} /></label>{error && <p role="alert" className="activity-error">{error}</p>}</article>
}

const initialChecklist: ChecklistItem[] = [
  { id: 1, label: 'Warm up with scales and arpeggios', done: true },
  { id: 2, label: 'Review the difficult transition from the exposition', done: false },
  { id: 3, label: 'Practice hands separately with a metronome', done: false },
  { id: 4, label: 'Record one complete performance take', done: false },
  { id: 5, label: 'Listen back and write one observation', done: false },
  { id: 6, label: 'Memorise the final phrase before stopping', done: false },
  { id: 7, label: 'Relax shoulders and reset posture', done: false },
  { id: 8, label: 'Choose one goal for tomorrow', done: false },
]

function PracticeExtras({ sessions }: { sessions: PracticeSession[] }) {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem('piano-companion-activity-checklist') ?? 'null')
      if (Array.isArray(saved) && saved.every(item => item && Number.isSafeInteger(item.id) && typeof item.label === 'string' && typeof item.done === 'boolean') && new Set(saved.map(item => item.id)).size === saved.length) return saved
    } catch { /* Invalid or unavailable storage should not prevent practice. */ }
    return initialChecklist
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const [newItem, setNewItem] = useState('')
  useEffect(() => { try { window.localStorage.setItem('piano-companion-activity-checklist', JSON.stringify(items)) } catch { /* Keep the checklist usable when storage is unavailable. */ } }, [items])
  const breakdown = useMemo(() => {
    const entries = pieceTotals(sessions)
    return entries.length <= 6 ? entries : [...entries.slice(0, 5), { id: 'other', title: 'Other pieces', seconds: entries.slice(5).reduce((sum, item) => sum + item.seconds, 0) }]
  }, [sessions])
  const total = breakdown.reduce((sum, item) => sum + item.seconds, 0)
  const slices = breakdown.reduce<{ id: string; title: string; seconds: number; start: number; end: number; color: string }[]>((result, { id, title, seconds }, index) => { const start = result.at(-1)?.end ?? 0; const end = start + (total ? (seconds / total) * 100 : 0); result.push({ id, title, seconds, start, end, color: ['#8d6b99', '#b999c1', '#bd8b4b', '#83a3a3', '#b56c75', '#c9a9cf'][index] }); return result }, [])
  function addItem() { if (!newItem.trim()) return; setItems((current) => [...current, { id: current.reduce((max, item) => Math.max(max, item.id), 0) + 1, label: newItem.trim(), done: false }]); setNewItem(''); inputRef.current?.focus() }
  return <div className="activity-extra-grid"><section className="practice-checklist" aria-labelledby="checklist-title"><div className="extra-heading"><div><p className="eyebrow">TODAY'S ROUTINE</p><h2 id="checklist-title">Practice checklist</h2></div><span>{items.filter((item) => item.done).length}/{items.length}</span></div><div className="checklist-items">{items.map((item) => <div className={`checklist-item ${item.done ? 'done' : ''}`} key={item.id}><input id={`task-${item.id}`} type="checkbox" aria-label={item.label} checked={item.done} onChange={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry))} /><label htmlFor={`task-${item.id}`}>{item.label}</label><button type="button" aria-label={`Remove ${item.label}`} onClick={(event) => {
    const row = event.currentTarget.parentElement
    const next = (row?.nextElementSibling ?? row?.previousElementSibling)?.querySelector('input')
    ;(next instanceof HTMLElement ? next : inputRef.current)?.focus()
    setItems(current => current.filter(entry => entry.id !== item.id))
  }}>x</button></div>)}</div><form className="checklist-add" onSubmit={event => { event.preventDefault(); addItem() }}><input ref={inputRef} aria-label="Add a practice task" maxLength={500} value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="Add a practice task" /><button disabled={!newItem.trim()}>Add</button></form></section><section className="breakdown-card" aria-labelledby="breakdown-title"><div className="extra-heading"><div><p className="eyebrow">PRACTICE DISTRIBUTION</p><h2 id="breakdown-title">Time by piece</h2></div><span>{Math.round(total / 60)} min</span></div>{slices.length === 0 ? <p className="activity-empty">Save a session to see your distribution.</p> : <div className="pie-layout"><div className="pie-chart" style={{ background: `conic-gradient(${slices.map((slice) => `${slice.color} ${slice.start}% ${slice.end}%`).join(', ')})` }} aria-hidden="true"><span className="pie-center">{Math.round(total / 60)}m</span></div><div className="pie-legend">{slices.map((slice) => <div key={slice.id}><i style={{ background: slice.color }} /><span>{slice.title}</span><strong>{Math.round(slice.seconds / 60)}m · {Math.round(slice.end - slice.start)}%</strong></div>)}</div></div>}</section></div>
}

export function ActivityView({ sessions, milestones, catalog, onCreateSession, onUpdateSession, onDeleteSession, onCreateMilestone, onDeleteMilestone }: Props) {
  const [today, setToday] = useState(todayKey)
  useEffect(() => { const timer = window.setInterval(() => setToday(todayKey()), 60000); return () => window.clearInterval(timer) }, [])
  const now = new Date()
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selected, setSelected] = useState(todayKey())
  const [newMinutes, setNewMinutes] = useState(30)
  const [newPieceId, setNewPieceId] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneNotes, setMilestoneNotes] = useState('')
  const [milestoneKind, setMilestoneKind] = useState<Milestone['kind']>('concert')
  const [isAddingMilestone, setIsAddingMilestone] = useState(false)
  const [milestoneDate, setMilestoneDate] = useState(selected)
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dayRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!isAddingMilestone) return
    const dialog = dialogRef.current
    const opener = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = 'hidden'
    function trap(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !dialog) return
      const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea')]
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    dialog?.addEventListener('keydown', trap)
    return () => { dialog?.removeEventListener('keydown', trap); dialog?.close(); document.body.style.overflow = overflow; opener?.focus() }
  }, [isAddingMilestone])
  function openMilestone() { setMilestoneDate(selected); setError(''); setIsAddingMilestone(true) }
  async function run(action: string, work: () => Promise<void>) {
    if (pending) return
    setPending(action); setError('')
    try { await work() } catch (error) { setError(errorMessage(error)) } finally { setPending('') }
  }
  function moveMonth(offset: number) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1)
    setCursor(next); setSelected(dateKey(next))
  }
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const leading = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((leading + daysInMonth) / 7) * 7 }, (_, index) => index < leading || index >= leading + daysInMonth ? null : index - leading + 1)
  const selectedSessions = sessions.filter((session) => sessionDate(session.startedAt) === selected)
  const sessionMinutes = useMemo(() => {
    const totals = new Map<string, number>()
    for (const session of sessions) { const day = sessionDate(session.startedAt); totals.set(day, (totals.get(day) ?? 0) + session.durationSeconds / 60) }
    return totals
  }, [sessions])
  const milestoneDates = useMemo(() => new Set(milestones.map(item => item.date)), [milestones])
  const totalMinutes = Math.round(sessions.reduce((sum, session) => sum + session.durationSeconds, 0) / 60)
  const averageMinutes = sessions.length ? Math.round(sessions.reduce((sum, session) => sum + session.durationSeconds, 0) / 60 / sessions.length) : 0
  const mostPracticed = useMemo(() => pieceTotals(sessions)[0], [sessions])
  const upcoming = useMemo(() => milestones.filter((milestone) => milestone.date >= today).sort((a, b) => a.date.localeCompare(b.date)), [milestones, today])
  function chooseDay(day: number) { setSelected(dateKey(new Date(cursor.getFullYear(), cursor.getMonth(), day))) }
  async function addSession() { if (!newPieceId || !validMinutes(newMinutes)) return; await onCreateSession({ pieceId: newPieceId, durationSeconds: newMinutes * 60, date: new Date(`${selected}T12:00:00`).toISOString(), notes: newNotes.trim() || undefined }); setNewMinutes(30); setNewNotes('') }
  async function addMilestone() { if (!milestoneTitle.trim() || !milestoneDate) return; await onCreateMilestone({ title: milestoneTitle.trim(), date: milestoneDate, kind: milestoneKind, notes: milestoneNotes.trim() || undefined }); setMilestoneTitle(''); setMilestoneNotes(''); setIsAddingMilestone(false) }
  return <section className="full-view activity-view"><div className="activity-heading"><div><p className="eyebrow">PRACTICE JOURNAL</p><h1>Activity</h1><p className="subtitle">Edit each session, track your real minutes and mark the moments that matter.</p></div><button className="session-button" onClick={openMilestone}>+ Add milestone</button></div><div className="activity-grid"><section className="calendar-card"><div className="calendar-header"><button aria-label="Previous month" onClick={() => moveMonth(-1)}>&lt;</button><h2>{monthTitle(cursor)}</h2><button aria-label="Next month" onClick={() => moveMonth(1)}>&gt;</button></div><div className="calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((day, index) => { const key = day ? dateKey(new Date(cursor.getFullYear(), cursor.getMonth(), day)) : `blank-${index}`; const minutes = key && day ? Math.round(sessionMinutes.get(key) ?? 0) : 0; const hasMilestone = day ? milestoneDates.has(key) : false; return <button className={`calendar-day ${key === selected ? 'selected' : ''} ${key === today ? 'today' : ''}`} key={key} disabled={!day} aria-pressed={key === selected} aria-current={key === today ? 'date' : undefined} aria-label={day ? `${key}, ${minutes} minutes${hasMilestone ? ', milestone' : ''}` : undefined} onClick={() => day && chooseDay(day)}><span>{day ?? ''}</span>{minutes > 0 && <small>{minutes}m</small>}{hasMilestone && <i aria-label="Milestone" />}</button> })}</div><div className="calendar-legend"><span><b className="legend-practice" /> Practice</span><span><b className="legend-milestone" /> Milestone</span></div></section><section className="day-card" ref={dayRef} tabIndex={-1} aria-label="Selected day"><p className="eyebrow">SELECTED DAY</p><h2>{new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2><div className="day-total"><strong>{Math.round(selectedSessions.reduce((sum, session) => sum + session.durationSeconds, 0) / 60)} min</strong><span>{selectedSessions.length} {selectedSessions.length === 1 ? 'session' : 'sessions'}</span></div>{selectedSessions.length === 0 && <p className="activity-empty">No practice recorded for this date. Add a session below.</p>}{selectedSessions.map((session) => <SessionEditor key={session.id} session={session} catalog={catalog} onSave={async (id, input) => { await onUpdateSession(id, input); if (input.date) { const date = new Date(input.date); setSelected(dateKey(date)); setCursor(new Date(date.getFullYear(), date.getMonth(), 1)); dayRef.current?.focus() } }} onDelete={async id => { await onDeleteSession(id); dayRef.current?.focus() }} />)}<div className="add-session-box">{error && !isAddingMilestone && <p className="activity-error" role="alert">{error}</p>}<strong>Add practice from your repertoire</strong>{catalog.length === 0 ? <p className="activity-empty">Add a piece to your repertoire first.</p> : <><div><select aria-label="Repertoire piece" value={newPieceId} onChange={(event) => setNewPieceId(event.target.value)}><option value="">Choose a repertoire piece</option>{catalog.map((piece) => <option value={piece.id} key={piece.id}>{piece.title}</option>)}</select><input type="number" min="1" max="1440" value={newMinutes} onChange={(event) => setNewMinutes(Number(event.target.value))} aria-label="Practice minutes" /><button className="save-mini" disabled={!!pending || !newPieceId || !validMinutes(newMinutes)} onClick={() => void run('session', addSession)}>Add</button></div><textarea className="new-session-notes" aria-label="Session note (optional)" value={newNotes} onChange={(event) => setNewNotes(event.target.value)} placeholder="Session note (optional)" maxLength={500} /></>}</div></section></div><section className="insights-strip" aria-label="Practice insights"><article><span className="eyebrow">TOTAL MINUTES</span><strong>{totalMinutes}</strong><small>Across {sessions.length} sessions</small></article><article><span className="eyebrow">AVERAGE SESSION</span><strong>{averageMinutes}<small> min</small></strong><small>Keep building your rhythm</small></article><article><span className="eyebrow">MOST PRACTICED</span><strong>{mostPracticed?.title ?? '—'}</strong><small>{mostPracticed ? `${Math.round(mostPracticed.seconds / 60)} minutes logged` : 'No piece data yet'}</small></article><article><span className="eyebrow">UPCOMING</span><strong>{upcoming.length}</strong><small>{upcoming[0] ? `${upcoming[0].title} in ${Math.max(0, daysUntil(upcoming[0].date, today))} days` : 'Add an exam or concert'}</small></article></section><PracticeExtras sessions={sessions} /><section className="milestones-section"><div className="section-heading"><div><p className="eyebrow">MILESTONES</p><h2 id="milestones-heading" tabIndex={-1}>Exams, concerts and goals</h2></div><button className="text-button" onClick={openMilestone}>Add milestone -&gt;</button></div>{milestones.length === 0 && <p className="activity-empty">No milestones yet. Add a concert or exam to place it on your calendar.</p>}<div className="milestone-list">{milestones.map((milestone) => <article className={`milestone-card ${milestone.date < today ? 'past' : ''}`} key={milestone.id}><span className={`milestone-kind ${milestone.kind}`}>{milestone.kind}</span><div><strong>{milestone.title}</strong><small>{new Date(`${milestone.date}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })}{milestone.date >= today ? ` · ${daysUntil(milestone.date, today)} days` : ' · Past'}</small>{milestone.notes && <p>{milestone.notes}</p>}</div><button className="remove-piece" aria-label={`Delete ${milestone.title}`} disabled={!!pending} onClick={() => void run(milestone.id, async () => { await onDeleteMilestone(milestone.id); document.getElementById('milestones-heading')?.focus() })}>x</button></article>)}</div></section>{isAddingMilestone && <dialog ref={dialogRef} className="add-modal milestone-modal" aria-labelledby="milestone-title" onCancel={event => { event.preventDefault(); if (!pending) setIsAddingMilestone(false) }}><button className="modal-close" disabled={!!pending} aria-label="Close" onClick={() => setIsAddingMilestone(false)}>x</button><p className="eyebrow">PLAN A MOMENT</p><h2 id="milestone-title">Add a milestone</h2><label className="search-field">What are you preparing for?<input maxLength={200} value={milestoneTitle} onChange={(event) => setMilestoneTitle(event.target.value)} placeholder="Spring recital" /></label><label className="search-field">Date<input type="date" value={milestoneDate} onChange={(event) => setMilestoneDate(event.target.value)} /></label><label className="search-field">Type<select value={milestoneKind} onChange={(event) => setMilestoneKind(event.target.value as Milestone['kind'])}><option value="concert">Concert</option><option value="exam">Exam</option><option value="audition">Audition</option><option value="event">Other event</option></select></label><label className="search-field">Notes<textarea value={milestoneNotes} onChange={(event) => setMilestoneNotes(event.target.value)} placeholder="Programme or preparation details" maxLength={500} /></label><button className="auth-submit" disabled={!!pending || !milestoneTitle.trim() || !milestoneDate} onClick={() => void run('milestone', addMilestone)}>Save milestone -&gt;</button>{error && <p className="activity-error" role="alert">{error}</p>}</dialog>}</section>
}
