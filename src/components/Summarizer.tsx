import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Summarizer.css'
import { getAuthHeaders } from '../services/api'

function Summarizer() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string>('')
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const acceptedFileTypes = ['application/pdf']
  const maxFileSize = 10 * 1024 * 1024 // 10MB

  const validateFile = (file: File): string | null => {
    if (!acceptedFileTypes.includes(file.type)) {
      return 'Invalid file type. Please upload PDF files only.'
    }
    if (file.size > maxFileSize) {
      return 'File size too large. Maximum file size is 10MB.'
    }
    return null
  }

  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles: File[] = []
    let errorMessage = ''

    for (const file of fileArray) {
      const validationError = validateFile(file)
      if (validationError) {
        errorMessage = validationError
        break
      }
      validFiles.push(file)
    }

    if (errorMessage) {
      setUploadError(errorMessage)
    } else {
      setSelectedFiles(validFiles)
      setUploadError('')
      // Upload file to backend
      uploadFile(validFiles[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setUploadError('')
    setUploadResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/reports/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? ''
        const isJson = contentType.includes('application/json')
        const payload = isJson ? await response.json() : await response.text()

        if (response.status === 401 || response.status === 403) {
          throw new Error('Your session is not authorized for report upload. Please log in again.')
        }

        if (isJson && payload && typeof payload === 'object' && 'error' in payload) {
          throw new Error(String(payload.error))
        }

        if (typeof payload === 'string' && payload.trim()) {
          throw new Error(payload)
        }

        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      setUploadResult(result)
      
      // Navigate to result page
      navigate('/result', { state: { result } })
    } catch (error) {
      if (error instanceof TypeError) {
        setUploadError('Cannot reach the backend upload API. Check that Vite, Spring, and the Python analyzer are all running.')
      } else {
        setUploadError(error instanceof Error ? error.message : 'Upload failed')
      }
    } finally {
      setIsUploading(false)
    }
  }

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
        <p>Drag and drop your bank statement or click to browse</p>
        
        <div
          className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
          <div className="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {selectedFiles.length > 0 ? (
            <div className="file-list">
              {selectedFiles.map((file, index) => (
                <div key={index} className="selected-file">
                  <span>{file.name}</span>
                  <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              ))}
              <p className="upload-more">Click to add more files or drag and drop</p>
            </div>
          ) : (
            <>
              <p>Drop files here or click to upload</p>
              <span className="supported-formats">Supported: PDF (Max 10MB)</span>
            </>
          )}
            {uploadError && <p className="error-message">{uploadError}</p>}
            {isUploading && <p className="uploading">Uploading and processing...</p>}
            {uploadResult && (
              <div className="upload-result">
                <h3>Processing Result:</h3>
                <pre>{JSON.stringify(uploadResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </main>
      </div>
  )
}

export default Summarizer
