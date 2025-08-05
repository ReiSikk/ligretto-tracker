import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSessionContext } from '@supabase/auth-helpers-react'

interface Player {
  id: string;
  name: string;
}

interface GameSet {
  id: string;
  name: string;
  created_at: string;
  player_ids?: string[];
}

interface Score {
  id?: string;
  game_set_id: string;
  player_id: string;
  score: number;
  round_number: number;
  user_id: string;
  created_at?: string;
  player?: Player;
}

interface LocalScore {
  player_id: string;
  score: number;
  player: Player;
}

function SetView() {
  const { setId } = useParams<{ setId: string }>()
  const navigate = useNavigate()
  const { session } = useSessionContext()
  const userId = session?.user?.id

  // Simplified state
  const [gameSet, setGameSet] = useState<GameSet | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentScores, setCurrentScores] = useState<LocalScore[]>([])
  const [allScores, setAllScores] = useState<Score[]>([])
  const [currentRound, setCurrentRound] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (setId) {
      fetchSetData()
    }
  }, [setId])

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

      // Fetch players for this set
      if (setData.player_ids && setData.player_ids.length > 0) {
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, name')
          .in('id', setData.player_ids)

        if (playersError) throw playersError
        const playersList = playersData || []
        setPlayers(playersList)

        // Initialize scores
        resetScores(playersList)

        // Fetch all historical scores
        await fetchAllScores()
      }

    } catch (error) {
      console.error('Error fetching set data:', error)
    } finally {
      setIsLoading(false)
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
      <div className="setView__game-info">
        <div className="setView__game-title fp-col">
          <span className=''>{gameSet.name}</span>
          <span>Round {currentRound}</span>
        </div>
        <div className="setView__rounds-info">
          {roundsCompleted} rounds completed
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