import mongoose from 'mongoose';
import { type ObjectId } from 'mongoose';

export interface PlayerDocument extends mongoose.Document {
  userId: ObjectId;
  nickname: string;
  skillLevel: number;  // Can be a rating from 1-10
  handedness: 'left' | 'right' | 'ambidextrous';
  preferredPosition: 'forehand' | 'backhand' | 'both';
  contactPhone?: string;
  bio?: string;
  profileImage?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const playerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  nickname: {
    type: String,
    required: [true, 'Nickname is required'],
    trim: true,
    minlength: [2, 'Nickname must be at least 2 characters long'],
    maxlength: [20, 'Nickname cannot be longer than 20 characters'],
    index: true
  },
  skillLevel: {
    type: Number,
    required: true,
    min: [1, 'Skill level must be at least 1'],
    max: [10, 'Skill level cannot be greater than 10'],
    default: 5
  },
  handedness: {
    type: String,
    enum: {
      values: ['left', 'right', 'ambidextrous'],
      message: '{VALUE} is not a valid handedness'
    },
    default: 'right'
  },
  preferredPosition: {
    type: String,
    enum: {
      values: ['forehand', 'backhand', 'both'],
      message: '{VALUE} is not a valid position'
    },
    default: 'both'
  },
  contactPhone: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^\+?[\d\s-]+$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number`
    }
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be longer than 500 characters']
  },
  profileImage: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add index for performance
playerSchema.index({ nickname: 'text' });

export const PlayerModel = mongoose.models.Player || mongoose.model<PlayerDocument>('Player', playerSchema);
