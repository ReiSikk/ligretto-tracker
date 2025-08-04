import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { PostgrestError } from '@supabase/supabase-js'
import { useSessionContext } from '@supabase/auth-helpers-react'

interface Player {
  id: string;
  name: string;
}

interface GameSet {
  id: string;
  name: string;
  created_at: string;
}

interface Game {
  id: string;
  game_set_id: string;
  game_number: number;
  created_at: string;
}

interface Score {
  id: string;
  game_id: string;
  player_id: string;
  score: number;
  player: Player;
}

interface LocalScore {
    player_id: string;
    score: number;
    player: Player;

}

function SetView() {
  const { setId } = useParams<{ setId: string }>()
  const navigate = useNavigate()
  const [gameSet, setGameSet] = useState<GameSet | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  // Scores for the current game and round
  const [allGameScores, setAllGameScores] = useState<Score[]>([])
  const [currentRoundScores, setCurrentRoundScores] = useState<LocalScore[]>([])
  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isStartingGame, setIsStartingGame] = useState(false)
   const [isSaving, setIsSaving] = useState(false)
  const [roundSaved, setRoundSaved] = useState(false)
  // Get game creator data
   const { session } = useSessionContext()
    const userId = session?.user?.id
    console.log(userId, "User")

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

      // Fetch games in this set
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('game_set_id', setId)
        .order('game_number')

      if (gamesError) throw gamesError
      setGames(gamesData || [])

      // Fetch players associated with this set
      const { data: playersData, error: playersError } = await supabase
      .from('players')
        .select('id, name') as unknown as { 
            data: Player[] | null; 
            error: PostgrestError | null 
        }

      if (playersError) throw playersError
      const playersList = playersData || []
      setPlayers(playersList)

      // Get the latest game and its scores
      if (gamesData && gamesData.length > 0) {
        const latestGame = gamesData[gamesData.length - 1]
        setCurrentGame(latestGame)
        await fetchGameScores(latestGame.id)

        // Initialize current round scores with zero values
         initializeCurrentRoundScores(playersList.flat())
      }

    } catch (error) {
      console.error('Error fetching set data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchGameScores = async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('game_scores')
        .select(`
          *,
          players (id, name)
        `)
        .eq('game_id', gameId)

      if (error) throw error
      setAllGameScores(data || [])
    } catch (error) {
      console.error('Error fetching scores:', error)
    }
  }

    const initializeCurrentRoundScores = (playersList: Player[]) => {
    const initialScores: LocalScore[] = playersList.map(player => ({
      player_id: player.id,
      score: 0,
      player: player
    }))
    setCurrentRoundScores(initialScores)
    setRoundSaved(false)
  }

  const startNewGame = async () => {
    if (!gameSet || !players.length) return

    setIsStartingGame(true)

    try {
      const gameNumber = games.length + 1

      // Create new game
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .insert([{
          game_set_id: setId,
          game_number: gameNumber,
          user_id: userId
        }])
        .select()
        .single()

      if (gameError) throw gameError

      setCurrentGame(gameData)
      
      // Reset local scores for new round
      initializeCurrentRoundScores(players)

       
      // Refresh games list
      await fetchSetData()


    } catch (error) {
      console.error('Error starting new game:', error)
      alert('Failed to start new game. Please try again.')
    } finally {
      setIsStartingGame(false)
    }
  }

   const updateLocalScore = (playerId: string, newScore: number) => {
    setCurrentRoundScores(prev => 
      prev.map(score => 
        score.player_id === playerId ? { ...score, score: newScore } : score
      )
    )
  }

  // Single round tracking
   const incrementScore = (playerId: string) => {
    const currentScore = currentRoundScores.find(s => s.player_id === playerId)?.score || 0
    updateLocalScore(playerId, currentScore + 1)
  }

  const decrementScore = (playerId: string) => {
    const currentScore = currentRoundScores.find(s => s.player_id === playerId)?.score || 0
    if (currentScore > 0) {
      updateLocalScore(playerId, currentScore - 1)
    }
  }

    const saveRound = async () => {
    if (!currentGame) return

    setIsSaving(true)
    try {
      // Prepare scores for database insertion
      const scoresToSave = currentRoundScores.map(localScore => ({
          game_id: currentGame.id,
          player_id: localScore.player_id,
          score: localScore.score,
          creator_id: userId,
      }))

      // Save scores to database
      const { error: scoresError } = await supabase
        .from('game_scores')
        .insert(scoresToSave)

      if (scoresError) throw scoresError

      // Refresh all game scores for leaderboard
      await fetchGameScores(currentGame.id)

      setRoundSaved(true)
      setTimeout(() => setRoundSaved(false), 2000)

      // Reset current round scores
        initializeCurrentRoundScores(players)

    } catch (error) {
      console.error('Error saving round:', error)
      alert('Failed to save round. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate total scores for leaderboard
  const calculateTotalScores = () => {
    const totals = new Map<string, number>()
    
    players.forEach(player => {
      totals.set(player.id, 0)
    })

    // You would need to fetch all games and scores for this set
    // For now, just use current game scores
    allGameScores.forEach(score => {
      const current = totals.get(score.player_id) || 0
      totals.set(score.player_id, current + score.score)
    })

    return Array.from(totals.entries())
      .map(([playerId, totalScore]) => ({
        player: players.find(p => p.id === playerId)!,
        totalScore
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
  }

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
        <button onClick={() => navigate('/dashboard')} className="btn-main">
          Back to Dashboard
        </button>
      </div>
    )
  }

  const leaderboard = calculateTotalScores()

  return (
  <div className="setView">
      {/* Header */}
      <div className="setView__header">
        <div className="setView__title">Ligretto</div>
        <button 
          className="setView__back-btn"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={16} />
          Back to sets
        </button>
      </div>

      {/* Track Game Section */}
      <div className="setView__track-section">
        <h2 className="setView__track-title">Track game</h2>
      </div>

      {/* Game Info */}
      <div className="setView__game-info">
        <div className="setView__game-title">
          Game {currentGame?.game_number || games.length + 1} - {gameSet.name}
        </div>
        <div className="setView__rounds-info">
          {games.length} rounds completed
        </div>
      </div>

      {/* Scores Section */}
      <div className="setView__scores-section">
        <h3 className="setView__scores-title">ENTER SCORES</h3>
        
        <div className="setView__score-inputs">
          {currentRoundScores.map(localScore => (
            <div key={localScore.player_id} className="setView__score-input-row">
              <label className="setView__player-label">{localScore.player.name}</label>
              <div className="setView__score-controls">
                <input
                    type="number"
                    className="setView__score-number"
                    value={localScore.score === 0 ? '' : localScore.score} // Show empty string instead of 0
                    onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || value === '-') {
                        // Allow empty string and lone minus sign for better UX
                        updateLocalScore(localScore.player_id, 0)
                        } else {
                        const numValue = parseInt(value, 10)
                        if (!isNaN(numValue) && numValue >= -10) {
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
          {roundSaved ? (
            <>
              <button 
                className="setView__action-btn setView__action-btn--new-round"
                onClick={startNewGame}
                disabled={isStartingGame}
              >
                {isStartingGame ? 'Starting...' : 'Start new round'}
              </button>
              <div className="setView__saved-indicator">Saved!</div>
            </>
          ) : (
            <button 
              className="setView__action-btn"
              onClick={currentGame ? saveRound : startNewGame}
              disabled={isSaving || isStartingGame}
            >
              {currentGame 
                ? (isSaving ? 'Saving...' : 'Save round')
                : (isStartingGame ? 'Starting...' : 'Start first game')
              }
            </button>
          )}
        </div>
      </div>

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
    </div>
  )
}

export default SetView