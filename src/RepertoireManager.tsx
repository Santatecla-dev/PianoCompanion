import { useEffect, useMemo, useRef, useState } from 'react'
import './RepertoireManager.css'

export type ManagerPiece = { id?: string; title: string; composer: string; level: string; progress: number; tone: string; symbol: string }
function pieceKey(piece: ManagerPiece) { return piece.id ?? `${piece.title}::${piece.composer}` }
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

type Props = { selectedPieceKey: string | null; catalog: ManagerPiece[]; repertoire: ManagerPiece[]; onAdd: (piece: ManagerPiece) => void; onRemove: (piece: ManagerPiece) => void; onUpdate: (piece: ManagerPiece, progress: number) => void; onUse: (piece: ManagerPiece) => void }

export function RepertoireManager({ selectedPieceKey, catalog, repertoire, onAdd, onRemove, onUpdate, onUse }: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!isAdding) return
    const dialog = dialogRef.current
    const opener = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !dialog) return
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]'))
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    dialog?.addEventListener('keydown', trapFocus)
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      dialog?.removeEventListener('keydown', trapFocus)
      document.body.style.overflow = previousOverflow
      opener?.focus()
    }
  }, [isAdding])
  const [addMode, setAddMode] = useState<'catalog' | 'personal'>('catalog')
  const [query, setQuery] = useState('')
  const [composer, setComposer] = useState('All composers')
  const [difficulty, setDifficulty] = useState('All levels')
  const [customTitle, setCustomTitle] = useState('')
  const [customComposer, setCustomComposer] = useState('')
  const selectedIds = new Set(repertoire.map((piece) => pieceKey(piece)))
  const composers = useMemo(() => Array.from(new Set(catalog.map((piece) => piece.composer))).sort(), [catalog])
  const difficulties = useMemo(() => Array.from(new Set(catalog.map((piece) => piece.level))).sort(), [catalog])
  const filtered = useMemo(() => catalog.filter((piece) => {
    const matchesText = normalizeSearch(`${piece.title} ${piece.composer}`).includes(normalizeSearch(query))
    return matchesText && (composer === 'All composers' || piece.composer === composer) && (difficulty === 'All levels' || piece.level === difficulty)
  }), [catalog, composer, difficulty, query])

  function addCustom() {
    if (!customTitle.trim()) return
    onAdd({ id: `custom-${Date.now()}`, title: customTitle.trim(), composer: customComposer.trim() || 'My own piece', level: 'Personal', progress: 0, tone: 'sand', symbol: 'M' })
    setCustomTitle(''); setCustomComposer(''); setIsAdding(false)
  }
  function openModal() { setAddMode('catalog'); setQuery(''); setComposer('All composers'); setDifficulty('All levels'); setIsAdding(true) }

  return <section className="full-view repertoire-manager"><div className="manager-heading"><div><p className="eyebrow">MY MUSIC</p><h1>My repertoire</h1><p className="subtitle">Only the pieces you choose appear in your practice dashboard.</p></div><button className="session-button" onClick={openModal}>+ Add a piece</button></div><div className="manager-layout"><section className="manager-list"><div className="section-heading"><h2>Selected pieces <span className="count-badge">{repertoire.length}</span></h2></div>{repertoire.length === 0 && <div className="empty-repertoire"><span>♪</span><strong>Your repertoire is empty</strong><p>Choose a catalogue piece or add a personal one.</p><button className="text-button" onClick={openModal}>Add your first piece -&gt;</button></div>}{repertoire.map((piece) => <article className={`managed-piece ${selectedPieceKey === pieceKey(piece) ? 'selected' : ''}`} key={pieceKey(piece)}><div className={`piece-thumb ${piece.tone}`}>{piece.symbol}</div><div className="piece-name"><strong>{piece.title}</strong><span>{piece.composer} - {piece.level}{piece.id?.startsWith('custom-') ? ' - Personal' : ''}</span>{selectedPieceKey === pieceKey(piece) && <span className="focus-label">Current focus</span>}</div><div className="managed-progress"><div><label htmlFor={`progress-${pieceKey(piece)}`}>Progress</label><output>{piece.progress}%</output></div><input id={`progress-${pieceKey(piece)}`} type="range" min="0" max="100" value={piece.progress} onChange={(event) => onUpdate(piece, Number(event.target.value))} aria-label={`${piece.title} progress`} /></div><button className="text-button use-piece" onClick={() => onUse(piece)}>{selectedPieceKey === pieceKey(piece) ? 'View focus' : 'Set as focus'} <span aria-hidden="true">-&gt;</span></button><button className="remove-piece" aria-label={`Remove ${piece.title}`} onClick={() => onRemove(piece)}>x</button></article>)}</section><aside className="repertoire-tip"><span className="tip-icon">*</span><strong>Your space, your music</strong><p>Catalogue pieces are shared classics. Personal pieces stay only in this browser and are never added to the global catalogue.</p></aside></div>{isAdding && <dialog ref={dialogRef} className="add-modal" aria-labelledby="add-piece-title" onCancel={() => setIsAdding(false)} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setIsAdding(false) } }}><button className="modal-close" aria-label="Close" onClick={() => setIsAdding(false)}>x</button><p className="eyebrow">EXPAND YOUR MUSIC</p><h2 id="add-piece-title">Add a piece</h2><div className="add-tabs"><button aria-pressed={addMode === 'catalog'} className={addMode === 'catalog' ? 'active' : ''} onClick={() => setAddMode('catalog')}>Classical catalogue</button><button aria-pressed={addMode === 'personal'} className={addMode === 'personal' ? 'active' : ''} onClick={() => setAddMode('personal')}>Personal piece</button></div>{addMode === 'catalog' ? <><label className="search-field">Search by title or composer<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Chopin, Ballade, Nocturne..." /></label><div className="filter-row"><select value={composer} onChange={(event) => setComposer(event.target.value)} aria-label="Filter by composer"><option>All composers</option>{composers.map((item) => <option key={item}>{item}</option>)}</select><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} aria-label="Filter by difficulty"><option>All levels</option>{difficulties.map((item) => <option key={item}>{item}</option>)}</select></div><div className="catalog-results">{filtered.map((piece) => <button className="catalog-result" key={pieceKey(piece)} disabled={selectedIds.has(pieceKey(piece))} onClick={() => onAdd(piece)}><span className={`piece-thumb ${piece.tone}`}>{piece.symbol}</span><span><strong>{piece.title}</strong><small>{piece.composer} - {piece.level}</small></span><b>{selectedIds.has(pieceKey(piece)) ? 'Added' : '+'}</b></button>)}{filtered.length === 0 && <p className="empty-search">No catalogue pieces match those filters.</p>}</div></> : <div className="custom-fields personal-fields"><p>Add something that is not in the shared catalogue. It will stay local to your account and browser.</p><label>Piece title<input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder="My new piece" /></label><label>Composer or source<input value={customComposer} onChange={(event) => setCustomComposer(event.target.value)} placeholder="Composer (optional)" /></label><button className="auth-submit" onClick={addCustom} disabled={!customTitle.trim()}>Add personal piece <span aria-hidden="true">-&gt;</span></button></div>}</dialog>}</section>
}
