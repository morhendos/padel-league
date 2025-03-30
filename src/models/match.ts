import mongoose from 'mongoose';
import { type ObjectId } from 'mongoose';

type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'canceled' | 'postponed';

export interface MatchDocument extends mongoose.Document {
  league: ObjectId;
  teamA: ObjectId;
  teamB: ObjectId;
  scheduledDate: Date;
  scheduledTime?: string;
  location?: string;
  status: MatchStatus;
  actualStartTime?: Date;
  actualEndTime?: Date;
  result?: {
    teamAScore: number[];
    teamBScore: number[];
    winner: ObjectId;
  };
  notes?: string;
  submittedBy?: ObjectId;
  confirmedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const matchSchema = new mongoose.Schema({
  league: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'League',
    required: [true, 'League is required']
  },
  teamA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Team A is required']
  },
  teamB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Team B is required']
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
  scheduledTime: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: props => `${props.value} is not a valid time format (HH:MM)`
    }
  },
  location: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['scheduled', 'in_progress', 'completed', 'canceled', 'postponed'],
      message: '{VALUE} is not a valid match status'
    },
    default: 'scheduled'
  },
  actualStartTime: {
    type: Date
  },
  actualEndTime: {
    type: Date,
    validate: {
      validator: function(this: MatchDocument, endTime: Date) {
        return !this.actualStartTime || !endTime || endTime > this.actualStartTime;
      },
      message: 'End time must be after the start time'
    }
  },
  result: {
    teamAScore: {
      type: [Number],
      validate: {
        validator: function(scores: number[]) {
          return scores.every(score => score >= 0);
        },
        message: 'Scores must be non-negative'
      }
    },
    teamBScore: {
      type: [Number],
      validate: {
        validator: function(scores: number[]) {
          return scores.every(score => score >= 0);
        },
        message: 'Scores must be non-negative'
      }
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      validate: {
        validator: function(this: any, winner: ObjectId) {
          return !winner || winner.equals(this.teamA) || winner.equals(this.teamB);
        },
        message: 'Winner must be one of the participating teams'
      }
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be longer than 500 characters']
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Add indexes for performance
matchSchema.index({ league: 1, scheduledDate: 1 });
matchSchema.index({ teamA: 1, teamB: 1 });
matchSchema.index({ status: 1 });

// Method to check if a match has a valid result
matchSchema.methods.hasValidResult = function(): boolean {
  if (!this.result || !this.result.teamAScore || !this.result.teamBScore) {
    return false;
  }
  
  // Check that we have the same number of sets
  if (this.result.teamAScore.length !== this.result.teamBScore.length) {
    return false;
  }
  
  // Check that there is at least one set
  if (this.result.teamAScore.length === 0) {
    return false;
  }
  
  // Check for a winner
  let teamAWins = 0;
  let teamBWins = 0;
  
  for (let i = 0; i < this.result.teamAScore.length; i++) {
    if (this.result.teamAScore[i] > this.result.teamBScore[i]) {
      teamAWins++;
    } else if (this.result.teamBScore[i] > this.result.teamAScore[i]) {
      teamBWins++;
    }
  }
  
  // Ensure one team has more wins
  return teamAWins !== teamBWins;
};

// Method to determine the winner based on scores
matchSchema.methods.calculateWinner = function(): ObjectId | null {
  if (!this.hasValidResult()) {
    return null;
  }
  
  let teamAWins = 0;
  let teamBWins = 0;
  
  for (let i = 0; i < this.result.teamAScore.length; i++) {
    if (this.result.teamAScore[i] > this.result.teamBScore[i]) {
      teamAWins++;
    } else if (this.result.teamBScore[i] > this.result.teamAScore[i]) {
      teamBWins++;
    }
  }
  
  if (teamAWins > teamBWins) {
    return this.teamA;
  } else if (teamBWins > teamAWins) {
    return this.teamB;
  }
  
  return null;
};

export const MatchModel = mongoose.models.Match || mongoose.model<MatchDocument>('Match', matchSchema);
