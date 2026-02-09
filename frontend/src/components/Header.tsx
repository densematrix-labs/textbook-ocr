import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../lib/store'

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
]

export function Header() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { tokenStatus } = useAppStore()
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]
  
  return (
    <header className="sticky top-0 z-50 bg-parchment-100/95 backdrop-blur-sm border-b border-ink-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center
                          shadow-lg group-hover:shadow-xl transition-shadow">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-display text-xl font-semibold text-ink-900">
              {t('app.title')}
            </span>
          </Link>
          
          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link 
              to="/" 
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/' ? 'text-accent-600' : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              {t('nav.home')}
            </Link>
            <Link 
              to="/pricing" 
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/pricing' ? 'text-accent-600' : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              {t('nav.pricing')}
            </Link>
            
            {/* Token status */}
            {tokenStatus && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-ink-100 rounded-full">
                <div className="w-2 h-2 rounded-full bg-accent-500" />
                <span className="text-xs font-medium text-ink-700">
                  {tokenStatus.total_available} {t('pricing.tokensRemaining', { count: tokenStatus.total_available }).split(' ').slice(-1)[0]}
                </span>
              </div>
            )}
            
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-ink-100 transition-colors"
                aria-label={t('nav.language')}
              >
                <span className="text-lg">{currentLang.flag}</span>
                <svg className={`w-4 h-4 text-ink-400 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} 
                     fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {langMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0" 
                    onClick={() => setLangMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-xl shadow-xl border border-ink-100
                                animate-fade-in origin-top-right">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          i18n.changeLanguage(lang.code)
                          setLangMenuOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
                                  ${lang.code === i18n.language 
                                    ? 'bg-accent-50 text-accent-700' 
                                    : 'text-ink-700 hover:bg-ink-50'}`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.name}</span>
                        {lang.code === i18n.language && (
                          <svg className="w-4 h-4 ml-auto text-accent-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
