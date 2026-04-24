import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import './Summarizer.css'

function Summarizer() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptedFileTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  const maxFileSize = 10 * 1024 * 1024 // 10MB

  const validateFile = (file: File): string | null => {
    if (!acceptedFileTypes.includes(file.type)) {
      return 'Invalid file type. Please upload PDF, CSV, or Excel files only.'
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
      // TODO: Implement actual file upload logic here
      console.log('Files selected:', validFiles)
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
            accept=".pdf,.csv,.xlsx,.xls"
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
              <span className="supported-formats">Supported: PDF, CSV, Excel (Max 10MB each)</span>
            </>
          )}
          {uploadError && <p className="error-message">{uploadError}</p>}
        </div>
      </main>
    </div>
  )
}

export default Summarizer