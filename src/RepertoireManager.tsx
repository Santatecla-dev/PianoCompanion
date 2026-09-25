import { useMemo, useState } from 'react'
import './RepertoireManager.css'

export type ManagerPiece = { id?: string; title: string; composer: string; level: string; progress: number; tone: string; symbol: string }
type Props = { catalog: ManagerPiece[]; repertoire: ManagerPiece[]; selectedPiece?: ManagerPiece | null; onAdd: (piece: ManagerPiece) => void; onRemove: (piece: ManagerPiece) => void; onUpdate: (piece: ManagerPiece, progress: number) => void; onUse: (piece: ManagerPiece) => void }

export function RepertoireManager({ catalog, repertoire, selectedPiece, onAdd, onRemove, onUpdate, onUse }: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const [addMode, setAddMode] = useState<'catalog' | 'personal'>('catalog')
  const [query, setQuery] = useState('')
  const [composer, setComposer] = useState('All composers')
  const [difficulty, setDifficulty] = useState('All levels')
  const [customTitle, setCustomTitle] = useState('')
  const [customComposer, setCustomComposer] = useState('')
  const selectedIds = new Set(repertoire.map((piece) => piece.id ?? piece.title))
  const composers = useMemo(() => Array.from(new Set(catalog.map((piece) => piece.composer))).sort(), [catalog])
  const difficulties = useMemo(() => Array.from(new Set(catalog.map((piece) => piece.level))).sort(), [catalog])
  const filtered = useMemo(() => catalog.filter((piece) => {
    const q = query.toLowerCase().trim()
    const matchesText = !q || piece.title.toLowerCase().includes(q) || piece.composer.toLowerCase().includes(q)
    return matchesText && (composer === 'All composers' || piece.composer === composer) && (difficulty === 'All levels' || piece.level === difficulty)
  }), [catalog, composer, difficulty, query])

  function addCustom() {
    if (!customTitle.trim()) return
    onAdd({ id: `custom-${Date.now()}`, title: customTitle.trim(), composer: customComposer.trim() || 'My own piece', level: 'Personal', progress: 0, tone: 'sand', symbol: 'M' })
    setCustomTitle(''); setCustomComposer(''); setIsAdding(false)
  }
  function openModal() { setAddMode('catalog'); setQuery(''); setComposer('All composers'); setDifficulty('All levels'); setIsAdding(true) }

  return <section className="full-view repertoire-manager"><div className="manager-heading"><div><p className="eyebrow">MY MUSIC</p><h1>My repertoire</h1><p className="subtitle">Only the pieces you choose appear in your practice dashboard.</p></div><button className="session-button" onClick={openModal}>+ Add a piece</button></div><div className="manager-layout"><section className="manager-list"><div className="section-heading"><h2>Selected pieces <span className="count-badge">{repertoire.length}</span></h2></div>{repertoire.length === 0 && <div className="empty-repertoire"><span>♪</span><strong>Your repertoire is empty</strong><p>Choose a catalogue piece or add a personal one.</p><button className="text-button" onClick={openModal}>Add your first piece -&gt;</button></div>}      {repertoire.map((piece) => {
        const isCurrentFocus = (selectedPiece?.id ?? selectedPiece?.title) === (piece.id ?? piece.title)
        return (
          <article className={`managed-piece ${isCurrentFocus ? 'current-focus' : ''}`} key={piece.id ?? piece.title}>
            <div className={`piece-thumb ${piece.tone}`}>{piece.symbol}</div>
            <div className="piece-name">
              <div className="piece-title-row">
                <strong>{piece.title}</strong>
                {isCurrentFocus && <span className="current-focus-badge">Active focus</span>}
              </div>
              <span>{piece.composer} - {piece.level}{piece.id?.startsWith('custom-') ? ' - Personal' : ''}</span>
            </div>
            <div className="managed-progress">
              <div>
                <label htmlFor={`progress-${piece.id ?? piece.title}`}>Progress</label>
                <output>{piece.progress}%</output>
              </div>
              <input id={`progress-${piece.id ?? piece.title}`} type="range" min="0" max="100" value={piece.progress} onChange={(event) => onUpdate(piece, Number(event.target.value))} aria-label={`${piece.title} progress`} />
            </div>
            <button className={`text-button use-piece ${isCurrentFocus ? 'active-focus-btn' : ''}`} onClick={() => onUse(piece)}>
              {isCurrentFocus ? 'Practicing' : 'Practice'} <span aria-hidden="true">-&gt;</span>
            </button>
            <button className="remove-piece" aria-label={`Remove ${piece.title}`} onClick={() => onRemove(piece)}>x</button>
          </article>
        )
      })}</section><aside className="repertoire-tip"><span className="tip-icon">*</span><strong>Your space, your music</strong><p>Catalogue pieces are shared classics. Personal pieces stay only in this browser and are never added to the global catalogue.</p></aside></div>{isAdding && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAdding(false) }}><section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-piece-title"><button className="modal-close" aria-label="Close" onClick={() => setIsAdding(false)}>x</button><p className="eyebrow">EXPAND YOUR MUSIC</p><h2 id="add-piece-title">Add a piece</h2><div className="add-tabs"><button className={addMode === 'catalog' ? 'active' : ''} onClick={() => setAddMode('catalog')}>Classical catalogue</button><button className={addMode === 'personal' ? 'active' : ''} onClick={() => setAddMode('personal')}>Personal piece</button></div>{addMode === 'catalog' ? <><label className="search-field">Search by title or composer<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Chopin, Ballade, Nocturne..." /></label><div className="filter-row"><select value={composer} onChange={(event) => setComposer(event.target.value)} aria-label="Filter by composer"><option>All composers</option>{composers.map((item) => <option key={item}>{item}</option>)}</select><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} aria-label="Filter by difficulty"><option>All levels</option>{difficulties.map((item) => <option key={item}>{item}</option>)}</select></div><div className="catalog-results">{filtered.map((piece) => <button className="catalog-result" key={piece.id ?? piece.title} disabled={selectedIds.has(piece.id ?? piece.title)} onClick={() => onAdd(piece)}><span className={`piece-thumb ${piece.tone}`}>{piece.symbol}</span><span><strong>{piece.title}</strong><small>{piece.composer} - {piece.level}</small></span><b>{selectedIds.has(piece.id ?? piece.title) ? 'Added' : '+'}</b></button>)}{filtered.length === 0 && <p className="empty-search">No catalogue pieces match those filters.</p>}</div></> : <div className="custom-fields personal-fields"><p>Add something that is not in the shared catalogue. It will stay local to your account and browser.</p><label>Piece title<input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder="My new piece" /></label><label>Composer or source<input value={customComposer} onChange={(event) => setCustomComposer(event.target.value)} placeholder="Composer (optional)" /></label><button className="auth-submit" onClick={addCustom} disabled={!customTitle.trim()}>Add personal piece <span aria-hidden="true">-&gt;</span></button></div>}</section></div>}</section>
}
