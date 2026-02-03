import mongoose, { Document, Schema } from 'mongoose';

// Election Schema
interface IElection extends Document {
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
}

const ElectionSchema = new Schema<IElection>(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Election = mongoose.model<IElection>('Election', ElectionSchema);

// Candidate Schema
interface ICandidate extends Document {
    electionId: mongoose.Types.ObjectId;
    name: string;
    position: string;
}

const CandidateSchema = new Schema<ICandidate>(
    {
        electionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Election',
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        position: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Candidate = mongoose.model<ICandidate>('Candidate', CandidateSchema);

// Student Ballot Info Schema
interface IStudentBallotInfo extends Document {
    electionId: mongoose.Types.ObjectId;
    email: string;
    campusRep: 'north' | 'south';
    year: number;
    hasVoted: boolean;
}

const StudentBallotInfoSchema = new Schema<IStudentBallotInfo>(
    {
        electionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Election',
            required: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
        },
        campusRep: {
            type: String,
            enum: ['north', 'south'],
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
        hasVoted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

StudentBallotInfoSchema.index({ electionId: 1, email: 1 }, { unique: true });

const StudentBallotInfo = mongoose.model<IStudentBallotInfo>(
    'StudentBallotInfo',
    StudentBallotInfoSchema
);

// Vote Schema
interface IVote extends Document {
    electionId: mongoose.Types.ObjectId;
    position: string;
    ranking: mongoose.Types.ObjectId[];
    votes: number;
}

const VoteSchema = new Schema<IVote>(
    {
        electionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Election',
            required: true,
        },
        position: {
            type: String,
            required: true,
        },
        ranking: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Candidate',
            required: true,
        },
        votes: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

VoteSchema.index({ electionId: 1, position: 1, ranking: 1 }, { unique: true });

const Vote = mongoose.model<IVote>('Vote', VoteSchema);

export { Election, Candidate, StudentBallotInfo, Vote };
