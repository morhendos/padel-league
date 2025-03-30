import mongoose from 'mongoose';
import { type ObjectId } from 'mongoose';

export interface TeamDocument extends mongoose.Document {
  name: string;
  players: ObjectId[];  // References to two PlayerDocuments
  logo?: string;
  description?: string;
  isActive: boolean;
  createdBy: ObjectId;  // Reference to the User who created this team
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    minlength: [2, 'Team name must be at least 2 characters long'],
    maxlength: [30, 'Team name cannot be longer than 30 characters'],
    index: true
  },
  players: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    }],
    validate: {
      validator: function(players: ObjectId[]) {
        // A valid padel team consists of exactly 2 players
        return players.length === 2;
      },
      message: 'A team must have exactly 2 players'
    },
    required: [true, 'Players are required']
  },
  logo: {
    type: String
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot be longer than 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Add indexes for performance
teamSchema.index({ name: 'text' });
teamSchema.index({ players: 1 });

// Method to check if a player is part of this team
teamSchema.methods.hasPlayer = function(playerId: string | ObjectId): boolean {
  return this.players.some((player: ObjectId) => 
    player.toString() === playerId.toString()
  );
};

export const TeamModel = mongoose.models.Team || mongoose.model<TeamDocument>('Team', teamSchema);
