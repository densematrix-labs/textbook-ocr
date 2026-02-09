import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'

interface DropZoneProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

export function DropZone({ onFileSelect, disabled = false }: DropZoneProps) {
  const { t } = useTranslation()
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
    disabled,
  })
  
  return (
    <div
      {...getRootProps()}
      className={`dropzone relative p-12 border-2 border-dashed rounded-2xl cursor-pointer
                 transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                 ${isDragActive 
                   ? 'active border-accent-400 bg-accent-50' 
                   : 'border-ink-300 bg-white/50 hover:border-accent-300'}`}
    >
      <input {...getInputProps()} data-testid="file-input" />
      
      {/* Upload illustration */}
      <div className="flex flex-col items-center text-center">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6
                        transition-colors ${isDragActive ? 'bg-accent-100' : 'bg-ink-100'}`}>
          <svg 
            className={`w-10 h-10 transition-colors ${isDragActive ? 'text-accent-600' : 'text-ink-400'}`}
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
        
        <p className="text-lg font-medium text-ink-700 mb-2">
          {t('upload.dropzone')}
        </p>
        <p className="text-ink-500 mb-4">{t('upload.or')}</p>
        <button 
          type="button"
          className="btn-primary"
          disabled={disabled}
        >
          {t('upload.browse')}
        </button>
        <p className="text-sm text-ink-400 mt-4">
          {t('upload.supported')}
        </p>
      </div>
      
      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 bg-accent-500/10 rounded-2xl flex items-center justify-center">
          <div className="text-accent-600 font-medium animate-pulse-soft">
            {t('upload.dropzone')}
          </div>
        </div>
      )}
    </div>
  )
}
