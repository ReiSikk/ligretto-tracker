import { useState, useEffect } from 'react'
import { X, Play } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSessionContext } from '@supabase/auth-helpers-react'


interface Player {
  id: string;
  name: string;
}

interface CreateGameSetProps {
  onClose: () => void;
  onCreateGame: (setName: string, selectedPlayers: string[]) => void;
}

function CreateGameSet({ onClose, onCreateGame }: CreateGameSetProps) {
  const { session } = useSessionContext()
    const user = session?.user
  const [setName, setSetName] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  console.log('Selected Players:', selectedPlayers);
  const [isCreating, setIsCreating] = useState(false)
  const [existingPlayers, setExistingPlayers] = useState<Player[]>([])
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [isAddingPlayer, setIsAddingPlayer] = useState(false)

    // Fetch players on mount
  useEffect(() => {
    fetchPlayers()
  }, [])

    const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name')
        .order('name')

      if (error) {
        console.error('Error fetching players:', error)
        return
      }

      setExistingPlayers(data || [])
    } catch (error) {
      console.error('Unexpected error fetching players:', error)
    } finally {
      setIsLoadingPlayers(false)
    }
  }

    const addNewPlayer = async () => {
    const trimmedName = newPlayerName.trim()
    
    if (!trimmedName || isAddingPlayer) return

    // Check if player already exists
    const playerExists = existingPlayers.some(
      player => player.name.toLowerCase() === trimmedName.toLowerCase()
    )

    if (playerExists) {
      alert('Player already exists!')
      return
    }

    setIsAddingPlayer(true)

    try {
      const { data, error } = await supabase
        .from('players')
        .insert([{ name: trimmedName }])
        .select()

      if (error) {
        console.error('Error adding player:', error)
        alert('Failed to add player. Please try again.')
        return
      }

      if (data && data[0]) {
        // Add to existing players list
        setExistingPlayers(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
        // Auto-select the new player
        setSelectedPlayers(prev => [...prev, data[0].name])
        // Clear input
        setNewPlayerName('')
      }
    } catch (error) {
      console.error('Unexpected error adding player:', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setIsAddingPlayer(false)
    }
  }
  

  const togglePlayerSelection = (playerName: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerName) 
        ? prev.filter(name => name !== playerName)
        : [...prev, playerName]
    )
  }

  const removeSelectedPlayer = (playerName: string) => {
    setSelectedPlayers(prev => prev.filter(name => name !== playerName))
  }

   const handleCreateGame = async () => {
    if (!setName.trim() || selectedPlayers.length < 2 || isCreating) {
      return
    }

    setIsCreating(true)

    try {
      // Insert game set into Supabase DB
      const { data, error } = await supabase
        .from('game_sets')
        .insert([
          {
            name: setName.trim(),
            created_at: new Date().toISOString(),
            user_id: user ? user.id : null,
            player_ids: selectedPlayers.map(name => {
              const player = existingPlayers.find(p => p.name === name)
              return player ? player.id : null
            }).filter(id => id !== null)

          }
        ])
        .select()

      if (error) {
        console.error('Error creating game set:', error)
        alert('Failed to create game set. Please try again.')
        return
      }

      console.log('Game set created:', data)
      onCreateGame(setName.trim(), selectedPlayers)
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="createGameSet">
      <div className="createGameSet__header">
        <button className="createGameSet__cancel-btn" onClick={onClose}>
          <span>Cancel</span>
          <div className="icon">
            <X height={16} width={16} />
          </div>
        </button>
      </div>

      <div className="createGameSet__content">
        <h1 className="createGameSet__title">Create new game set</h1>
        <p className="createGameSet__subtitle">
          Set up a new scoring session for your Ligretto games
        </p>

        <div className="createGameSet__field">
          <label className="createGameSet__label">Set Name</label>
          <input 
            type="text"
            className="createGameSet__input"
            placeholder="e.g., Saaremaa, Tournament Round 1"
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
          />
        </div>

        <div className="createGameSet__field">
          <label className="createGameSet__label">
            Selected Players ({selectedPlayers.length})
          </label>
          <div className="createGameSet__selected-players">
            {selectedPlayers.map(playerName => (
              <div key={playerName} className="createGameSet__selected-player">
                <span>{playerName}</span>
                <button onClick={() => removeSelectedPlayer(playerName)}>
                  <X height={14} width={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

         <div className="createGameSet__field">
          <label className="createGameSet__label">Select from Existing Players</label>
          {isLoadingPlayers ? (
            <p>Loading players...</p>
          ) : (
            <div className="createGameSet__player-grid">
              {existingPlayers.map(player => (
                <button
                  key={player.id}
                  className={`createGameSet__player-btn ${
                    selectedPlayers.includes(player.name) ? 'createGameSet__player-btn--selected' : ''
                  }`}
                  onClick={() => togglePlayerSelection(player.name)}
                  disabled={isCreating}
                >
                  {player.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="createGameSet__field">
          <label className="createGameSet__label">Add New Player</label>
          <div className="createGameSet__add-player-form">
            <input
              type="text"
              className="createGameSet__input"
              placeholder="Enter player name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              disabled={isAddingPlayer || isCreating}
              onKeyUp={(e) => e.key === 'Enter' && addNewPlayer()}
            />
            <button 
              className="createGameSet__add-player-btn"
              onClick={addNewPlayer}
              disabled={!newPlayerName.trim() || isAddingPlayer || isCreating}
            >
              {isAddingPlayer ? 'Adding...' : 'Add Player'}
            </button>
          </div>
        </div>
      </div>

      <div className="createGameSet__footer">
        <button 
          className="createGameSet__create-btn"
          onClick={handleCreateGame}
          disabled={!setName.trim() || selectedPlayers.length < 2 || isCreating}
        >
          <span>{isCreating ? 'Creating...' : 'Create Game'}</span>
          <div className="icon">
            <Play height={16} width={16} />
          </div>
        </button>
      </div>
    </div>
  )
}

export default CreateGameSet