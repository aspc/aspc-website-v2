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


// Housing Rooms Schema
interface IHousingRooms extends Document {
    id: number;
    size?: number;
    occupancy_type?: number;
    closet_type?: number;
    bathroom_type?: number;
    // housing_suite_id?: number; // TODO: DELETE
    housing_building_id: number;
    room_number: string;
}

const HousingRoomsSchema = new Schema<IHousingRooms>({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    size: {
        type: Number,
    },
    occupancy_type: {
        type: Number,
    },
    closet_type: {
        type: Number,
    },
    bathroom_type: {
        type: Number,
    },
    // housing_suite_id: { // TODO: DELETE
    //     type: Number, 
    //     ref: 'HousingSuites',
    //     index: true
    // },
    housing_building_id: {
        type: Number,
        required: true,
        ref: 'HousingBuildings',
        index: true
    },
    room_number: {
        type: String,
        required: true,
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
    housing_room_id: number; 
    user_email: string; 
    pictures: mongoose.Types.ObjectId[]; // list of picture _ids
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
        type: Number,
        ref: 'HousingRooms',
        required: true,
        index: true
    },
    user_email: {
        type: String,
        ref: 'SAMLUser',
    },
    pictures: [{ 
        type: mongoose.Schema.Types.ObjectId,
    }]
}, {
    timestamps: true
});

const HousingReviews = mongoose.model<IHousingReviews>('HousingReviews', HousingReviewsSchema);

export { HousingBuildings, HousingRooms, HousingReviews };