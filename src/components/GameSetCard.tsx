import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Player {
  id: string;
  name: string;
  totalScore?: number;
}
interface GameSet {
  id: string;
  name: string;
  created_at: string;
  players?: Player[];
}

interface GameSetCardProps {
  title: string;
  players: Player[];
  gameSet: GameSet;
}


function GameSetCard({ title, players, gameSet }: GameSetCardProps) {
  const navigate = useNavigate()
  const [playersWithScores, setPlayersWithScores] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
    if (gameSet.id) {
      fetchPlayersAndScores()
    }
  }, [gameSet.id])

   const fetchPlayersAndScores = async () => {
    try {
      // Get all games for this game set
      const { data: scoresData, error: scoresError } = await supabase
        .from('game_scores')
        .select('player_id, score')
        .eq('game_set_id', gameSet.id)

      if (scoresError) throw scoresError

      // Calculate player total scores
      const playerTotals = new Map<string, number>()

      // Init players with 0 score
      players.forEach(player => {
        playerTotals.set(player.id, 0)
      })

         // Add up scores from all rounds
      scoresData?.forEach(score => {
        const current = playerTotals.get(score.player_id) || 0
        playerTotals.set(score.player_id, current + score.score)
      })

      // Create players array with total scores
      const playersWithTotalScores = players.map(player => ({
        ...player,
        totalScore: playerTotals.get(player.id) || 0
      }))

      // Sort by total score (highest first)
      playersWithTotalScores.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))

      setPlayersWithScores(playersWithTotalScores)

    } catch (error) {
      console.error('Error fetching players and scores:', error)

      // Set players with 0 scores on error
      const playersWithZeroScores = players.map(player => ({
        ...player,
        totalScore: 0
      }))
      setPlayersWithScores(playersWithZeroScores)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClick = () => {
    navigate(`/set/${gameSet.id}`)
  }

    const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

    if (isLoading) {
    return (
      <li className="gameSetCard" onClick={handleClick}>
        <div className="gameSetCard__header">
          <h2 className="gameSetCard__title">{gameSet.name}</h2>
          <p className="gameSetCard__date">{formatDate(gameSet.created_at)}</p>
        </div>
        <div className="gameSetCard__loading">
          <p>Loading scores...</p>
        </div>
      </li>
    )
  }

   return (
    <div className="gameSetCard" onClick={handleClick}>
      <div className="gameSetCard__header">
        <h2 className="gameSetCard__title">{title}</h2>
      </div>
      
      {playersWithScores.length > 0 ? (
      <table className="gameSetCard__table">
        <thead className="gameSetCard__table-header">
          <tr>
            <th className="gameSetCard__table-header-cell">PLAYERS</th>
            <th className="gameSetCard__table-header-cell gameSetCard__table-header-cell--score">SCORE</th>
          </tr>
        </thead>
        <tbody>
          {playersWithScores.map((player) => (
              <tr key={player.id} className="gameSetCard__table-row">
                <td className="gameSetCard__table-cell">
                  <span className="gameSetCard__player-name">{player.name}</span>
                </td>
                <td className="gameSetCard__table-cell gameSetCard__table-cell--score">
                  <span className="gameSetCard__table-score">
                    {player.totalScore || 0}
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      ) : (
        <div className="gameSetCard__empty">
          <p>No players in this set</p>
        </div>
      )}
    </div>
  );
}

export default GameSetCard