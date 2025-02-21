import mongoose, { Document, Schema } from 'mongoose';

// Instructors Schema
interface IInstructor extends Document {
    id: number;
    name: string;
    inclusivity_rating?: number;
    competency_rating?: number;
    challenge_rating?: number;
}

const InstructorSchema = new Schema<IInstructor>({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    inclusivity_rating: {
        type: Number,
    },
    competency_rating: {
        type: Number,
    },
    challenge_rating: {
        type: Number,
    }
});

export const Instructor = mongoose.model<IInstructor>('Instructor', InstructorSchema);

// TODO: Staff??
// TODO: User??