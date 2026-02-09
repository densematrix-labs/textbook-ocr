import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPaymentStatus } from '../lib/api'
import { useAppStore } from '../lib/store'

export function PaymentSuccessPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { fetchTokenStatus } = useAppStore()
  
  const [loading, setLoading] = useState(true)
  const [tokensAdded, setTokensAdded] = useState(0)
  
  useEffect(() => {
    const checkPayment = async () => {
      const checkoutId = searchParams.get('checkout_id')
      if (!checkoutId) {
        navigate('/')
        return
      }
      
      try {
        // Poll for payment completion
        for (let i = 0; i < 10; i++) {
          const status = await getPaymentStatus(checkoutId)
          if (status.status === 'completed') {
            setTokensAdded(status.tokens_granted)
            await fetchTokenStatus()
            break
          }
          await new Promise(r => setTimeout(r, 1000))
        }
      } catch (err) {
        console.error('Failed to check payment status:', err)
      } finally {
        setLoading(false)
      }
    }
    
    checkPayment()
  }, [searchParams, navigate, fetchTokenStatus])
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {loading ? (
            <>
              <div className="w-16 h-16 mx-auto mb-6">
                <div className="w-full h-full border-4 border-accent-500 border-t-transparent rounded-full spinner" />
              </div>
              <p className="text-ink-600">Verifying payment...</p>
            </>
          ) : (
            <>
              {/* Success icon */}
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h1 className="font-display text-2xl font-bold text-ink-900 mb-2">
                {t('payment.success')}
              </h1>
              <p className="text-ink-600 mb-6">
                {t('payment.successDesc')}
              </p>
              
              {tokensAdded > 0 && (
                <div className="bg-accent-50 rounded-xl p-4 mb-6">
                  <p className="text-accent-700 font-medium">
                    {t('payment.tokensAdded', { count: tokensAdded })}
                  </p>
                </div>
              )}
              
              <button
                onClick={() => navigate('/')}
                className="btn-primary w-full"
              >
                {t('payment.continue')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
