import React from 'react'
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
} from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { SessionContextProvider } from '@supabase/auth-helpers-react'

// Pages/Components
import AuthForm from './components/AuthForm'
import PrivateRoute from './components/PrivateRoute'
import SetView from './components/SetView'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const App: React.FC = () => {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <Router>
        <Routes>
          <Route path="/login" element={<AuthForm isLogin={true} />} />
          <Route path="/signup" element={<AuthForm isLogin={false} />} />
          <Route path="/set/:setId" element={<SetView />} />
          <Route path="/" element={<PrivateRoute />} />
        </Routes>
      </Router>
    </SessionContextProvider>
  )
}

export default App