import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../lib/store'
import { useAuth } from '../contexts/AuthContext'

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
  const navigate = useNavigate()
  const { tokenStatus } = useAppStore()
  const { user, isAuthenticated, logout } = useAuth()
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]
  
  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    navigate('/')
  }
  
  // Format phone number for display (hide middle digits)
  const formatPhone = (phone: string) => {
    if (phone.length >= 7) {
      return phone.slice(0, 3) + '****' + phone.slice(-4)
    }
    return phone
  }
  
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
          <nav className="flex items-center gap-4 sm:gap-6">
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
            
            {/* User / Login */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-ink-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-accent-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="hidden sm:inline text-sm text-ink-700">{formatPhone(user.phone)}</span>
                </button>
                
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-xl shadow-xl border border-ink-100 animate-fade-in">
                      <div className="px-4 py-2 border-b border-ink-100">
                        <p className="text-sm font-medium text-ink-900">{formatPhone(user.phone)}</p>
                        <p className="text-xs text-ink-500">{t('login.loggedIn', '已登录')}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
                      >
                        {t('login.logout', '退出登录')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors"
              >
                {t('login.login', '登录')}
              </Link>
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
