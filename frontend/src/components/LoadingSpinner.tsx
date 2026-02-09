import { useTranslation } from 'react-i18next'

interface LoadingSpinnerProps {
  message?: string
  hint?: string
}

export function LoadingSpinner({ message, hint }: LoadingSpinnerProps) {
  const { t } = useTranslation()
  
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative">
        {/* Outer ring */}
        <div className="w-16 h-16 rounded-full border-4 border-ink-100" />
        {/* Spinning segment */}
        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent 
                       border-t-accent-500 spinner" />
      </div>
      <p className="mt-6 text-lg font-medium text-ink-700">
        {message || t('upload.processing')}
      </p>
      {hint && (
        <p className="mt-2 text-sm text-ink-500">{hint}</p>
      )}
    </div>
  )
}
