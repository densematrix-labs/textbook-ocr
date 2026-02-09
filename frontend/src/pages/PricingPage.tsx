import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../lib/store'
import { getProducts, createCheckout, Product } from '../lib/api'

export function PricingPage() {
  const { t } = useTranslation()
  const { tokenStatus, fetchTokenStatus } = useAppStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  
  useEffect(() => {
    fetchTokenStatus()
    loadProducts()
  }, [fetchTokenStatus])
  
  const loadProducts = async () => {
    try {
      const data = await getProducts()
      setProducts(data)
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handlePurchase = async (productId: string) => {
    setPurchasing(productId)
    try {
      const { checkout_url } = await createCheckout(productId)
      window.location.href = checkout_url
    } catch (err) {
      console.error('Failed to create checkout:', err)
      setPurchasing(null)
    }
  }
  
  const features = [
    { key: 'multiPage', icon: '📄' },
    { key: 'latex', icon: '📐' },
    { key: 'markdown', icon: '✍️' },
    { key: 'fast', icon: '⚡' },
  ]
  
  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink-900 mb-4">
            {t('pricing.title')}
          </h1>
          <p className="text-xl text-ink-600">
            {t('pricing.subtitle')}
          </p>
        </div>
        
        {/* Current status */}
        {tokenStatus && (
          <div className="text-center mb-8 p-4 bg-white rounded-xl shadow-sm border border-ink-100">
            <p className="text-ink-700">
              {tokenStatus.total_available > 0 
                ? t('pricing.tokensRemaining', { count: tokenStatus.total_available })
                : t('pricing.noTokens')
              }
            </p>
          </div>
        )}
        
        {/* Features list */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {features.map(feature => (
            <div 
              key={feature.key}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-ink-100"
            >
              <span className="text-2xl">{feature.icon}</span>
              <span className="text-sm font-medium text-ink-700">
                {t(`pricing.features.${feature.key}`)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Pricing cards */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full spinner" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {products.map((product, index) => {
              const isPopular = index === 1
              const productKey = product.id as 'ocr_3' | 'ocr_10' | 'ocr_30'
              
              return (
                <div 
                  key={product.id}
                  className={`relative bg-white rounded-2xl p-6 border-2 transition-all duration-300
                            hover:shadow-xl hover:-translate-y-1
                            ${isPopular 
                              ? 'border-accent-400 shadow-lg' 
                              : 'border-ink-100'}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 
                                  bg-accent-500 text-white text-xs font-bold rounded-full">
                      {t('pricing.popular')}
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="font-display text-xl font-semibold text-ink-900 mb-2">
                      {t(`products.${productKey}.name`)}
                    </h3>
                    <p className="text-ink-500 text-sm">
                      {t(`products.${productKey}.description`)}
                    </p>
                  </div>
                  
                  <div className="text-center mb-6">
                    <span className="font-display text-4xl font-bold text-ink-900">
                      {product.price_display}
                    </span>
                    <span className="text-ink-500 ml-2">
                      / {product.tokens} {t('pricing.perConversion').split(' ')[0]}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handlePurchase(product.id)}
                    disabled={purchasing === product.id}
                    className={`w-full py-3 px-6 rounded-lg font-medium transition-all
                              ${isPopular 
                                ? 'bg-accent-500 text-white hover:bg-accent-600 shadow-lg hover:shadow-xl' 
                                : 'bg-ink-100 text-ink-700 hover:bg-ink-200'}
                              disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {purchasing === product.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full spinner" />
                        Loading...
                      </span>
                    ) : (
                      t('pricing.buyMore')
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Free trial note */}
        <div className="mt-12 text-center p-6 bg-parchment-200 rounded-2xl">
          <h3 className="font-display text-lg font-semibold text-ink-900 mb-2">
            {t('pricing.freeTrial')}
          </h3>
          <p className="text-ink-600">
            {t('pricing.freeTrialDesc')}
          </p>
        </div>
      </main>
    </div>
  )
}
