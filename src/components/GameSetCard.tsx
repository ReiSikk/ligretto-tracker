import React from 'react'

interface Player {
  name: string;
  score: number;
}

interface GameSetCardProps {
  title: string;
  players: Player[];
}



function GameSetCard({ title, players }: GameSetCardProps) {
   return (
    <div className="gameSetCard">
      <div className="gameSetCard__header">
        <h2 className="gameSetCard__title">{title}</h2>
      </div>
      
      <table className="gameSetCard__table">
        <thead className="gameSetCard__table-header">
          <tr>
            <th className="gameSetCard__table-header-cell">PLAYERS</th>
            <th className="gameSetCard__table-header-cell gameSetCard__table-header-cell--score">SCORE</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr key={index} className="gameSetCard__table-row">
              <td className="gameSetCard__table-cell">
                <span className="gameSetCard__player-name">{player.name}</span>
              </td>
              <td className="gameSetCard__table-cell gameSetCard__table-cell--score">
                {player.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default GameSetCard