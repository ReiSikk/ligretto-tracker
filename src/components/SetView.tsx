import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronUp, ChevronDown, PlusCircle, LucideX } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSessionContext } from '@supabase/auth-helpers-react'
import { useGameSets } from '../providers/GameSetContext' 
import type { GameSet } from '../lib/types'
import type { Admin } from '../lib/types'
import type { Score } from '../lib/types'


interface Player {
  id: string;
  name: string;
}

interface LocalScore {
  player_id: string;
  score: number;
  player: Player;
}

function SetView() {
  const navigate = useNavigate()
  // Get the current session and user ID
  const { session } = useSessionContext()
  const userId = session?.user?.id
  const { setId } = useParams<{ setId: string }>()

  const [gameSet, setGameSet] = useState<GameSet | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  // Local scores for the current round
  const [currentScores, setCurrentScores] = useState<LocalScore[]>([])
  const [allScores, setAllScores] = useState<Score[]>([])
  const [currentRound, setCurrentRound] = useState(1)
  // UI loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  // Admin management states
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [allAdmins, setAllAdmins] = useState<Admin[]>([])
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false)

  const { 
    loading: contextLoading, 
    getAdminsByIds,
    addAdmin,
    removeAdmin

  } = useGameSets()

   useEffect(() => {
    // If context is loading, wait
    if (contextLoading) return

    // Existing data fetching logic
    if (setId) {
      fetchSetData()
    }
  }, [setId, contextLoading, userId])

  const fetchSetData = async () => {
    try {
      // Fetch game set details
      const { data: setData, error: setError } = await supabase
        .from('game_sets')
        .select('*')
        .eq('id', setId)
        .single()

      if (setError) throw setError
      setGameSet(setData)

      // Check if current user is an admin (creator or secondary admin)
      const isCreator = setData.user_id === userId
      const isSecondaryAdmin = setData.admin_ids?.includes(userId) || false
      
      // Set if current user is admin
      setCurrentUserIsAdmin(isCreator || isSecondaryAdmin)

      // Fetch ALL admin data (creator + secondary admins)
      const allAdminIds = [setData.user_id]
      if (setData.admin_ids && setData.admin_ids.length > 0) {
        allAdminIds.push(...setData.admin_ids)
      }
      
      // Remove duplicates and fetch admin details
      const uniqueAdminIds = [...new Set(allAdminIds)]

      if (uniqueAdminIds.length > 0) {
        try {
          const adminData = await getAdminsByIds(uniqueAdminIds)
          setAllAdmins(adminData)
        } catch (error) {
          console.error('Failed to fetch admin data:', error)
          setAllAdmins([])
        }
      }

      // Fetch players for this set
      if (setData.player_ids && setData.player_ids.length > 0) {
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, name')
          .in('id', setData.player_ids)

        if (playersError) throw playersError
        const playersList = playersData || []
        setPlayers(playersList)

        // Init scores
        resetScores(playersList)

        await fetchAllScores()
      }

    } catch (error) {
      console.error('Error fetching set data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to check if current user is the creator
  const isCreator = () => {
    return gameSet?.user_id === userId
  }

  const handleAddAdminSubmit = async () => {
    if (!setId || !newAdminEmail.trim()) return

    try {
      await addAdmin(setId, newAdminEmail.trim())
      
      // Reset modal and email
      setNewAdminEmail('')
      setAdminModalOpen(false)
    } catch (error){
      console.error('Failed to add admin:', error)
      // Show error to user
      alert('Failed to add admin. Please try again.')
    }
  }

    // Updated handleRemoveAdmin function
  const handleRemoveAdmin = async (adminIdToRemove: string) => {
    if (!setId || !gameSet) return

    // Prevent removing the creator
    if (adminIdToRemove === gameSet.user_id) {
      alert('Cannot remove the creator from admin list')
      return
    }

    // Find admin info for confirmation
    const adminToRemove = allAdmins.find(admin => admin.id === adminIdToRemove)
    const adminName = adminToRemove?.user_metadata?.first_name || adminToRemove?.email?.split('@')[0]
    
    // Confirm removal
    if (!confirm(`Remove ${adminName} as admin?`)) {
      return
    }

    try {
      // Use the RPC function
      await removeAdmin(setId, adminIdToRemove)
      
      // Refresh the data to show updated admin list
      await fetchSetData()
      
      alert('Admin removed successfully')

    } catch (error) {
      console.error('Failed to remove admin:', error)
      // Error handling is done in the context function
    }
  }

  const fetchAllScores = async () => {
    try {
      const { data: scoresData, error: scoresError } = await supabase
        .from('game_scores')
        .select(`
          *,
          players (id, name)
        `)
        .eq('game_set_id', setId)
        .order('round_number', { ascending: true })

      if (scoresError) throw scoresError
      
      const scores = scoresData || []
      setAllScores(scores)
      
      // Set current round to next available round
      const maxRound = scores.length > 0 
        ? Math.max(...scores.map(s => s.round_number)) 
        : 0
      setCurrentRound(maxRound + 1)

    } catch (error) {
      console.error('Error fetching scores:', error)
    }
  }

  const resetScores = (playersList: Player[] = players) => {
    setCurrentScores(playersList.map(player => ({
      player_id: player.id,
      score: 0,
      player
    })))
  }

  const updateLocalScore = (playerId: string, newScore: number) => {
    setCurrentScores(prev => 
      prev.map(score => 
        score.player_id === playerId ? { ...score, score: newScore } : score
      )
    )
  }

  const incrementScore = (playerId: string) => {
    const currentScore = currentScores.find(s => s.player_id === playerId)?.score || 0
    updateLocalScore(playerId, currentScore + 1)
  }

  const decrementScore = (playerId: string) => {
    const currentScore = currentScores.find(s => s.player_id === playerId)?.score || 0
    if (currentScore > -10) {
      updateLocalScore(playerId, currentScore - 1)
    }
  }

  const saveRound = async () => {
    if (!setId || !userId || currentScores.length === 0) return

    setIsSaving(true)
    try {
      // Prepare scores for saving
      const scoresToSave = currentScores.map(score => ({
        game_set_id: setId,
        player_id: score.player_id,
        score: score.score,
        round_number: currentRound,
        creator_id: userId
      }))

      // Save to database
      const { data: savedScores, error } = await supabase
        .from('game_scores')
        .insert(scoresToSave)
        .select(`
          *,
          players (id, name)
        `)

      if (error) throw error

      // Update local state immediately
      setAllScores(prev => [...prev, ...(savedScores || [])])
      setCurrentRound(prev => prev + 1)
      
      // Reset scores for next round
      resetScores()

    } catch (error) {
      console.error('Error saving round:', error)
      alert('Failed to save round. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate leaderboard with memoization for performance
  const leaderboard = useMemo(() => {
    const totals = new Map<string, number>()
    
    // Initialize all players with 0
    players.forEach(player => {
      totals.set(player.id, 0)
    })

    // Add up all scores
    allScores.forEach(score => {
      const current = totals.get(score.player_id) || 0
      totals.set(score.player_id, current + score.score)
    })

    // Convert to sorted array
    return players
      .map(player => ({
        player,
        totalScore: totals.get(player.id) || 0
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
  }, [players, allScores])

  // Calculate rounds completed
  const roundsCompleted = useMemo(() => {
    if (allScores.length === 0) return 0
    return Math.max(...allScores.map(s => s.round_number))
  }, [allScores])

  if (isLoading) {
    return (
      <div className="setView setView--loading">
        <p>Loading game set...</p>
      </div>
    )
  }

  if (!gameSet) {
    return (
      <div className="setView setView--error">
        <p>Game set not found</p>
        <button onClick={() => navigate('/')} className="btn-main">
          Back to home
        </button>
      </div>
    )
  }

  return (
    <div className="setView">
      {/* Header */}
      <div className="setView__header">
        <div className="setView__title">Ligretto</div>
        <button 
          className="setView__back-btn"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} />
          Back to sets
        </button>
      </div>

      {/* Game Info */}
      <div className="setView__game-info fp">
          <div className="setView__game-title fp-col">
            <span className=''>{gameSet.name}</span>
            <span>Round {currentRound}</span>
            <div className="setView__rounds-info">
              {roundsCompleted} rounds completed
            </div>
          </div>
         <div className="setView__admin-section fp-col">
            <div className="setView__admin-info">
              <span className="setView__admin-label">
                Admin{allAdmins.length > 1 ? 's' : ''}
              </span>
             {allAdmins.map((admin) => (
                <div key={admin.id} className="setView__admin-item fp">
                  <span className="setView__admin-name">
                    {admin.user_metadata?.first_name}
                  </span>
                  <span className="setView__admin-email">{admin.email}</span>
                   {gameSet?.user_id === admin.id && (
                      <span className="setView__creator-label">Set Creator</span>
                    )}
                  {isCreator() && admin.id !== gameSet?.user_id && (
                    <button 
                      className="setView__remove-admin-btn"
                      onClick={() => handleRemoveAdmin(admin.id || '')}
                      title="Remove admin"
                    >
                      <LucideX size={16} />
                    </button>
                  )}
                </div>
              ))}

                <div className={`setView__modal ${adminModalOpen ? 'open' : ''}`}>
                  <h3>Add Admin</h3>
                  <input
                    type="email"
                    placeholder="Enter admin email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                  />
                  <div className="setView__modal-btns fp">
                    <button onClick={() => setAdminModalOpen(false)}>Cancel</button>
                    <button onClick={handleAddAdminSubmit}>Add</button>
                  </div>
                </div>
            </div>
            {currentUserIsAdmin && (
              <button 
                className="setView__admin-btn btn-main"
                onClick={() => setAdminModalOpen(true)}
              >
                <PlusCircle size={24} />
                Add another admin
              </button>
            )}
          </div>
      </div>

      <main className="setView__main">
      {/* Scores Section */}
      <section className="setView__scores-section">
        <h3 className="setView__scores-title">ENTER SCORES</h3>
        
        <div className="setView__score-inputs">
          {currentScores.map(localScore => (
            <div key={localScore.player_id} className="setView__score-input-row">
              <label className="setView__player-label">{localScore.player.name}</label>
              <div className="setView__score-controls">
                <input
                  type="number"
                  className="setView__score-number"
                  value={localScore.score === 0 ? '' : localScore.score}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || value === '-') {
                      updateLocalScore(localScore.player_id, 0)
                    } else {
                      const numValue = parseInt(value, 10)
                      if (!isNaN(numValue) && numValue >= -10 && numValue <= 40) {
                        updateLocalScore(localScore.player_id, numValue)
                      }
                    }
                  }}
                  min="-10"
                  max="40"
                  placeholder="0"
                />
                <div className="setView__score-buttons">
                  <button 
                    className="setView__score-btn setView__score-btn--up"
                    onClick={() => incrementScore(localScore.player_id)}
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button 
                    className="setView__score-btn setView__score-btn--down"
                    onClick={() => decrementScore(localScore.player_id)}
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="setView__action-section">
          <button 
            className="setView__action-btn"
            onClick={saveRound}
            disabled={isSaving}
          >
            {isSaving ? 'Saving round...' : `Save round ${currentRound}`}
          </button>
        </div>
      </section>

      {/* Leaderboard */}
      <div className="setView__leaderboard">
        <h3 className="setView__leaderboard-title">Current Game Set Leaderboard</h3>
        <div className="setView__leaderboard-list">
          {leaderboard.map((entry, index) => (
            <div key={entry.player.id} className="setView__leaderboard-item">
              <span className="setView__leaderboard-rank">{index + 1}.</span>
              <span className="setView__leaderboard-name">{entry.player.name}</span>
              <span className="setView__leaderboard-score">{entry.totalScore} pts</span>
            </div>
          ))}
        </div>
      </div>
      </main>
    </div>
  )
}

export default SetView