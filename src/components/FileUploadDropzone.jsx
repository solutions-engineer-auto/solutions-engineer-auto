import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/rtf': ['.rtf'],
  'application/rtf': ['.rtf']
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

function FileUploadDropzone({ onFileSelect, maxFiles = 1 }) {
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState([])

  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    // Clear previous errors
    setErrors([])
    
    // Handle rejected files
    if (fileRejections.length > 0) {
      const rejectionErrors = fileRejections.map(rejection => ({
        file: rejection.file.name,
        errors: rejection.errors.map(e => e.message).join(', ')
      }))
      setErrors(rejectionErrors)
      return
    }

    // Process accepted files
    if (acceptedFiles.length > 0) {
      setFiles(acceptedFiles)
      if (onFileSelect) {
        onFileSelect(acceptedFiles)
      }
    }
  }, [onFileSelect])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles,
    multiple: maxFiles > 1
  })

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setErrors([])
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (file) => {
    const ext = file.name.split('.').pop().toLowerCase()
    switch (ext) {
      case 'pdf':
        return '📄'
      case 'doc':
      case 'docx':
        return '📝'
      case 'txt':
        return '📃'
      case 'md':
        return '📋'
      case 'rtf':
        return '📑'
      default:
        return '📎'
    }
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
          ${isDragActive && !isDragReject
            ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
            : isDragReject
            ? 'border-red-500/50 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            : 'border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-500/30'
          }
          ${files.length > 0 ? 'p-4' : 'p-12'}
        `}
      >
        <input {...getInputProps()} />
        
        {files.length === 0 ? (
          <div className="text-center">
            <div className="mb-4">
              <svg 
                className={`mx-auto h-16 w-16 transition-colors duration-300 ${
                  isDragActive ? 'text-cyan-500' : 'text-white/30'
                }`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                />
              </svg>
            </div>
            
            <p className="text-lg font-light text-white/70 mb-2">
              {isDragActive 
                ? isDragReject 
                  ? 'Invalid file type!' 
                  : 'Drop your file here...'
                : 'Drag & drop your document here'
              }
            </p>
            
            <p className="text-sm text-white/50 mb-4">
              or <span className="text-cyan-400 hover:text-cyan-300 transition-colors">browse files</span>
            </p>
            
            <p className="text-xs text-white/40">
              Supported: PDF, DOCX, DOC, TXT, MD, RTF (max {MAX_FILE_SIZE / 1024 / 1024}MB)
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file, index) => (
              <div 
                key={index}
                className="glass-panel p-4 flex items-center justify-between group hover:bg-white/[0.08] transition-all"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-2xl">{getFileIcon(file)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{file.name}</p>
                    <p className="text-sm text-white/50">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-lg"
                  title="Remove file"
                >
                  <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            
            <div className="text-center pt-2">
              <p className="text-sm text-white/40">
                Drop another file to replace
              </p>
            </div>
          </div>
        )}
      </div>
      
      {errors.length > 0 && (
        <div className="mt-4 space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="glass-panel p-3 border-red-500/30 bg-red-500/10">
              <p className="text-sm text-red-400">
                <span className="font-medium">{error.file}:</span> {error.errors}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileUploadDropzone 