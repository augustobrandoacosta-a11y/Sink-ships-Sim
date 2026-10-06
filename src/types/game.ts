export type ShipId =
  | 'titanic'
  | 'lusitania'
  | 'atlantic'
  | 'france'
  | 'cruise_ship'
  | 'bismarck'
  | 'container_ship';

export interface ShipSpec {
  id: ShipId;
  name: string;
  subtitle: string;
  era: string;
  lengthMeters: number;
  displacementTons: number;
  maxHp: number;
  armorRating: number; // 1-5
  colorPalette: {
    hullTop: string;
    hullBottom: string;
    superstructure: string;
    deck: string;
    funnels: string;
    funnelTop: string;
    accent: string;
  };
  funnelCount: number;
  mastCount: number;
  hasContainers?: boolean;
  hasTurrets?: boolean;
  hasWaterSlide?: boolean;
  description: string;
  historicalNote: string;
  initialVotes: number;
}

export type ToolId =
  | 'nuke'
  | 'torpedo'
  | 'split'
  | 'iceberg'
  | 'airstrike'
  | 'kraken';

export interface ToolSpec {
  id: ToolId;
  name: string;
  subtitle: string;
  description: string;
  damage: number;
  cost: number;
  startingAmmo: number;
  cooldownSeconds: number;
  iconName: string;
  tag: string;
  color: string;
  soundType: 'nuke' | 'torpedo' | 'split' | 'iceberg' | 'bomb' | 'kraken';
}

export interface Player {
  id: string;
  name: string;
  color: string;
  isHost?: boolean;
  score: number;
  damageDealt: number;
  cursor?: { x: number; y: number; activeToolId?: ToolId };
  ping?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface WeaponEvent {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  toolId: ToolId;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  damage: number;
  timestamp: number;
}

export type GamePhase = 'voting' | 'playing' | 'sinking' | 'despawning';

export interface MultiplayerGameState {
  phase: GamePhase;
  selectedShipId: ShipId;
  currentHp: number;
  maxHp: number;
  bowHp: number;
  midHp: number;
  sternHp: number;
  floodBow: number;
  floodMid: number;
  floodStern: number;
  isSplit: boolean;
  votes: Record<string, number>;
  votingTimeLeft: number;
  despawnCountdown: number;
  players: Record<string, Player>;
  elapsedSeconds: number;
}

export interface ScoreReport {
  shipName: string;
  basePoints: number;
  timeTakenSeconds: number;
  timeBonus: number;
  toolsUsedCount: number;
  resourceBonus: number;
  styleBonus: number;
  totalScore: number;
  rank: 'S+' | 'S' | 'A' | 'B' | 'C';
  coinsEarned: number;
  achievements: string[];
  mvpPlayerName?: string;
}
