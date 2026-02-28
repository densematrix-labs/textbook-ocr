import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  phone: string
  organization_id?: string
  is_internal?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DENSEMATRIX_AUTH_URL = 'https://api.densematrix.ai'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('access_token')
    if (savedToken) {
      // Verify token with DenseMatrix Auth
      verifyToken(savedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const verifyToken = async (savedToken: string) => {
    try {
      const response = await fetch(`${DENSEMATRIX_AUTH_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser({
          id: userData.id,
          phone: userData.phone,
          organization_id: userData.organization_id,
          is_internal: userData.is_internal
        })
        setToken(savedToken)
      } else {
        // Token invalid, clear it
        localStorage.removeItem('access_token')
      }
    } catch (error) {
      console.error('Failed to verify token:', error)
      localStorage.removeItem('access_token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('access_token', newToken)
    setToken(newToken)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
