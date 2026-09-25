import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Milestone, PracticeSession } from './api'
import type { Piece } from './App'
import './ActivityView.css'

type SessionInput = { pieceId?: string; durationSeconds: number; date: string; notes?: string }
type SessionUpdate = { pieceId?: string | null; durationSeconds?: number; date?: string; notes?: string | null }
type Props = {
  sessions: PracticeSession[]
  milestones: Milestone[]
  catalog: Piece[]
  onCreateSession: (input: SessionInput) => Promise<void>
  onUpdateSession: (id: string, input: SessionUpdate) => Promise<void>
  onDeleteSession: (id: string) => Promise<void>
  onCreateMilestone: (input: { title: string; date: string; kind: Milestone['kind']; notes?: string }) => Promise<void>
  onDeleteMilestone: (id: string) => Promise<void>
}
type ChecklistItem = { id: number; label: string; done: boolean }

const pad = (value: number) => value.toString().padStart(2, '0')
function dateKey(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
function sessionDate(value: string) { return dateKey(new Date(value)) }
function todayKey() { return dateKey(new Date()) }
function monthTitle(date: Date) { return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }
function daysUntil(date: string) {
  return Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${todayKey()}T12:00:00`).getTime()) / 86400000)
}

function SessionEditor({ session, catalog, onSave, onDelete }: { session: PracticeSession; catalog: Piece[]; onSave: Props['onUpdateSession']; onDelete: Props['onDeleteSession'] }) {
  const [date, setDate] = useState(sessionDate(session.startedAt))
  const [minutes, setMinutes] = useState(Math.max(1, Math.round(session.durationSeconds / 60)))
  const [pieceId, setPieceId] = useState(session.piece?.id ?? '')
  const [notes, setNotes] = useState(session.notes ?? '')
  const [saving, setSaving] = useState(false)
  const pieceSelectId = useId()
  const dateInputId = useId()
  const minutesInputId = useId()
  const notesTextareaId = useId()

  async function save() {
    setSaving(true)
    await onSave(session.id, {
      date: `${date}T12:00:00`,
      durationSeconds: minutes * 60,
      pieceId: pieceId || null,
      notes: notes.trim() || null
    })
    setSaving(false)
  }

  return (
    <article className="activity-session">
      <div className="activity-session-title">
        <span className="activity-dot" aria-hidden="true" />
        <strong>{session.piece?.title ?? 'Unassigned session'}</strong>
        <button className="activity-delete" type="button" aria-label="Delete practice session" onClick={() => void onDelete(session.id)}>
          x
        </button>
      </div>
      <div className="activity-session-fields">
        <label htmlFor={dateInputId}>
          Date
          <input id={dateInputId} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label htmlFor={pieceSelectId}>
          Piece
          <select id={pieceSelectId} value={pieceId} onChange={(event) => setPieceId(event.target.value)}>
            {!pieceId && <option value="" disabled>Choose from repertoire</option>}
            {catalog.map((piece) => <option value={piece.id} key={piece.id}>{piece.title}</option>)}
          </select>
        </label>
        <label htmlFor={minutesInputId}>
          Minutes
          <input
            id={minutesInputId}
            type="number"
            min="1"
            max="1440"
            value={minutes}
            onChange={(event) => setMinutes(Math.max(1, Number(event.target.value)))}
          />
        </label>
        <button type="button" className="save-mini" disabled={saving || !pieceId} onClick={() => void save()}>
          {saving ? '...' : 'Save'}
        </button>
      </div>
      <label className="session-notes" htmlFor={notesTextareaId}>
        Practice notes
        <textarea
          id={notesTextareaId}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="What did you work on?"
          maxLength={500}
        />
      </label>
    </article>
  )
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

const PALETTE = ['#8d6b99', '#b999c1', '#bd8b4b', '#83a3a3', '#b56c75', '#c9a9cf', '#a48ab2']

function PracticeExtras({ sessions }: { sessions: PracticeSession[] }) {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    const saved = window.localStorage.getItem('piano-companion-activity-checklist')
    return saved ? JSON.parse(saved) as ChecklistItem[] : initialChecklist
  })
  const [newItem, setNewItem] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.localStorage.setItem('piano-companion-activity-checklist', JSON.stringify(items))
  }, [items])

  const breakdown = useMemo(() => {
    const totals = new Map<string, number>()
    sessions.forEach((session) => {
      const title = session.piece?.title ?? 'General practice'
      totals.set(title, (totals.get(title) ?? 0) + session.durationSeconds)
    })
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [sessions])

  const total = breakdown.reduce((sum, [, seconds]) => sum + seconds, 0)
  const slices = breakdown.reduce<{ title: string; seconds: number; start: number; end: number; color: string }[]>((result, [title, seconds], index) => {
    const start = result.at(-1)?.end ?? 0
    const end = start + (total ? (seconds / total) * 100 : 0)
    result.push({
      title,
      seconds,
      start,
      end,
      color: PALETTE[index % PALETTE.length]
    })
    return result
  }, [])

  function addItem() {
    if (!newItem.trim()) return
    setItems((current) => [...current, { id: Date.now(), label: newItem.trim(), done: false }])
    setNewItem('')
  }

  function handleChecklistKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      if (newItem) {
        setNewItem('')
        event.stopPropagation()
      } else {
        inputRef.current?.blur()
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      addItem()
    }
  }

  return (
    <div className="activity-extra-grid">
      <section className="practice-checklist" aria-labelledby="checklist-title">
        <div className="extra-heading">
          <div>
            <p className="eyebrow">TODAY&apos;S ROUTINE</p>
            <h2 id="checklist-title">Practice checklist</h2>
          </div>
          <span>{items.filter((item) => item.done).length}/{items.length}</span>
        </div>
        <div className="checklist-items" tabIndex={0} role="region" aria-label="Routine items list">
          {items.map((item) => (
            <label className={`checklist-item ${item.done ? 'done' : ''}`} key={item.id}>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry))}
              />
              <span>{item.label}</span>
              <button
                type="button"
                aria-label={`Remove ${item.label}`}
                onClick={(e) => {
                  e.preventDefault()
                  setItems((current) => current.filter((entry) => entry.id !== item.id))
                }}
              >
                x
              </button>
            </label>
          ))}
        </div>
        <div className="checklist-add">
          <input
            ref={inputRef}
            value={newItem}
            onChange={(event) => setNewItem(event.target.value)}
            onKeyDown={handleChecklistKeyDown}
            placeholder="Add a practice task"
            aria-label="New checklist item"
          />
          <button type="button" onClick={addItem}>Add</button>
        </div>
      </section>

      <section className="breakdown-card" aria-labelledby="breakdown-title">
        <div className="extra-heading">
          <div>
            <p className="eyebrow">PRACTICE DISTRIBUTION</p>
            <h2 id="breakdown-title">Time by piece</h2>
          </div>
          <span>{Math.round(total / 60)} min</span>
        </div>
        {slices.length === 0 ? (
          <p className="activity-empty">Save a session to see your distribution.</p>
        ) : (
          <div className="pie-layout">
            <div
              className="pie-chart"
              style={{ background: `conic-gradient(${slices.map((slice) => `${slice.color} ${slice.start}% ${slice.end}%`).join(', ')})` }}
              role="img"
              aria-label="Practice time distribution pie chart"
            >
              <div className="pie-center">
                <strong>{slices.length}</strong>
                <small>{slices.length === 1 ? 'piece' : 'pieces'}</small>
              </div>
            </div>
            <div className="pie-legend">
              {slices.map((slice) => (
                <div key={slice.title}>
                  <i style={{ background: slice.color }} aria-hidden="true" />
                  <span title={slice.title}>{slice.title}</span>
                  <strong>{Math.round((slice.seconds / 60))}m ({Math.round(slice.end - slice.start)}%)</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export function ActivityView({ sessions, milestones, catalog, onCreateSession, onUpdateSession, onDeleteSession, onCreateMilestone, onDeleteMilestone }: Props) {
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

  const milestoneDialogRef = useRef<HTMLDialogElement>(null)
  const milestoneOpenerRef = useRef<HTMLElement | null>(null)
  const firstMilestoneFieldRef = useRef<HTMLInputElement>(null)

  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const leading = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: leading + daysInMonth }, (_, index) => index < leading ? null : index - leading + 1)

  const selectedSessions = useMemo(() => sessions.filter((session) => sessionDate(session.startedAt) === selected), [sessions, selected])
  const sessionMinutes = useMemo(() => {
    const map = new Map<string, number>()
    sessions.forEach((item) => {
      const key = sessionDate(item.startedAt)
      map.set(key, (map.get(key) ?? 0) + item.durationSeconds / 60)
    })
    return map
  }, [sessions])

  const totalMinutes = useMemo(() => Math.round(sessions.reduce((sum, session) => sum + session.durationSeconds, 0) / 60), [sessions])
  const averageMinutes = useMemo(() => (sessions.length ? Math.round(totalMinutes / sessions.length) : 0), [sessions, totalMinutes])

  const mostPracticed = useMemo(() => {
    const totals = new Map<string, number>()
    sessions.forEach((session) => {
      const title = session.piece?.title ?? 'General practice'
      totals.set(title, (totals.get(title) ?? 0) + session.durationSeconds)
    })
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0]
  }, [sessions])

  const upcoming = useMemo(() => {
    return milestones
      .filter((milestone) => milestone.date >= todayKey())
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [milestones])

  function chooseDay(day: number) {
    setSelected(dateKey(new Date(cursor.getFullYear(), cursor.getMonth(), day)))
  }

  function openMilestoneModal() {
    milestoneOpenerRef.current = document.activeElement as HTMLElement | null
    setIsAddingMilestone(true)
  }

  function closeMilestoneModal() {
    setIsAddingMilestone(false)
  }

  useEffect(() => {
    if (!isAddingMilestone) return undefined
    const dialog = milestoneDialogRef.current
    const opener = milestoneOpenerRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
    }
    firstMilestoneFieldRef.current?.focus()

    function trapFocus(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMilestoneModal()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea'))
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    dialog?.addEventListener('keydown', trapFocus)
    return () => {
      dialog?.removeEventListener('keydown', trapFocus)
      if (dialog && dialog.open) {
        dialog.close()
      }
      opener?.focus()
    }
  }, [isAddingMilestone])

  async function addSession() {
    if (!newPieceId) return
    await onCreateSession({
      pieceId: newPieceId,
      durationSeconds: newMinutes * 60,
      date: `${selected}T12:00:00`,
      notes: newNotes.trim() || undefined
    })
    setNewMinutes(30)
    setNewNotes('')
  }

  async function addMilestone() {
    if (!milestoneTitle.trim()) return
    await onCreateMilestone({
      title: milestoneTitle.trim(),
      date: selected,
      kind: milestoneKind,
      notes: milestoneNotes.trim() || undefined
    })
    setMilestoneTitle('')
    setMilestoneNotes('')
    closeMilestoneModal()
  }

  const selectedDateObject = useMemo(() => new Date(`${selected}T12:00:00`), [selected])

  return (
    <section className="full-view activity-view">
      <div className="activity-heading">
        <div>
          <p className="eyebrow">PRACTICE JOURNAL</p>
          <h1>Activity</h1>
          <p className="subtitle">Edit each session, track your real minutes and mark the moments that matter.</p>
        </div>
        <button type="button" className="session-button" onClick={openMilestoneModal}>
          + Add milestone
        </button>
      </div>

      <div className="activity-grid">
        <section className="calendar-card" aria-label="Practice calendar">
          <div className="calendar-header">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              &lt;
            </button>
            <h2>{monthTitle(cursor)}</h2>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              &gt;
            </button>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid" role="grid" aria-label="Month days">
            {cells.map((day, index) => {
              const key = day ? dateKey(new Date(cursor.getFullYear(), cursor.getMonth(), day)) : `blank-${index}`
              const minutes = key && day ? Math.round(sessionMinutes.get(key) ?? 0) : 0
              const hasMilestone = day ? milestones.some((milestone) => milestone.date === key) : false
              const isSelected = key === selected
              const isToday = key === todayKey()

              return (
                <button
                  type="button"
                  className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  key={key}
                  disabled={!day}
                  aria-selected={isSelected}
                  aria-label={day ? `${day} ${monthTitle(cursor)}${minutes > 0 ? `, ${minutes} minutes practiced` : ''}${hasMilestone ? ', has milestone' : ''}` : undefined}
                  onClick={() => day && chooseDay(day)}
                >
                  <span>{day ?? ''}</span>
                  {minutes > 0 && <b className="calendar-practice-dot" aria-hidden="true" />}
                  {minutes > 0 && <small>{minutes}m</small>}
                  {hasMilestone && <i aria-label="Milestone" />}
                </button>
              )
            })}
          </div>
          <div className="calendar-legend">
            <span><b className="legend-practice" aria-hidden="true" /> Practice</span>
            <span><b className="legend-milestone" aria-hidden="true" /> Milestone</span>
          </div>
        </section>

        <section className="day-card" aria-labelledby="selected-day-heading">
          <p className="eyebrow">SELECTED DAY</p>
          <h2 id="selected-day-heading">
            {selectedDateObject.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
          <div className="day-total">
            <strong>{Math.round(selectedSessions.reduce((sum, session) => sum + session.durationSeconds, 0) / 60)} min</strong>
            <span>{selectedSessions.length} {selectedSessions.length === 1 ? 'session' : 'sessions'}</span>
          </div>

          <div className="day-card-body">
            {selectedSessions.length === 0 && (
              <p className="activity-empty">No practice recorded for this date. Add a session below.</p>
            )}
            {selectedSessions.map((session) => (
              <SessionEditor
                key={session.id}
                session={session}
                catalog={catalog}
                onSave={onUpdateSession}
                onDelete={onDeleteSession}
              />
            ))}
            <div className="add-session-box">
              <strong>Add practice from your repertoire</strong>
              {catalog.length === 0 ? (
                <p className="activity-empty">Add a piece to your repertoire first.</p>
              ) : (
                <>
                  <div className="add-session-controls">
                    <select
                      value={newPieceId}
                      onChange={(event) => setNewPieceId(event.target.value)}
                      aria-label="Repertoire piece"
                    >
                      <option value="">Choose a repertoire piece</option>
                      {catalog.map((piece) => (
                        <option value={piece.id} key={piece.id}>
                          {piece.title}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={newMinutes}
                      onChange={(event) => setNewMinutes(Math.max(1, Number(event.target.value)))}
                      aria-label="Practice minutes"
                    />
                    <button type="button" className="save-mini" disabled={!newPieceId} onClick={() => void addSession()}>
                      Add
                    </button>
                  </div>
                  <textarea
                    className="new-session-notes"
                    value={newNotes}
                    onChange={(event) => setNewNotes(event.target.value)}
                    placeholder="Session note (optional)"
                    maxLength={500}
                    aria-label="Session note"
                  />
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="insights-strip" aria-label="Practice insights">
        <article>
          <span className="eyebrow">TOTAL MINUTES</span>
          <strong>{totalMinutes}</strong>
          <small>Across {sessions.length} sessions</small>
        </article>
        <article>
          <span className="eyebrow">AVERAGE SESSION</span>
          <strong>{averageMinutes}<small> min</small></strong>
          <small>Keep building your rhythm</small>
        </article>
        <article>
          <span className="eyebrow">MOST PRACTICED</span>
          <strong title={mostPracticed?.[0]}>{mostPracticed?.[0] ?? '—'}</strong>
          <small>{mostPracticed ? `${Math.round(mostPracticed[1] / 60)} minutes logged` : 'No piece data yet'}</small>
        </article>
        <article>
          <span className="eyebrow">UPCOMING</span>
          <strong>{upcoming.length}</strong>
          <small>
            {upcoming[0]
              ? `${upcoming[0].title} in ${Math.max(0, daysUntil(upcoming[0].date))} days`
              : 'Add an exam or concert'}
          </small>
        </article>
      </section>

      <PracticeExtras sessions={sessions} />

      <section className="milestones-section" aria-labelledby="milestones-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MILESTONES</p>
            <h2 id="milestones-heading">Exams, concerts and goals</h2>
          </div>
          <button type="button" className="text-button" onClick={openMilestoneModal}>
            Add milestone -&gt;
          </button>
        </div>
        {milestones.length === 0 && (
          <p className="activity-empty">No milestones yet. Add a concert or exam to place it on your calendar.</p>
        )}
        <div className="milestone-list">
          {milestones.map((milestone) => (
            <article className={`milestone-card ${milestone.date < todayKey() ? 'past' : ''}`} key={milestone.id}>
              <span className={`milestone-kind ${milestone.kind}`}>{milestone.kind}</span>
              <div>
                <strong>{milestone.title}</strong>
                <small>
                  {new Date(`${milestone.date}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  {milestone.date >= todayKey() ? ` · ${daysUntil(milestone.date)} days` : ' · Past'}
                </small>
                {milestone.notes && <p>{milestone.notes}</p>}
              </div>
              <button
                type="button"
                className="remove-piece"
                aria-label={`Delete ${milestone.title}`}
                onClick={() => void onDeleteMilestone(milestone.id)}
              >
                x
              </button>
            </article>
          ))}
        </div>
      </section>

      {isAddingMilestone && (
        <dialog
          ref={milestoneDialogRef}
          className="add-modal milestone-modal"
          aria-labelledby="milestone-title"
          onCancel={closeMilestoneModal}
        >
          <button type="button" className="modal-close" aria-label="Close" onClick={closeMilestoneModal}>
            x
          </button>
          <p className="eyebrow">PLAN A MOMENT</p>
          <h2 id="milestone-title">Add a milestone</h2>
          <label className="search-field">
            What are you preparing for?
            <input
              ref={firstMilestoneFieldRef}
              value={milestoneTitle}
              onChange={(event) => setMilestoneTitle(event.target.value)}
              placeholder="Spring recital"
            />
          </label>
          <label className="search-field">
            Date
            <input type="date" value={selected} onChange={(event) => setSelected(event.target.value)} />
          </label>
          <label className="search-field">
            Type
            <select value={milestoneKind} onChange={(event) => setMilestoneKind(event.target.value as Milestone['kind'])}>
              <option value="concert">Concert</option>
              <option value="exam">Exam</option>
              <option value="audition">Audition</option>
              <option value="event">Other event</option>
            </select>
          </label>
          <label className="search-field">
            Notes
            <textarea
              value={milestoneNotes}
              onChange={(event) => setMilestoneNotes(event.target.value)}
              placeholder="Programme or preparation details"
              maxLength={500}
            />
          </label>
          <button
            type="button"
            className="auth-submit"
            disabled={!milestoneTitle.trim()}
            onClick={() => void addMilestone()}
          >
            Save milestone -&gt;
          </button>
        </dialog>
      )}
    </section>
  )
}
