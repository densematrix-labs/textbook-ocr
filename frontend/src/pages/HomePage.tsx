import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { saveAs } from 'file-saver'
import { DropZone } from '../components/DropZone'
import { MarkdownPreview } from '../components/MarkdownPreview'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useAppStore } from '../lib/store'
import { processOCR } from '../lib/api'

type ViewMode = 'preview' | 'source'

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tokenStatus, fetchTokenStatus, setError, error } = useAppStore()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [copied, setCopied] = useState(false)
  
  useEffect(() => {
    fetchTokenStatus()
  }, [fetchTokenStatus])
  
  const handleFileSelect = async (file: File) => {
    // Check tokens (skip if internal testing key is set)
    const hasInternalKey = !!localStorage.getItem('internalKey')
    if (!hasInternalKey && tokenStatus && tokenStatus.total_available <= 0) {
      navigate('/pricing')
      return
    }
    
    setIsProcessing(true)
    setResult(null)
    setError(null)
    
    try {
      const response = await processOCR(file)
      if (response.success && response.markdown) {
        setResult(response.markdown)
        fetchTokenStatus() // Refresh token count
      } else {
        setError(response.error || t('errors.processing'))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.processing')
      setError(message)
    } finally {
      setIsProcessing(false)
    }
  }
  
  const handleCopy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleDownloadMd = () => {
    if (!result) return
    const blob = new Blob([result], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ocr-result.md'
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const handleDownloadWord = async () => {
    if (!result) return
    
    // Parse markdown and convert to docx paragraphs
    const lines = result.split('\n')
    const children: Paragraph[] = []
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        children.push(new Paragraph({
          text: line.slice(2),
          heading: HeadingLevel.HEADING_1,
        }))
      } else if (line.startsWith('## ')) {
        children.push(new Paragraph({
          text: line.slice(3),
          heading: HeadingLevel.HEADING_2,
        }))
      } else if (line.startsWith('### ')) {
        children.push(new Paragraph({
          text: line.slice(4),
          heading: HeadingLevel.HEADING_3,
        }))
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        children.push(new Paragraph({
          children: [new TextRun({ text: '• ' + line.slice(2) })],
        }))
      } else if (line.startsWith('$$') || line.endsWith('$$')) {
        // LaTeX block - keep as-is for now (Word doesn't support LaTeX natively)
        children.push(new Paragraph({
          children: [new TextRun({ text: line, italics: true })],
        }))
      } else if (line.includes('$') && line.match(/\$[^$]+\$/)) {
        // Inline LaTeX - keep as-is
        children.push(new Paragraph({
          children: [new TextRun({ text: line })],
        }))
      } else if (line.trim() === '') {
        children.push(new Paragraph({ text: '' }))
      } else {
        // Handle bold and italic
        const textRuns: TextRun[] = []
        let remaining = line
        const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g
        let lastIndex = 0
        let match
        
        while ((match = regex.exec(remaining)) !== null) {
          // Add text before the match
          if (match.index > lastIndex) {
            textRuns.push(new TextRun({ text: remaining.slice(lastIndex, match.index) }))
          }
          
          const matched = match[0]
          if (matched.startsWith('**') || matched.startsWith('__')) {
            textRuns.push(new TextRun({ text: matched.slice(2, -2), bold: true }))
          } else {
            textRuns.push(new TextRun({ text: matched.slice(1, -1), italics: true }))
          }
          lastIndex = regex.lastIndex
        }
        
        // Add remaining text
        if (lastIndex < remaining.length) {
          textRuns.push(new TextRun({ text: remaining.slice(lastIndex) }))
        }
        
        children.push(new Paragraph({
          children: textRuns.length > 0 ? textRuns : [new TextRun({ text: line })],
        }))
      }
    }
    
    const doc = new Document({
      sections: [{
        properties: {},
        children,
      }],
    })
    
    const blob = await Packer.toBlob(doc)
    saveAs(blob, 'ocr-result.docx')
  }
  
  const handleReset = () => {
    setResult(null)
    setError(null)
    setViewMode('preview')
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink-900 mb-4">
            {t('app.title')}
          </h1>
          <p className="text-xl text-ink-600 max-w-2xl mx-auto">
            {t('app.description')}
          </p>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-8 p-4 bg-accent-50 border border-accent-200 rounded-xl text-accent-700 text-center"
               data-testid="error-message">
            {error}
          </div>
        )}
        
        {/* Main content */}
        {isProcessing ? (
          <LoadingSpinner 
            message={t('upload.processing')} 
            hint={t('upload.processingHint')} 
          />
        ) : result ? (
          <div className="animate-fade-in">
            {/* Result header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-semibold text-ink-900">
                {t('result.title')}
              </h2>
              <div className="flex items-center gap-3">
                {/* View toggle */}
                <div className="flex bg-ink-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
                              ${viewMode === 'preview' 
                                ? 'bg-white text-ink-900 shadow-sm' 
                                : 'text-ink-600 hover:text-ink-900'}`}
                  >
                    {t('result.preview')}
                  </button>
                  <button
                    onClick={() => setViewMode('source')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
                              ${viewMode === 'source' 
                                ? 'bg-white text-ink-900 shadow-sm' 
                                : 'text-ink-600 hover:text-ink-900'}`}
                  >
                    {t('result.source')}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Result content */}
            <div className="bg-white rounded-2xl shadow-lg border border-ink-100 overflow-hidden">
              <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto">
                {viewMode === 'preview' ? (
                  <MarkdownPreview content={result} />
                ) : (
                  <pre className="font-mono text-sm text-ink-700 whitespace-pre-wrap break-words">
                    {result}
                  </pre>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 px-6 py-4 bg-ink-50 border-t border-ink-100">
                <button onClick={handleCopy} className="btn-secondary" data-testid="copy-button">
                  {copied ? t('result.copied') : t('result.copy')}
                </button>
                <button onClick={handleDownloadMd} className="btn-secondary">
                  {t('result.downloadMd', 'Download .md')}
                </button>
                <button onClick={handleDownloadWord} className="btn-secondary">
                  {t('result.downloadWord', 'Download .docx')}
                </button>
                <button onClick={handleReset} className="btn-primary ml-auto">
                  {t('result.newUpload')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6 text-center">
              {t('upload.title')}
            </h2>
            <DropZone onFileSelect={handleFileSelect} />
            
            {/* Token status */}
            {tokenStatus && (
              <div className="mt-8 text-center">
                {localStorage.getItem('internalKey') ? (
                  <p className="text-green-600 font-medium">🔓 Internal testing mode</p>
                ) : (
                  <>
                    <p className="text-ink-600">
                      {tokenStatus.total_available > 0 
                        ? t('pricing.tokensRemaining', { count: tokenStatus.total_available })
                        : t('pricing.noTokens')
                      }
                    </p>
                    {tokenStatus.total_available <= 0 && (
                      <button 
                        onClick={() => navigate('/pricing')}
                        className="mt-4 text-accent-600 hover:text-accent-700 font-medium"
                      >
                        {t('pricing.buyMore')} →
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
