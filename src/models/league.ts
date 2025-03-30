import mongoose from 'mongoose';
import { type ObjectId } from 'mongoose';

type LeagueStatus = 'draft' | 'registration' | 'active' | 'completed' | 'canceled';
type MatchFormat = 'bestOf3' | 'bestOf5' | 'singleSet';

export interface LeagueDocument extends mongoose.Document {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  maxTeams: number;
  minTeams: number;
  teams: ObjectId[];  // References to TeamDocuments
  matchFormat: MatchFormat;
  venue?: string;
  status: LeagueStatus;
  banner?: string;
  scheduleGenerated: boolean;
  pointsPerWin: number;
  pointsPerLoss: number;
  organizer: ObjectId;  // Reference to the User who created this league
  createdAt: Date;
  updatedAt: Date;
}

const leagueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'League name is required'],
    trim: true,
    minlength: [3, 'League name must be at least 3 characters long'],
    maxlength: [50, 'League name cannot be longer than 50 characters'],
    index: true
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be longer than 1000 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    validate: {
      validator: function(this: LeagueDocument, startDate: Date) {
        return startDate >= new Date();
      },
      message: 'Start date must be in the future'
    }
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(this: LeagueDocument, endDate: Date) {
        return this.startDate && endDate > this.startDate;
      },
      message: 'End date must be after the start date'
    }
  },
  registrationDeadline: {
    type: Date,
    required: [true, 'Registration deadline is required'],
    validate: {
      validator: function(this: LeagueDocument, deadline: Date) {
        return this.startDate && deadline <= this.startDate;
      },
      message: 'Registration deadline must be before or on the start date'
    }
  },
  maxTeams: {
    type: Number,
    required: [true, 'Maximum number of teams is required'],
    min: [2, 'There must be at least 2 teams'],
    default: 16
  },
  minTeams: {
    type: Number,
    required: [true, 'Minimum number of teams is required'],
    min: [2, 'There must be at least 2 teams'],
    default: 4,
    validate: {
      validator: function(this: LeagueDocument, minTeams: number) {
        return this.maxTeams && minTeams <= this.maxTeams;
      },
      message: 'Minimum teams must be less than or equal to maximum teams'
    }
  },
  teams: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    }],
    default: []
  },
  matchFormat: {
    type: String,
    enum: {
      values: ['bestOf3', 'bestOf5', 'singleSet'],
      message: '{VALUE} is not a valid match format'
    },
    default: 'bestOf3'
  },
  venue: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'registration', 'active', 'completed', 'canceled'],
      message: '{VALUE} is not a valid league status'
    },
    default: 'draft'
  },
  banner: {
    type: String
  },
  scheduleGenerated: {
    type: Boolean,
    default: false
  },
  pointsPerWin: {
    type: Number,
    default: 3,
    min: [1, 'Points per win must be at least 1']
  },
  pointsPerLoss: {
    type: Number,
    default: 0,
    min: [0, 'Points per loss must be at least 0']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Add indexes for performance
leagueSchema.index({ name: 'text' });
leagueSchema.index({ status: 1 });
leagueSchema.index({ startDate: 1 });
leagueSchema.index({ organizer: 1 });

// Method to check if registration is open
leagueSchema.methods.isRegistrationOpen = function(): boolean {
  const now = new Date();
  return this.status === 'registration' && 
         now <= this.registrationDeadline;
};

// Method to check if league is full
leagueSchema.methods.isFull = function(): boolean {
  return this.teams.length >= this.maxTeams;
};

// Method to check if a team is part of this league
leagueSchema.methods.hasTeam = function(teamId: string | ObjectId): boolean {
  return this.teams.some((team: ObjectId) => 
    team.toString() === teamId.toString()
  );
};

export const LeagueModel = mongoose.models.League || mongoose.model<LeagueDocument>('League', leagueSchema);
