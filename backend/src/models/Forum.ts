import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// ForumEvent Interfaces and Schema
// ============================================

// Interface for rating subdocument
interface ICustomRating {
    question: string;
    rating: number;
}

interface IRating {
    userId: mongoose.Types.ObjectId;
    isAnonymous: boolean;
    overall: number;
    wouldRepeat: number;
    customRatings: ICustomRating[];
    createdAt: Date;
}

// Interface for ForumEvent document
interface IForumEvent extends Document {
    title: string;
    description: string;
    createdBy: mongoose.Types.ObjectId;
    staffHost?: mongoose.Types.ObjectId;
    eventDate: Date;
    location: string;
    engageEventId?: string;
    ratingUntil: Date;
    ratings: IRating[];
    customQuestions: string[];
}

// Schema for ForumEvent
const ForumEventSchema = new Schema<IForumEvent>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SAMLUser',
            required: true,
        },
        staffHost: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Staff',
        },
        eventDate: {
            type: Date,
            required: true,
        },
        location: {
            type: String,
            required: true,
            trim: true,
        },
        engageEventId: {
            type: String,
            sparse: true,
            unique: true,
        },
        ratingUntil: {
            type: Date,
            required: true,
        },
        ratings: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'SAMLUser',
                    required: true,
                },
                isAnonymous: {
                    type: Boolean,
                    default: false,
                },
                overall: {
                    type: Number,
                    required: true,
                    min: 1,
                    max: 5,
                },
                wouldRepeat: {
                    type: Number,
                    required: true,
                    min: 1,
                    max: 5,
                },
                customRatings: [
                    {
                        question: {
                            type: String,
                            required: true,
                        },
                        rating: {
                            type: Number,
                            required: true,
                            min: 1,
                            max: 5,
                        },
                    },
                ],
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        customQuestions: [
            {
                type: String,
                trim: true,
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Instance methods for ForumEvent
ForumEventSchema.methods.hasUserRated = function(userId: string): boolean {
    return this.ratings.some((rating: IRating) => 
        rating.userId.toString() === userId.toString()
    );
};

ForumEventSchema.methods.getAverageRatings = function() {
    if (this.ratings.length === 0) {
        return {
            overall: 0,
            wouldRepeat: 0,
            customQuestions: {},
            totalResponses: 0,
        };
    }

    const totalResponses = this.ratings.length;
    let overallSum = 0;
    let wouldRepeatSum = 0;
    const customSums: { [key: string]: number } = {};

    this.ratings.forEach((rating: IRating) => {
        overallSum += rating.overall;
        wouldRepeatSum += rating.wouldRepeat;
        
        rating.customRatings.forEach((custom: ICustomRating) => {
            if (!customSums[custom.question]) {
                customSums[custom.question] = 0;
            }
            customSums[custom.question] += custom.rating;
        });
    });

    const customAverages: { [key: string]: number } = {};
    Object.keys(customSums).forEach(question => {
        customAverages[question] = customSums[question] / totalResponses;
    });

    return {
        overall: overallSum / totalResponses,
        wouldRepeat: wouldRepeatSum / totalResponses,
        customQuestions: customAverages,
        totalResponses,
    };
};

const ForumEvent = mongoose.model<IForumEvent>('ForumEvent', ForumEventSchema);

// ============================================
// EventComment Interface and Schema
// ============================================

interface IEventComment extends Document {
    eventId: mongoose.Types.ObjectId;
    author: mongoose.Types.ObjectId;
    isAnonymous: boolean;
    content: string;
    isHidden: boolean;
}

const EventCommentSchema = new Schema<IEventComment>(
    {
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ForumEvent',
            required: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SAMLUser',
            required: true,
        },
        isAnonymous: {
            type: Boolean,
            default: false,
        },
        content: {
            type: String,
            required: true,
            maxlength: 1000,
            trim: true,
        },
        isHidden: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Create compound index to ensure one comment per user per event
EventCommentSchema.index({ eventId: 1, author: 1 }, { unique: true });

const EventComment = mongoose.model<IEventComment>('EventComment', EventCommentSchema);

// Export all models and interfaces
export { ForumEvent, EventComment, IForumEvent, IEventComment, IRating, ICustomRating };