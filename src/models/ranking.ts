import mongoose from 'mongoose';
import { type ObjectId } from 'mongoose';

export interface RankingDocument extends mongoose.Document {
  league: ObjectId;
  team: ObjectId;
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

const rankingSchema = new mongoose.Schema({
  league: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'League',
    required: [true, 'League is required']
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Team is required']
  },
  rank: {
    type: Number,
    min: [1, 'Rank must be at least 1'],
    default: 1
  },
  matchesPlayed: {
    type: Number,
    default: 0,
    min: [0, 'Matches played cannot be negative']
  },
  matchesWon: {
    type: Number,
    default: 0,
    min: [0, 'Matches won cannot be negative']
  },
  matchesLost: {
    type: Number,
    default: 0,
    min: [0, 'Matches lost cannot be negative']
  },
  setsWon: {
    type: Number,
    default: 0,
    min: [0, 'Sets won cannot be negative']
  },
  setsLost: {
    type: Number,
    default: 0,
    min: [0, 'Sets lost cannot be negative']
  },
  gamesWon: {
    type: Number,
    default: 0,
    min: [0, 'Games won cannot be negative']
  },
  gamesLost: {
    type: Number,
    default: 0,
    min: [0, 'Games lost cannot be negative']
  },
  points: {
    type: Number,
    default: 0,
    min: [0, 'Points cannot be negative']
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound unique index to ensure one ranking entry per team per league
rankingSchema.index({ league: 1, team: 1 }, { unique: true });
rankingSchema.index({ league: 1, rank: 1 });
rankingSchema.index({ league: 1, points: -1 }); // For sorting by points in descending order

// Method to calculate win percentage
rankingSchema.methods.getWinPercentage = function(): number {
  if (this.matchesPlayed === 0) {
    return 0;
  }
  return (this.matchesWon / this.matchesPlayed) * 100;
};

// Method to calculate set differential
rankingSchema.methods.getSetDifferential = function(): number {
  return this.setsWon - this.setsLost;
};

// Method to calculate game differential
rankingSchema.methods.getGameDifferential = function(): number {
  return this.gamesWon - this.gamesLost;
};

// Method to update stats with a new match result
rankingSchema.methods.updateWithMatchResult = function(
  isWinner: boolean,
  setsWon: number,
  setsLost: number,
  gamesWon: number,
  gamesLost: number,
  pointsPerWin: number,
  pointsPerLoss: number
): void {
  this.matchesPlayed += 1;
  
  if (isWinner) {
    this.matchesWon += 1;
    this.points += pointsPerWin;
  } else {
    this.matchesLost += 1;
    this.points += pointsPerLoss;
  }
  
  this.setsWon += setsWon;
  this.setsLost += setsLost;
  this.gamesWon += gamesWon;
  this.gamesLost += gamesLost;
  this.lastUpdated = new Date();
};

export const RankingModel = mongoose.models.Ranking || mongoose.model<RankingDocument>('Ranking', rankingSchema);
