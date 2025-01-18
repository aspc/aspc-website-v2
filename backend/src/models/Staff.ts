import mongoose, { Document, Schema } from 'mongoose';

interface IStaff extends Document {
    id: string;
    name: string;
    position: string;
    bio: string;
    group: string;
    profilePic: mongoose.Types.ObjectId; // Id of picture after uploading to GridFS
}

const StaffSchema = new Schema<IStaff>({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    position: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        default: "",
    },
    group: {
        type: String, 
        required: true
    },
    profilePic: { 
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
}, {
    timestamps: true
});  

export default mongoose.model<IStaff>('Staff', StaffSchema);