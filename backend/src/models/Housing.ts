import mongoose, { Document, Schema } from 'mongoose';

// Housing Buildings Schema
interface IHousingBuildings extends Document {
    id: number;
    name: string;
    campus: string;
    floors: number;
    description?: string;
}

const HousingBuildingsSchema = new Schema<IHousingBuildings>({
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
    campus: {
        type: String,
        required: true,
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

const HousingBuildings = mongoose.model<IHousingBuildings>('HousingBuildings', HousingBuildingsSchema);

// Housing Suites Schema
interface IHousingSuites extends Document {
    id: number,
    suite_type: number;
    housing_building_id: mongoose.Types.ObjectId;
}

const HousingSuitesSchema = new Schema<IHousingSuites>({
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
        ref: 'HousingBuildings',
        required: true,
        index: true
    }
});

const HousingSuites = mongoose.model<IHousingSuites>('HousingSuites', HousingSuitesSchema);

// Housing Rooms Schema
interface IHousingRooms extends Document {
    id: number;
    size?: string;
    occupancy_type?: string;
    closet_type?: string;
    bathroom_type?: string;
    housing_suite_id: mongoose.Types.ObjectId;
    room_number: string;
}

const HousingRoomsSchema = new Schema<IHousingRooms>({
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
        ref: 'HousingSuites',
        required: true,
        index: true
    },
    room_number: {
        type: String,
        required: true,
        unique: true
    }
});

const HousingRooms = mongoose.model<IHousingRooms>('HousingRooms', HousingRoomsSchema);

// Housing Reviews Schema
interface IHousingReviews extends Document {
    id: number;
    overall_rating?: number;
    quiet_rating?: number;
    layout_rating?: number;
    temperature_rating?: number;
    comments?: string;
    housing_room_id: mongoose.Types.ObjectId;
    user_id: mongoose.Types.ObjectId;
}

const HousingReviewsSchema = new Schema<IHousingReviews>({
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
        ref: 'HousingRooms',
        required: true,
        index: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SAMLUser',
        required: true,
        index: true
    }
});

const HousingReviews = mongoose.model<IHousingReviews>('HousingReviews', HousingReviewsSchema);

export { HousingBuildings, HousingRooms, HousingSuites, HousingReviews };
