import mongoose, { Document, Schema } from 'mongoose';

// Housing Buildings Schema
interface IHousingBuilding extends Document {
    id: number;
    name: string;
    floors: number;
    description?: string;
}

const HousingBuildingSchema = new Schema<IHousingBuilding>({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    floors: {
        type: Number,
        default: 1,
        required: true
    },
    description: {
        type: String,
    }
});

export const HousingBuilding = mongoose.model<IHousingBuilding>('HousingBuilding', HousingBuildingSchema);

// Housing Suites Schema
interface IHousingSuite extends Document {
    id: number,
    suite_type: number;
    housing_building_id: mongoose.Types.ObjectId;
}

const HousingSuiteSchema = new Schema<IHousingSuite>({
    id: {
        type: Number,
        required: true,
        unique: true
    }, 
    suite_type: {
        type: Number,
        default: 0,
        required: true
    },
    housing_building_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HousingBuilding',
        required: true,
        index: true
    }
});

export const HousingSuite = mongoose.model<IHousingSuite>('HousingSuite', HousingSuiteSchema);

// Housing Rooms Schema
interface IHousingRoom extends Document {
    id: number;
    size?: string;
    occupancy_type?: string;
    closet_type?: string;
    bathroom_type?: string;
    housing_suite_id: mongoose.Types.ObjectId;
    room_number: string;
}

const HousingRoomSchema = new Schema<IHousingRoom>({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    size: {
        type: String,
    },
    occupancy_type: {
        type: String,
    },
    closet_type: {
        type: String,
    },
    bathroom_type: {
        type: String,
    },
    housing_suite_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HousingSuite',
        required: true,
        index: true
    },
    room_number: {
        type: String,
        required: true,
        unique: true
    }
});

export const HousingRoom = mongoose.model<IHousingRoom>('HousingRoom', HousingRoomSchema);

// Housing Reviews Schema
interface IHousingReview extends Document {
    id: number;
    overall_rating?: number;
    quiet_rating?: number;
    layout_rating?: number;
    temperature_rating?: number;
    comments?: string;
    housing_room_id: mongoose.Types.ObjectId;
    user_id: mongoose.Types.ObjectId;
}

const HousingReviewSchema = new Schema<IHousingReview>({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    overall_rating: {
        type: Number,
    },
    quiet_rating: {
        type: Number,
    },
    layout_rating: {
        type: Number,
    },
    temperature_rating: {
        type: Number,
    },
    comments: {
        type: String,
    },
    housing_room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HousingRoom',
        required: true,
        index: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    }
});

export const HousingReview = mongoose.model<IHousingReview>('HousingReview', HousingReviewSchema);
