import mongoose, { Document, Schema } from 'mongoose';

interface ISAMLUser extends Document {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
}

const SAMLUserSchema = new Schema<ISAMLUser>({
  id: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model<ISAMLUser>('SAMLUser', SAMLUserSchema);