import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useSessionContext } from '@supabase/auth-helpers-react'

interface AuthFormProps {
  isLogin?: boolean
}

function AuthForm ({ isLogin: initialIsLogin = true }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isLogin, setIsLogin] = useState(initialIsLogin)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  // Check if user is logged in
  const { session } = useSessionContext()


  useEffect(() => {
    if (session) {
      navigate('/', { replace: true })
    }
  }, [session, navigate])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    try {
      if (isLogin) {
        // Login
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (loginError) throw loginError

        navigate('/')
      } else {
        // Signup
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName
            }
          }
        })

        if (signupError) throw signupError

        // Check if user needs email confirmation
        if (data.user?.identities?.length === 0) {
          setError('Please check your email for confirmation')
        } else {
          navigate('/')
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    }
  }

  return (
    <>
     <header className="siteHeader center fp">
        <h1 className='siteHeader__title'>Ligretto Tracker</h1>
      </header>
      <div className="auth-container">
        <form onSubmit={handleSubmit} className="auth-form">
          <h2>{isLogin ? 'Log In' : 'Sign Up'}</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          {!isLogin && (
            <div className="name-inputs">
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="input-field"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="input-field"
              />
            </div>
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field"
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-field"
          />
          
          <button type="submit" className="submit-button">
            {isLogin ? 'Log In' : 'Sign Up'}
          </button>
          
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="toggle-button"
          >
            {isLogin 
              ? 'Need an account? Sign Up' 
              : 'Already have an account? Log In'}
          </button>
        </form>
      </div>
    </>
  )
}

export default AuthForm