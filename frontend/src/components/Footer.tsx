import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  
  return (
    <footer className="mt-auto border-t border-ink-200 bg-parchment-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-ink-500">
            {t('footer.poweredBy')}
          </p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-sm text-ink-500 hover:text-ink-700 transition-colors">
              {t('footer.privacy')}
            </a>
            <a href="/terms" className="text-sm text-ink-500 hover:text-ink-700 transition-colors">
              {t('footer.terms')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
