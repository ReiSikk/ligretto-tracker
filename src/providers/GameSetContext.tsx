import React, { 
  createContext, 
  useState, 
  useContext, 
  useCallback 
} from 'react';
import type { ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { GameSet, GameSetContextType } from '../lib/types';

const GameSetContext = createContext<GameSetContextType | undefined>(undefined);

export const GameSetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameSets, setGameSets] = useState<GameSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const fetchGameSets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('game_sets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGameSets(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch game sets:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

//   const createGameSet = useCallback(async (name: string) => {
//     setLoading(true);
//     setError(null);

//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) throw new Error('User not authenticated');

//       const { data, error } = await supabase
//         .from('game_sets')
//         .insert({ 
//           name, 
//           admin_ids: [user.id] 
//         })
//         .select()
//         .single();

//       if (error) throw error;
      
//       // Optimistically update local state
//       setGameSets(prev => [data, ...prev]);
//     } catch (err: any) {
//       setError(err.message);
//       console.error('Failed to create game set:', err);
//     } finally {
//       setLoading(false);
//     }
//   }, [supabase]);

const deleteGameSet = useCallback(async (gameSetId: string) => {
  setLoading(true);
  setError(null);

  try {
    const { error } = await supabase
      .from('game_sets')
      .delete()
      .eq('id', gameSetId);

    if (error) throw error;
    
    // Optimistically remove from local state
    setGameSets(prev => prev.filter(gs => gs.id !== gameSetId));
  } catch (err: any) {
    setError(err.message);
    console.error('Failed to delete game set:', err);
  } finally {
    setLoading(false);
  }
}, [supabase]);

// Function to add more admins to a single game set
const addAdmin = useCallback(async (gameSetId: string, email: string) => {
  setLoading(true);
  setError(null);
  console.log('Adding admin:', { gameSetId, email });

  try {
    const { data, error } = await supabase.functions.invoke('add-admin', {
      body: JSON.stringify({ 
        email, 
        gameSetId 
      })
    });

    console.log('Function response:', data, error);

    if (error) {
      throw new Error(error.message || 'Failed to add admin');
    }

    // Check the response
    if (data.alreadyAdmin) {
      // Optionally show a toast or alert
      alert('This user is already an admin');
      return;
    }

    // If successful, update the local game sets
    const updatedGameSet = data.gameSet;
    setGameSets(prev => 
      prev.map(set => 
        set.id === gameSetId ? updatedGameSet : set
      )
    );
    console.log('Admin added successfully:', updatedGameSet);

    // Optional: show success message
    alert('Admin added successfully');

  } catch (err: any) {
    setError(err.message);
    console.error('Failed to add admin:', err);
    
    // More specific error handling
    if (err.message.includes('User lookup failed')) {
      alert('User not found. Please check the email address.');
    } else {
      alert('Failed to add admin. Please try again.');
    }
    
    throw err;
  } finally {
    setLoading(false);
  }
}, [supabase, setGameSets]);

// Get authenticated admins users info to display in game sets UI
const getAdminsByIds = useCallback(async (userIds: string[]) => {
  if (!userIds || userIds.length === 0) return [];
  
  try {
    const { data, error } = await supabase.rpc('get_admins_by_ids', {
      user_ids: userIds
    });

    if (error) throw error;
    return data || [];
    
  } catch (err: any) {
    console.error('Failed to fetch admins:', err);
    
    // Fallback: Return structure matching database function
    return userIds.map(id => ({
      id,
      email: 'Unknown User',
      user_metadata: {}
    }));
  }
}, [supabase]);

const removeAdmin = useCallback(async (gameSetId: string, adminIdToRemove: string) => {
  setLoading(true)
  setError(null)

  try {
    const { data, error } = await supabase.rpc('remove_game_set_admin', {
      p_game_set_id: gameSetId,
      p_admin_to_remove: adminIdToRemove
    })

    if (error) {
      throw new Error(error.message || 'Failed to remove admin')
    }

    if (!data) {
      throw new Error('Admin removal failed')
    }

    console.log('Admin removed successfully')
    return true

  } catch (err: any) {
    setError(err.message)
    console.error('Failed to remove admin:', err)
    
    if (err.message.includes('Only the set creator')) {
      alert('Only the set creator can remove admins')
    } else {
      alert('Failed to remove admin. Please try again.')
    }
    
    throw err
  } finally {
    setLoading(false)
  }
}, [supabase])

  return (
    <GameSetContext.Provider value={{
      gameSets,
      loading,
      error,
      fetchGameSets,
      getAdminsByIds,
      player: [], // Placeholder, can be updated later
    //   createGameSet,
      deleteGameSet,
      addAdmin,
      removeAdmin
    }}>
      {children}
    </GameSetContext.Provider>
  );
};

// Custom hook for using GameSet context
export const useGameSets = () => {
  const context = useContext(GameSetContext);
  if (context === undefined) {
    throw new Error('useGameSets must be used within a GameSetProvider');
  }
  return context;
};