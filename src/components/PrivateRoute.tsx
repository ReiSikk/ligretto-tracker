import '../App.css'
import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useSessionContext } from '@supabase/auth-helpers-react'
import { LucidePlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import GameSetCard from './GameSetCard'
import CreateGameSet from './CreateGameSet'

const mockPlayers = [
    { name: 'Rei', score: 10 },
    { name: 'Rems', score: 20 },
    { name: 'Player 3', score: 15 },
    { name: 'Player 4', score: 25 }
    ]


const PrivateRoute: React.FC = () => {
  const { session, isLoading } = useSessionContext()
  const [showCreateGameSet, setShowCreateGameSet] = useState(false)

  const handleCreateGame = (setName: string, selectedPlayers: string[]) => {
    console.log('Creating game:', setName, selectedPlayers)
    // Here you'll later save to Supabase
    setShowCreateGameSet(false)
  }

  const handleLogout = async () => {
    // Implement logout logic
    await supabase.auth.signOut()
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  // If no session, redirect to login
  if (!session) {
    return <Navigate to="/login" />
  }

  return (
    <>
      <div className="wrapper">
        <header className="siteHeader">
          <h1 className='siteHeader__title'>Ligretto Tracker</h1>
        </header>
        <main className='siteMain'>
          <div className="siteMain__top fp">
            <h2 className='siteMain__title h1'>Games</h2>
            <button 
              className="btn-main p fp"
              onClick={() => setShowCreateGameSet(true)}
            >
              New Set 
              <div className="icon fp">
                <LucidePlus height={16} width={16} />
              </div>
            </button>
          </div>
          <section className="siteMain__content">
            <ul className="list list-flex">
              <GameSetCard title='Game 1' players={mockPlayers} />
            </ul>
          </section>
        </main>
        <footer className="siteFooter">
          <nav className="siteFooter__nav">
            <ul className="list-flex">
              <li className="siteFooter__nav-item">
                <button 
                  className="btn-main p fp"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </li>
            </ul>
          </nav>
        </footer>
      </div>
      {showCreateGameSet && (
        <CreateGameSet 
          onClose={() => setShowCreateGameSet(false)}
          onCreateGame={handleCreateGame}
        />
      )}
    </>
  )
}

export default PrivateRoute