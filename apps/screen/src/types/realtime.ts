export interface Player {
  id: string;
  nickname: string;
  status: string;
  strikes: number;
  joinedAt: string;
  avatar?: string | null;
  isReady?: boolean;
}

export interface CountdownState {
  active: boolean;
  startedAt?: string;
  durationSeconds: number;
  message?: string;
}

export interface GameState {
  gameId: string;
  pin: string;
  status: 'waiting' | 'countdown' | 'active' | 'paused' | 'completed';
  currentNumber?: number;
  drawnNumbers: number[];
  players: Player[];
  playerCount: number;
  countdownState?: CountdownState;
  audioSettings?: {
    countdownEnabled: boolean;
    countdownDurationSeconds: number;
    countdownMessage?: string;
    volumeSettings?: any;
    packs?: {
      lobbyMusic?: string;
      inGameMusic?: string;
      sfx?: string;
      voice?: string;
    };
  };
  playerRoster?: Player[];
}

export interface StateUpdateEvent {
  type: 'state:update';
  data: Partial<GameState>;
}

export interface PlayerJoinEvent {
  type: 'player:join';
  data: {
    player: Player;
    totalCount: number;
  };
}

export interface PlayerLeaveEvent {
  type: 'player:leave';
  data: {
    playerId: string;
    totalCount?: number;
    leftAt?: string;
  };
}

export interface DrawNextEvent {
  type: 'draw:next';
  data: {
    value: number;
    letter: string;
  };
}

export interface CountdownEvent {
  type: 'countdown:start' | 'countdown:update' | 'countdown:end';
  data: {
    timeRemaining?: number;
    startsAt?: number;
    duration?: number;
  };
}

export interface MediaCueEvent {
  type: 'media:cue';
  data: {
    cue: AudioCue;
    volume?: number;
    fadeInMs?: number;
  };
}

export type AudioCue = string;

export interface AudioAsset {
  cue: AudioCue;
  url: string;
  volume: number;
  loop: boolean;
  category: 'music' | 'sfx' | 'voice';
  preload: boolean;
}

export type RealtimeEvent =
  | StateUpdateEvent
  | PlayerJoinEvent
  | PlayerLeaveEvent
  | DrawNextEvent
  | CountdownEvent
  | MediaCueEvent;

export interface AudioContext {
  isEnabled: boolean;
  hasUserGesture: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
}

export interface BigScreenStage {
  stage: 'lobby' | 'countdown' | 'game' | 'completed';
  previousStage?: 'lobby' | 'countdown' | 'game' | 'completed';
  transitionStartedAt?: number;
}
