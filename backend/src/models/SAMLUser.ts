import mongoose, { Document, Schema } from 'mongoose';

interface ISAMLUser extends Document {
  email: string;
  name: string;
  id: string;
  is_admin: boolean;
}

const SAMLUserSchema = new Schema<ISAMLUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  id: {
    type: String,
    required: true
  },
  is_admin: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model<ISAMLUser>('User', SAMLUserSchema);