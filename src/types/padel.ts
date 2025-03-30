import { ObjectId } from 'mongoose';

// Player types
export interface PlayerProfile {
  id: string;
  userId: string;
  nickname: string;
  skillLevel: number;
  handedness: 'left' | 'right' | 'ambidextrous';
  preferredPosition: 'forehand' | 'backhand' | 'both';
  contactPhone?: string;
  bio?: string;
  profileImage?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Team types
export interface TeamProfile {
  id: string;
  name: string;
  players: PlayerProfile[];
  logo?: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// League types
export type LeagueStatus = 'draft' | 'registration' | 'active' | 'completed' | 'canceled';
export type MatchFormat = 'bestOf3' | 'bestOf5' | 'singleSet';

export interface LeagueProfile {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  maxTeams: number;
  minTeams: number;
  teams: TeamProfile[];
  matchFormat: MatchFormat;
  venue?: string;
  status: LeagueStatus;
  banner?: string;
  scheduleGenerated: boolean;
  pointsPerWin: number;
  pointsPerLoss: number;
  organizer: string;
  createdAt: Date;
  updatedAt: Date;
}

// Match types
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'canceled' | 'postponed';

export interface MatchScore {
  teamAScore: number[];
  teamBScore: number[];
  winner: string;
}

export interface MatchProfile {
  id: string;
  league: string;
  teamA: TeamProfile;
  teamB: TeamProfile;
  scheduledDate: Date;
  scheduledTime?: string;
  location?: string;
  status: MatchStatus;
  actualStartTime?: Date;
  actualEndTime?: Date;
  result?: MatchScore;
  notes?: string;
  submittedBy?: string;
  confirmedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Ranking types
export interface RankingProfile {
  id: string;
  league: string;
  team: TeamProfile;
  rank: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// API request/response types
export interface CreatePlayerRequest {
  nickname: string;
  skillLevel: number;
  handedness: 'left' | 'right' | 'ambidextrous';
  preferredPosition: 'forehand' | 'backhand' | 'both';
  contactPhone?: string;
  bio?: string;
  profileImage?: string;
}

export interface CreateTeamRequest {
  name: string;
  players: string[];  // Array of player IDs
  logo?: string;
  description?: string;
}

export interface CreateLeagueRequest {
  name: string;
  description?: string;
  startDate: Date | string;
  endDate: Date | string;
  registrationDeadline: Date | string;
  maxTeams: number;
  minTeams: number;
  matchFormat: MatchFormat;
  venue?: string;
  pointsPerWin: number;
  pointsPerLoss: number;
  banner?: string;
}

export interface ScheduleMatchRequest {
  leagueId: string;
  teamAId: string;
  teamBId: string;
  scheduledDate: Date | string;
  scheduledTime?: string;
  location?: string;
}

export interface SubmitMatchResultRequest {
  matchId: string;
  teamAScore: number[];
  teamBScore: number[];
  notes?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface LeagueFilters {
  status?: LeagueStatus;
  organizer?: string;
  active?: boolean;
  search?: string;
}

export interface MatchFilters {
  leagueId?: string;
  teamId?: string;
  status?: MatchStatus;
  startDate?: Date | string;
  endDate?: Date | string;
}
