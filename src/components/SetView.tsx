import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'

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

function SetView() {
  const { setId } = useParams<{ setId: string }>()
  const navigate = useNavigate()
  const [gameSet, setGameSet] = useState<GameSet | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isStartingGame, setIsStartingGame] = useState(false)

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
        .from('game_set_players')
        .select(`
          player_id,
          players (id, name)
        `)
        .eq('game_set_id', setId)

      if (playersError) throw playersError
      const playersList = playersData?.map(item => item.players).filter(Boolean) || []
      setPlayers(playersList.flat())

      // Get the latest game and its scores
      if (gamesData && gamesData.length > 0) {
        const latestGame = gamesData[gamesData.length - 1]
        setCurrentGame(latestGame)
        await fetchGameScores(latestGame.id)
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
        .from('scores')
        .select(`
          *,
          players (id, name)
        `)
        .eq('game_id', gameId)

      if (error) throw error
      setScores(data || [])
    } catch (error) {
      console.error('Error fetching scores:', error)
    }
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
          game_number: gameNumber
        }])
        .select()
        .single()

      if (gameError) throw gameError

      // Initialize scores for all players
      const initialScores = players.map(player => ({
        game_id: gameData.id,
        player_id: player.id,
        score: 0
      }))

      const { error: scoresError } = await supabase
        .from('scores')
        .insert(initialScores)

      if (scoresError) throw scoresError

      // Refresh data
      await fetchSetData()

    } catch (error) {
      console.error('Error starting new game:', error)
      alert('Failed to start new game. Please try again.')
    } finally {
      setIsStartingGame(false)
    }
  }

  const updateScore = async (scoreId: string, newScore: number) => {
    try {
      const { error } = await supabase
        .from('scores')
        .update({ score: newScore })
        .eq('id', scoreId)

      if (error) throw error

      // Update local state
      setScores(prev => prev.map(score => 
        score.id === scoreId ? { ...score, score: newScore } : score
      ))

    } catch (error) {
      console.error('Error updating score:', error)
      alert('Failed to update score. Please try again.')
    }
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

  return (
    <div className="setView">
      <div className="setView__header">
        <button 
          className="setView__back-btn"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="setView__title-section">
          <h1 className="setView__title">{gameSet.name}</h1>
          <p className="setView__subtitle">
            {games.length} game{games.length !== 1 ? 's' : ''} played
          </p>
        </div>
      </div>

      <div className="setView__content">
        {currentGame ? (
          <div className="setView__current-game">
            <div className="setView__game-header">
              <h2 className="setView__game-title">
                Game {currentGame.game_number}
              </h2>
              <button 
                className="setView__new-game-btn"
                onClick={startNewGame}
                disabled={isStartingGame}
              >
                {isStartingGame ? 'Starting...' : 'New Game'}
                <Plus size={16} />
              </button>
            </div>

            <div className="setView__scoreboard">
              {scores.map(score => (
                <div key={score.id} className="setView__score-row">
                  <span className="setView__player-name">
                    {score.player.name}
                  </span>
                  <input
                    type="number"
                    className="setView__score-input"
                    value={score.score}
                    onChange={(e) => updateScore(score.id, parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="setView__no-games">
            <h2>No games yet</h2>
            <p>Start your first game to begin tracking scores</p>
            <button 
              className="setView__start-first-game-btn"
              onClick={startNewGame}
              disabled={isStartingGame || !players.length}
            >
              <Play size={20} />
              <span>{isStartingGame ? 'Starting...' : 'Start First Game'}</span>
            </button>
          </div>
        )}

        {games.length > 1 && (
          <div className="setView__game-history">
            <h3>Game History</h3>
            <div className="setView__games-list">
              {games.map(game => (
                <button
                  key={game.id}
                  className={`setView__game-item ${
                    currentGame?.id === game.id ? 'setView__game-item--active' : ''
                  }`}
                  onClick={() => {
                    setCurrentGame(game)
                    fetchGameScores(game.id)
                  }}
                >
                  Game {game.game_number}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SetView