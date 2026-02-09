import { Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { HomePage } from './pages/HomePage'
import { PricingPage } from './pages/PricingPage'
import { PaymentSuccessPage } from './pages/PaymentSuccessPage'

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-parchment-100">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App
