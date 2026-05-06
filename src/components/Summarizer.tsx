import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Summarizer.css'

// Set VITE_AI_BASE_URL to your Render AI service URL in production
// Leave empty in dev — Vite proxy rewrites /ai/* → http://localhost:8000/*
const AI_BASE = import.meta.env.VITE_AI_BASE_URL ?? '/ai'

interface ProgressLine {
  icon: string
  text: string
  highlight?: boolean
}

function Summarizer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string>('')
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [progressLines, setProgressLines] = useState<ProgressLine[]>([])
  const [totalPages, setTotalPages] = useState<number>(0)
  const [pagesScanned, setPagesScanned] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const MAX_FILE_SIZE = 50 * 1024 * 1024

  const addLine = (line: ProgressLine) => {
    setProgressLines(prev => {
      const next = [...prev, line]
      // auto-scroll after render
      setTimeout(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
      }, 30)
      return next
    })
  }

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))
      return 'Invalid file type. Please upload a PDF file.'
    if (file.size > MAX_FILE_SIZE)
      return `File too large. Maximum size is 50 MB (yours: ${(file.size / 1024 / 1024).toFixed(1)} MB).`
    return null
  }

  const handleFiles = (files: FileList | File[]) => {
    const file = Array.from(files)[0]
    if (!file) return
    const err = validateFile(file)
    if (err) { setUploadError(err); return }
    setSelectedFile(file)
    setUploadError('')
    uploadFile(file)
  }

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false) }
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files)
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setUploadError('')
    setProgressLines([])
    setPagesScanned(0)
    setTotalPages(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${AI_BASE}/process-pdf-stream`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok || !response.body) {
        let msg = `Upload failed (HTTP ${response.status})`
        try { const j = await response.json(); if (j?.detail) msg = j.detail } catch { /* ignore */ }
        throw new Error(msg)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalResult: object | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE lines: "data: {...}\n\n"
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data:')) continue
          const raw = line.slice(5).trim()
          let evt: Record<string, unknown>
          try { evt = JSON.parse(raw) } catch { continue }

          switch (evt.type) {
            case 'start': {
              const tp = evt.total_pages as number
              setTotalPages(tp)
              addLine({ icon: '📄', text: `PDF loaded — ${tp} page${tp === 1 ? '' : 's'} detected` })
              addLine({ icon: '🔍', text: 'Scanning pages in parallel…' })
              break
            }
            case 'page': {
              const pg = evt.page as number
              const tf = evt.tables_found as number
              const skipped = evt.skipped as boolean
              setPagesScanned(p => p + 1)
              if (!skipped && tf > 0) {
                addLine({
                  icon: '✅',
                  text: `Page ${pg} — ${tf} financial table${tf > 1 ? 's' : ''} found`,
                  highlight: true,
                })
              } else if (!skipped) {
                addLine({ icon: '➖', text: `Page ${pg} — no relevant tables` })
              }
              break
            }
            case 'analysis': {
              const risk = (evt.overall_risk as string) || 'UNKNOWN'
              const color = risk === 'HIGH' ? '🔴' : risk === 'MODERATE' ? '🟡' : '🟢'
              addLine({ icon: '📊', text: 'Running financial risk analysis…' })
              addLine({ icon: color, text: `Overall Risk: ${risk}`, highlight: true })
              break
            }
            case 'done': {
              addLine({ icon: '✨', text: 'Analysis complete! Loading results…', highlight: true })
              finalResult = {
                filename: evt.filename,
                financial_tables_found: evt.financial_tables_found,
                structured_rows: evt.structured_rows,
                analysis: evt.analysis,
              }
              break
            }
            case 'error': {
              throw new Error(evt.message as string || 'Processing error')
            }
          }
        }
      }

      if (finalResult) {
        setTimeout(() => {
          navigate('/result', { state: { result: finalResult, filename: file.name } })
        }, 600)
      } else {
        throw new Error('Stream ended without a result.')
      }

    } catch (error) {
      if (error instanceof TypeError) {
        setUploadError(
          'Cannot reach the AI server. ' +
          (import.meta.env.DEV
            ? 'Start it with: cd AI && python -m uvicorn main:app --port 8000 --reload'
            : 'The AI service may be starting up — please wait a moment and try again.')
        )

      } else {
        setUploadError(error instanceof Error ? error.message : 'Upload failed')
      }
    } finally {
      setIsUploading(false)
    }
  }

  const progressPct = totalPages > 0 ? Math.round((pagesScanned / totalPages) * 100) : 0

  return (
    <div className="summarizer-page">
      <header className="header">
        <div className="logo">
          <Link to="/">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#1a5f4a"/>
              <path d="M8 12h16M8 16h12M8 20h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </Link>
          <span>BankReport AI</span>
        </div>
        <nav>
          <Link to="/" className="nav-link">Home</Link>
        </nav>
      </header>

      <main className="summarizer-content">
        <h1>Upload Your Bank Report</h1>
        <p>Drop a PDF bank audit report — the AI will analyse it instantly</p>

        <div
          className={`upload-zone ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'uploading-zone' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />

          {isUploading ? (
            <div className="upload-progress">
              {/* Spinner + headline */}
              <div className="ai-spinner">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <circle cx="28" cy="28" r="24" stroke="rgba(74,222,128,0.2)" strokeWidth="4"/>
                  <path d="M28 4a24 24 0 0 1 24 24" stroke="#4ade80" strokeWidth="4" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="uploading-label">Analysing with AI…</p>

              {/* Progress bar */}
              {totalPages > 0 && (
                <div className="stream-progress-bar-wrap">
                  <div
                    className="stream-progress-bar-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                  <span className="stream-progress-label">
                    {pagesScanned} / {totalPages} pages
                  </span>
                </div>
              )}

              {/* Live log feed */}
              {progressLines.length > 0 && (
                <div className="stream-log" ref={logRef}>
                  {progressLines.map((l, i) => (
                    <div key={i} className={`stream-log-line${l.highlight ? ' highlight' : ''}`}>
                      <span className="log-icon">{l.icon}</span>
                      <span>{l.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : selectedFile ? (
            <div className="file-list">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"
                  stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div className="selected-file">
                <span>{selectedFile.name}</span>
                <span className="file-size">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
              <p className="upload-more">Click to choose a different file</p>
            </div>
          ) : (
            <>
              <div className="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p>Drop files here or click to upload</p>
              <span className="supported-formats">PDF only · Max 50 MB · Powered by AI</span>
            </>
          )}

          {uploadError && (
            <div className="error-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Summarizer
