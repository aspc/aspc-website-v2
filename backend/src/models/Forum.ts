import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// ForumEvent Interfaces and Schema
// ============================================

// Interface for ForumEvent document
interface IForumEvent extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    createdBy: mongoose.Types.ObjectId;
    staffHost?: mongoose.Types.ObjectId;
    eventDate: Date;
    location: string;
    engageEventId?: string;
    ratingUntil: Date;
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

const ForumEvent = mongoose.model<IForumEvent>('ForumEvent', ForumEventSchema);

// ============================================
// EventReview Interface and Schema
// ============================================

// Interface for rating subdocument
interface ICustomRating {
    question: string;
    rating: number;
}

interface IEventReview extends Document {
    _id: mongoose.Types.ObjectId;
    eventId: mongoose.Types.ObjectId;
    author: mongoose.Types.ObjectId;
    isAnonymous: boolean;
    content: string;
    isHidden: boolean;
    // Rating fields
    overall: number;
    wouldRepeat: number;
    customRatings: ICustomRating[];
}

const EventReviewSchema = new Schema<IEventReview>(
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
            maxlength: 1000,
            trim: true,
        },
        isHidden: {
            type: Boolean,
            default: false,
        },
        // Rating fields
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
    },
    {
        timestamps: true,
    }
);

// Create compound index to ensure one review per user per event
EventReviewSchema.index({ eventId: 1, author: 1 }, { unique: true });

// Optional: Add indexes for aggregation performance
EventReviewSchema.index({ eventId: 1, overall: 1 });
EventReviewSchema.index({ eventId: 1, wouldRepeat: 1 });

// ============================================
// Static Methods for Rating Aggregation
// ============================================

EventReviewSchema.statics.getAverageRatings = async function (
    eventId: string | mongoose.Types.ObjectId
) {
    const result = await this.aggregate([
        {
            $match: {
                eventId: new mongoose.Types.ObjectId(eventId.toString()),
                isHidden: false, // Optional: exclude hidden comments from stats
            },
        },
        {
            $facet: {
                // Calculate overall and wouldRepeat averages
                basicStats: [
                    {
                        $group: {
                            _id: null,
                            overall: { $avg: '$overall' },
                            wouldRepeat: { $avg: '$wouldRepeat' },
                            totalResponses: { $sum: 1 },
                        },
                    },
                ],
                // Calculate custom question averages
                customStats: [
                    { $unwind: '$customRatings' },
                    {
                        $group: {
                            _id: '$customRatings.question',
                            average: { $avg: '$customRatings.rating' },
                        },
                    },
                ],
            },
        },
    ]);

    // Parse results
    const basicStats = result[0]?.basicStats[0] || {
        overall: 0,
        wouldRepeat: 0,
        totalResponses: 0,
    };

    const customQuestions: { [key: string]: number } = {};
    if (result[0]?.customStats) {
        result[0].customStats.forEach(
            (stat: { _id: string; average: number }) => {
                customQuestions[stat._id] = stat.average;
            }
        );
    }

    return {
        overall: basicStats.overall || 0,
        wouldRepeat: basicStats.wouldRepeat || 0,
        customQuestions,
        totalResponses: basicStats.totalResponses || 0,
    };
};

// Optional: Get all ratings for an event (with pagination support)
EventReviewSchema.statics.getRatingsForEvent = async function (
    eventId: string | mongoose.Types.ObjectId,
    options: { skip?: number; limit?: number; includeHidden?: boolean } = {}
) {
    const { skip = 0, limit = 50, includeHidden = false } = options;

    const query: any = { eventId };
    if (!includeHidden) {
        query.isHidden = false;
    }

    return this.find(query)
        .populate('author', 'name email') // Adjust fields as needed
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

const EventReview = mongoose.model<IEventReview, IEventReviewModel>(
    'EventReview',
    EventReviewSchema
);

// ============================================
// TypeScript Interface Extensions for Statics
// ============================================

interface IEventReviewModel extends mongoose.Model<IEventReview> {
    getAverageRatings(eventId: string | mongoose.Types.ObjectId): Promise<{
        overall: number;
        wouldRepeat: number;
        customQuestions: { [key: string]: number };
        totalResponses: number;
    }>;

    getRatingsForEvent(
        eventId: string | mongoose.Types.ObjectId,
        options?: { skip?: number; limit?: number; includeHidden?: boolean }
    ): Promise<any[]>;
}

// Export all models and interfaces
export {
    ForumEvent,
    EventReview,
    IForumEvent,
    IEventReview,
    IEventReviewModel,
    ICustomRating,
};
