export interface GameSet {
  id: string;
  name: string;
  admin_ids: string[];
  created_at: string;
  user_id?: string; // Original creator's user ID
  player_ids?: string[]; // IDs of players in this game set
  players?: Player[]; // Optional, enriched with player names
}

export interface Score {
  id?: string;
  game_set_id: string;
  player_id: string;
  score: number;
  round_number: number;
  user_id: string;
  created_at?: string;
  player?: Player;
}

export interface Admin {
  id: string;
  email: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
    [key: string]: any;
  };
}

export interface Player {
  id: string;
  name: string;
  totalScore?: number;
}

export interface GameSetContextType {
  gameSets: GameSet[];
  player: Player[];
  loading: boolean;
  error: string | null;
  fetchGameSets: () => Promise<void>;
  getAdminsByIds: (userIds: string[]) => Promise<Admin[]>;
//   createGameSet: (name: string) => Promise<void>;
  deleteGameSet: (gameSetId: string) => Promise<void>;
  addAdmin: (gameSetId: string, email: string) => Promise<void>;
  removeAdmin: (gameSetId: string, adminIdToRemove: string) => Promise<boolean>;
}