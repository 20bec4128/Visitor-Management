import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import './ListPageToolbar.css'

// Reads the rendered table inside the same card as the toolbar, skipping the
// "Action" column and empty-state rows. Returns headers + row text + a title.
function readTable(rootEl) {
  const card = rootEl?.closest('.vm-card') || rootEl?.closest('section')
  const table = card?.querySelector('table')
  if (!table) return null

  const keep = []
  const headers = []
  Array.from(table.querySelectorAll('thead th')).forEach((th, i) => {
    const label = (th.textContent || '').trim()
    if (!label || /^actions?$/i.test(label)) return
    keep.push(i)
    headers.push(label)
  })

  const rows = []
  Array.from(table.querySelectorAll('tbody tr')).forEach((tr) => {
    const cells = Array.from(tr.children)
    if (cells.length <= 1) return // skip "No data" placeholder rows
    rows.push(keep.map((i) => (cells[i] ? (cells[i].textContent || '').trim().replace(/\s+/g, ' ') : '')))
  })

  const title = (card?.querySelector('h2')?.textContent || 'export').trim()
  return { headers, rows, title }
}

function safeFileName(s) {
  return (s || 'export').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export'
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconColumns() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h16v14H4z" stroke="currentColor" strokeWidth="2" />
      <path d="M10 5v14M16 5v14" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ListPageToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search',
  onExcel,
  onPdf,
  columns = [],
  visibleColumns = {},
  onToggleColumn,
}) {
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [columnOpen, setColumnOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [columnPos, setColumnPos] = useState({ top: 0, right: 0 })
  const rootRef = useRef(null)
  const columnBtnRef = useRef(null)
  const columnPanelRef = useRef(null)

  const flash = (msg) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 1800)
  }

  const toggleColumns = () => {
    setColumnOpen((open) => {
      const next = !open
      if (next && columnBtnRef.current) {
        const r = columnBtnRef.current.getBoundingClientRect()
        setColumnPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) })
      }
      return next
    })
  }

  // Close the (portaled) column panel on outside click or Escape.
  useEffect(() => {
    if (!columnOpen) return undefined
    const onPointer = (e) => {
      if (columnBtnRef.current?.contains(e.target)) return
      if (columnPanelRef.current?.contains(e.target)) return
      setColumnOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setColumnOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [columnOpen])

  const handleExcel = () => {
    setDownloadOpen(false)
    if (onExcel) return onExcel()
    const data = readTable(rootRef.current)
    if (!data || data.rows.length === 0) return flash('No data to export')
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [data.headers, ...data.rows].map((r) => r.map(esc).join(',')).join('\r\n')
    // Prepend BOM (U+FEFF) so Excel reads UTF-8 correctly.
    downloadFile(String.fromCharCode(0xfeff) + csv, `${safeFileName(data.title)}.csv`, 'text/csv;charset=utf-8;')
  }

  const handlePdf = () => {
    setDownloadOpen(false)
    if (onPdf) return onPdf()
    const data = readTable(rootRef.current)
    if (!data || data.rows.length === 0) return flash('No data to export')
    const win = window.open('', '_blank')
    if (!win) return flash('Allow pop-ups to export PDF')
    const thead = `<tr>${data.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`
    const tbody = data.rows
      .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
      .join('')
    win.document.write(
      `<!doctype html><html><head><title>${escapeHtml(data.title)}</title>` +
        '<style>body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#0f172a}' +
        'h1{font-size:18px;margin:0 0 16px}table{border-collapse:collapse;width:100%;font-size:12px}' +
        'th,td{border:1px solid #cbd5e1;padding:8px 10px;text-align:left}thead th{background:#f1f5f9}</style>' +
        `</head><body><h1>${escapeHtml(data.title)}</h1>` +
        `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>` +
        '<script>window.onload=function(){window.print()}</script></body></html>',
    )
    win.document.close()
  }

  const handleCopy = async () => {
    const data = readTable(rootRef.current)
    if (!data || data.rows.length === 0) return flash('No data to copy')
    const tsv = [data.headers, ...data.rows].map((r) => r.join('\t')).join('\n')
    try {
      await navigator.clipboard.writeText(tsv)
      flash('Copied to clipboard')
    } catch {
      flash('Copy failed')
    }
  }

  return (
    <div className="vm-card-toolbar vm-list-toolbar" ref={rootRef}>
      <div className="vm-list-toolbar-desktop">
        <div className="vm-toolbar-left">
          <button type="button" className="vm-btn vm-btn-soft vm-btn-soft-success" onClick={handleExcel}>
            Excel
          </button>
          <button type="button" className="vm-btn vm-btn-soft" onClick={handlePdf}>
            PDF
          </button>
          <button type="button" className="vm-btn vm-btn-soft" onClick={handleCopy}>
            Copy
          </button>
          {toast ? <span className="vm-toolbar-toast">{toast}</span> : null}
        </div>
        <div className="vm-toolbar-right">
          <div className="vm-column-dropdown">
            <button
              ref={columnBtnRef}
              type="button"
              className="vm-btn vm-btn-soft"
              onClick={toggleColumns}
            >
              Column visibility {columnOpen ? '▴' : '▾'}
            </button>
            {columnOpen && columns.length > 0
              ? createPortal(
                  <div
                    ref={columnPanelRef}
                    className="vm-column-panel vm-column-panel-fixed"
                    role="menu"
                    aria-label="Column visibility"
                    style={{ top: columnPos.top, right: columnPos.right }}
                  >
                    <div className="vm-popover-head">
                      <span className="vm-popover-title">Column visibility</span>
                      <button
                        type="button"
                        className="vm-popover-close"
                        aria-label="Close column visibility"
                        onClick={() => setColumnOpen(false)}
                      >
                        ×
                      </button>
                    </div>
                    {columns.map((column) => (
                      <label key={column.key} className="vm-column-option">
                        <input
                          type="checkbox"
                          checked={visibleColumns[column.key] !== false}
                          onChange={() => onToggleColumn?.(column.key)}
                        />
                        <span>{column.label}</span>
                      </label>
                    ))}
                  </div>,
                  document.body,
                )
              : null}
          </div>
          <input
            className="vm-input vm-search-input"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
          />
        </div>
      </div>

      <div className="vm-list-toolbar-mobile">
        <div className="vm-mobile-toolbar-row">
          <div className="vm-mobile-toolbar-left">
            <button
              type="button"
              className="vm-icon-btn"
              aria-label="Download"
              onClick={() => {
                setDownloadOpen((open) => !open)
                setSearchOpen(false)
                setColumnOpen(false)
              }}
            >
              <IconDownload />
            </button>
            <button
              type="button"
              className="vm-icon-btn"
              aria-label="Column visibility"
              onClick={() => {
                setColumnOpen((open) => !open)
                setDownloadOpen(false)
                setSearchOpen(false)
              }}
            >
              <IconColumns />
            </button>
          </div>
          <div className="vm-mobile-toolbar-right">
            <button
              type="button"
              className="vm-icon-btn"
              aria-label="Search"
              onClick={() => {
                setSearchOpen((open) => !open)
                setDownloadOpen(false)
                setColumnOpen(false)
              }}
            >
              <IconSearch />
            </button>
          </div>
        </div>

        {downloadOpen ? (
          <div className="vm-toolbar-popover" role="menu" aria-label="Download options">
            <div className="vm-toolbar-popover-actions">
              <button type="button" className="vm-btn vm-btn-soft vm-btn-soft-success" onClick={handleExcel}>
                Excel
              </button>
              <button type="button" className="vm-btn vm-btn-soft" onClick={handlePdf}>
                PDF
              </button>
              <button type="button" className="vm-btn vm-btn-soft" onClick={() => { setDownloadOpen(false); handleCopy() }}>
                Copy
              </button>
            </div>
          </div>
        ) : null}

        {columnOpen && columns.length > 0 ? (
          <div className="vm-toolbar-popover" role="menu" aria-label="Column visibility options">
            <div className="vm-popover-head">
              <span className="vm-popover-title">Column visibility</span>
              <button
                type="button"
                className="vm-popover-close"
                aria-label="Close column visibility"
                onClick={() => setColumnOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="vm-column-chooser">
              {columns.map((column) => (
                <label key={column.key} className="vm-column-option">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.key] !== false}
                    onChange={() => onToggleColumn?.(column.key)}
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {searchOpen ? (
          <div className="vm-mobile-search-wrap">
            <input
              className="vm-input vm-search-input"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={onSearchChange}
              autoFocus
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ListPageToolbar
