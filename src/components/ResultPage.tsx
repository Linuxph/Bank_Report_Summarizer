import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import './ResultPage.css'
import { getAuthHeaders } from '../services/api'

function ResultPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [result, setResult] = useState<any>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // Get result from navigation state or localStorage
    const state = location.state as any
    if (state?.result) {
      setResult(state.result)
      localStorage.setItem('lastUploadResult', JSON.stringify(state.result))
    } else {
      // Try to get from localStorage
      const saved = localStorage.getItem('lastUploadResult')
      if (saved) {
        setResult(JSON.parse(saved))
      } else {
        setError('No upload result found. Please upload a file first.')
      }
    }
  }, [location])

  const handleDownloadReport = async () => {
    setIsDownloading(true)
    setError('')

    try {
      // Download the processed report from backend
      const response = await fetch('/api/reports/download-report', {
        method: 'POST',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ data: result }),
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bank_report_${new Date().getTime()}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleGetSummary = () => {
    setIsGeneratingSummary(true)
    setError('')
    navigate('/summary', {
      state: {
        originalData: result,
        source: 'upload'
      }
    })
    setIsGeneratingSummary(false)
  }

  if (error && !result) {
    return (
      <div className="result-page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <Link to="/summarizer" className="btn btn-primary">
            Go Back to Upload
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="result-page">
      <header className="result-header">
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
          <Link to="/summarizer" className="nav-link">New Upload</Link>
        </nav>
      </header>

      <main className="result-content">
        <h1>Processing Result</h1>
        <p>Your bank report has been processed successfully</p>

        <div className="result-actions">
          <button
            className="btn btn-primary"
            onClick={handleGetSummary}
            disabled={isGeneratingSummary || !result}
          >
            {isGeneratingSummary ? (
              <span>Generating Summary...</span>
            ) : (
              <span>Get Summary Report</span>
            )}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleDownloadReport}
            disabled={isDownloading || !result}
          >
            {isDownloading ? (
              <span>Downloading...</span>
            ) : (
              <span>Download Report</span>
            )}
          </button>
        </div>

        <div className="result-data">
          <h2>Processed Data</h2>
          <div className="result-table-container">
            <ResultDataTable result={result} />
          </div>
        </div>

        <div className="result-footer">
          <button
            className="btn btn-outline"
            onClick={() => navigate('/summarizer')}
          >
            Upload Another File
          </button>
        </div>
      </main>
    </div>
  )
}

function ResultDataTable({ result }: { result: any }) {
  const transactions = result?.transactions || result?.data || result?.records || []
  const summary = result?.summary || result

  // Build summary rows from top-level keys (excluding transactions)
  const summaryRows = Object.keys(summary || {})
    .filter(key => !['transactions', 'data', 'records', 'rawData'].includes(key))
    .map(key => ({
      field: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: typeof summary[key] === 'object' ? JSON.stringify(summary[key]) : String(summary[key])
    }))

  // For transactions, show a table
  const hasTransactions = Array.isArray(transactions) && transactions.length > 0

  if (hasTransactions) {
    const columns = Object.keys(transactions[0] || {})

    return (
      <div className="result-table-wrapper">
        {/* Summary section */}
        {summaryRows.length > 0 && (
          <div className="summary-grid">
            {summaryRows.map((row, i) => (
              <div key={i} className="summary-item">
                <span className="summary-label">{row.field}</span>
                <span className="summary-value">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        <h3>Transactions</h3>
        <div className="table-wrapper">
          <table className="result-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col}>{col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((row: any, i: number) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col} title={String(row[col])}>
                      {String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // No transactions - show summary rows as table
  if (summaryRows.length > 0) {
    return (
      <div className="table-wrapper">
        <table className="result-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row, i) => (
              <tr key={i}>
                <td>{row.field}</td>
                <td title={row.value}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Fallback
  return (
    <div className="no-data">
      <p>No structured data available</p>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  )
}

export default ResultPage
