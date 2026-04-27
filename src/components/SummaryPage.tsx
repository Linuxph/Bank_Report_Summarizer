import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import './SummaryPage.css'
import { getAuthHeaders } from '../services/api'

function SummaryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [summary, setSummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const state = location.state as any
    
    if (state?.originalData) {
      generateSummary(state.originalData)
    } else {
      // Try to get from localStorage
      const saved = localStorage.getItem('lastUploadResult')
      if (saved) {
        const data = JSON.parse(saved)
        generateSummary(data)
      } else {
        setError('No data available to generate summary')
        setIsLoading(false)
      }
    }
  }, [location])

  const generateSummary = async (data: any) => {
    setIsLoading(true)
    setError('')

    try {
      // Call backend to generate summary
      const response = await fetch('/api/reports/generate-summary', {
        method: 'POST',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ data }),
      })

      if (!response.ok) {
        throw new Error(`Summary generation failed: ${response.statusText}`)
      }

      const result = await response.json()
      setSummary(result)
    } catch (err) {
      // Fallback to a summary shaped like the Python API response.
      setSummary(generateClientSummary(data))
    } finally {
      setIsLoading(false)
    }
  }

  const generateClientSummary = (data: any) => {
    const metrics = data?.summary || {}
    const totalDeposits = metrics?.total_deposits ?? 0
    const totalAdvances = metrics?.total_advances ?? 0
    const sourceFile = data?.source_file || data?.sourceFile || 'uploaded-file'

    return {
      title: 'Bank Audit Summary Report',
      generatedAt: new Date().toISOString(),
      sourceFile,
      totalTransactions: metrics?.total_rows_analyzed ?? 0,
      totalIncome: totalDeposits,
      totalExpenses: totalAdvances,
      netBalance: totalDeposits - totalAdvances,
      riskLevel: metrics?.overall_risk || 'Unknown',
      keyInsights: data?.insights || ['Report processed, but live summary generation endpoint was unavailable.'],
      metrics,
      rawData: data,
    }
  }

  const handleDownloadSummary = async () => {
      try {
      const response = await fetch('/api/reports/download-summary', {
        method: 'POST',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ summary, originalData: summary?.rawData }),
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `summary_${new Date().getTime()}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      // Fallback: download as text/JSON
      const content = JSON.stringify(summary, null, 2)
      const blob = new Blob([content], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `summary_${new Date().getTime()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    }
  }

  if (isLoading) {
    return (
      <div className="summary-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Generating your summary...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="summary-page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <div className="error-actions">
            <Link to="/summarizer" className="btn btn-primary">
              Upload New File
            </Link>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/result')}
            >
              Back to Results
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="summary-page">
      <header className="summary-header">
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

      <main className="summary-content">
        <div className="summary-header-content">
          <h1>{summary?.title || 'Summary Report'}</h1>
          {summary?.generatedAt && (
            <p className="generated-at">Generated: {summary.generatedAt}</p>
          )}
          {summary?.riskLevel && (
            <p className="generated-at">Risk Level: {summary.riskLevel}</p>
          )}
        </div>

        <div className="summary-cards">
          {summary?.totalTransactions && (
            <div className="summary-card">
              <h3>Total Transactions</h3>
              <p className="card-value">{summary.totalTransactions}</p>
            </div>
          )}

          {summary?.totalIncome && (
            <div className="summary-card">
              <h3>Total Income</h3>
              <p className="card-value income">{summary.totalIncome}</p>
            </div>
          )}

          {summary?.totalExpenses && (
            <div className="summary-card">
              <h3>Total Expenses</h3>
              <p className="card-value expenses">{summary.totalExpenses}</p>
            </div>
          )}

          {summary?.netBalance && (
            <div className="summary-card">
              <h3>Net Balance</h3>
              <p className="card-value balance">{summary.netBalance}</p>
            </div>
          )}
        </div>

        {summary?.keyInsights && summary.keyInsights.length > 0 && (
          <div className="key-insights">
            <h2>Key Insights</h2>
            <ul>
              {summary.keyInsights.map((insight: string, index: number) => (
                <li key={index}>{insight}</li>
              ))}
            </ul>
          </div>
        )}

        {summary?.metrics && (
          <div className="categories-section">
            <h2>Audit Metrics</h2>
            <div className="categories-list">
              {Object.entries(summary.metrics).map(([key, value]) => (
                <div key={key} className="category-item">
                  <span className="category-name">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  <span className="category-amount">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="summary-actions">
          <button className="btn btn-primary" onClick={handleDownloadSummary}>
            Download Summary Report
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/result', { state: { result: summary?.rawData } })}
          >
            View Raw Data
          </button>
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

export default SummaryPage
