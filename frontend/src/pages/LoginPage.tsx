import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

const DENSEMATRIX_AUTH_URL = 'https://api.densematrix.ai'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const sendCode = async () => {
    if (!phone || phone.length < 11) {
      setError(t('login.invalidPhone', '请输入正确的手机号'))
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${DENSEMATRIX_AUTH_URL}/api/sms/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })
      
      if (response.ok) {
        setIsCodeSent(true)
        setCountdown(60)
        const interval = setInterval(() => {
          setCountdown(c => {
            if (c <= 1) {
              clearInterval(interval)
              return 0
            }
            return c - 1
          })
        }, 1000)
      } else {
        const data = await response.json()
        setError(data.detail || t('login.sendCodeFailed', '发送验证码失败'))
      }
    } catch (err) {
      setError(t('login.networkError', '网络错误，请重试'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phone || !code) {
      setError(t('login.fillAll', '请填写手机号和验证码'))
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${DENSEMATRIX_AUTH_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          verification_code: code
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        login(data.access_token, {
          id: data.user.id,
          phone: data.user.phone,
          organization_id: data.user.organization_id,
          is_internal: data.user.is_internal
        })
        navigate('/')
      } else {
        const data = await response.json()
        setError(data.detail || t('login.loginFailed', '登录失败'))
      }
    } catch (err) {
      setError(t('login.networkError', '网络错误，请重试'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="font-display text-3xl font-bold text-ink-900 text-center mb-2">
          {t('login.title', '登录')}
        </h1>
        <p className="text-ink-600 text-center mb-8">
          {t('login.subtitle', '登录后可跨设备同步余额')}
        </p>
        
        {error && (
          <div className="mb-6 p-4 bg-accent-50 border border-accent-200 rounded-xl text-accent-700 text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">
              {t('login.phone', '手机号')}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="13800138000"
              className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">
              {t('login.code', '验证码')}
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="flex-1 px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={sendCode}
                disabled={isLoading || countdown > 0}
                className="px-4 py-3 bg-ink-100 text-ink-700 rounded-xl font-medium hover:bg-ink-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {countdown > 0 ? `${countdown}s` : t('login.sendCode', '发送验证码')}
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !isCodeSent}
            className="w-full py-3 bg-accent-600 text-white rounded-xl font-semibold hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? t('login.loading', '登录中...') : t('login.submit', '登录')}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <Link to="/" className="text-ink-600 hover:text-ink-900">
            {t('login.skipLogin', '暂不登录，继续使用')} →
          </Link>
        </div>
        
        <p className="mt-8 text-xs text-ink-500 text-center">
          {t('login.terms', '登录即表示同意')}
          <a href="#" className="text-accent-600 hover:underline">{t('login.termsLink', '服务条款')}</a>
          {t('login.and', ' 和 ')}
          <a href="#" className="text-accent-600 hover:underline">{t('login.privacyLink', '隐私政策')}</a>
        </p>
      </div>
    </div>
  )
}
