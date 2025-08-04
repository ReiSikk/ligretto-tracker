import '../App.css'
import React, { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useSessionContext } from '@supabase/auth-helpers-react'
import { LucidePlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import GameSetCard from './GameSetCard'
import CreateGameSet from './CreateGameSet'
import type { PostgrestError } from '@supabase/supabase-js'

  interface Player {
    id: string;
    name: string;
    score: number;
}

  interface GameSet {
    id: string;
    name: string;
    created_at: string;
    players?: Player[];
    player_ids?: string[];
}

const PrivateRoute: React.FC = () => {
  const { session } = useSessionContext()
  const [gameSets, setGameSets] = useState<GameSet[]>([])
  console.log('Game sets', gameSets);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateGameSet, setShowCreateGameSet] = useState(false);
  

 const fetchGameSets = useCallback(async () => {
  if (!session?.user) return;

  try {
    // Explicitly type the Promise.all results
    const [gameSetsResult, playersResult] = await Promise.all([
      supabase
        .from('game_sets')
        .select('id, name, created_at, user_id, player_ids')
        .order('created_at', { ascending: false }) as unknown as { 
          data: GameSet[] | null; 
          error: PostgrestError | null 
        },
      supabase
        .from('players')
        .select('id, name') as unknown as { 
          data: Player[] | null; 
          error: PostgrestError | null 
        }
    ]);

    if (gameSetsResult.error) {
      console.error('Error fetching game sets:', gameSetsResult.error);
      return;
    }

    if (playersResult.error) {
      console.error('Error fetching players:', playersResult.error);
      return;
    }

    // Safely create players map with type checking
    const playersMap = new Map<string, string>(
      playersResult.data?.map(player => [player.id, player.name]) ?? []
    );

    // Enrich game sets with player names, with full type safety
    const enrichedGameSets: GameSet[] = (gameSetsResult.data ?? []).map(gameSet => ({
      ...gameSet,
      players: gameSet.player_ids
        ?.map(id => ({
          id, 
          name: playersMap.get(id) || 'Unknown Player'
        }))
        .filter((player): player is Player => player.name !== 'Unknown Player') || []
    }));

    setGameSets(enrichedGameSets);
  } catch (error) {
    console.error('Unexpected error fetching game sets:', error);
  } finally {
    setIsLoading(false);
  }
}, [session?.user]);

 // Initial load
  useEffect(() => {
    fetchGameSets();
  }, [fetchGameSets]);


  // Handler for when a new game set is created
  const handleCreateGame = useCallback(() => {
    fetchGameSets(); // Refetch to get fresh data
    setShowCreateGameSet(false);
  }, [fetchGameSets]);


  const handleLogout = async () => {
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
            {gameSets.length > 0 ? (
              <ul className="list list-flex">
                {gameSets.map( gameSet => (
                  <GameSetCard 
                    key={gameSet.id} 
                    title={gameSet.name} 
                    gameSet={gameSet}
                    players={gameSet.players || []} />
                ))}
              </ul>
            ) : (
               <div className="siteMain__empty">
                <h3>No game sets yet</h3>
                <p>Create your first game set to start tracking Ligretto scores</p>
                <button 
                  className="btn-main"
                  onClick={() => setShowCreateGameSet(true)}
                >
                  Create Your First Set
                </button>
              </div>
            )}
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