import mongoose, { Document, Schema } from 'mongoose';

interface IStaff extends Document {
    id: string;
    name: string;
    position: string;
    bio: string;
    group: string;
    profilePic: mongoose.Schema.Types.ObjectId;
}

const FileSchema = new Schema({
    filename: { type: String },
    fileId: { type: mongoose.Schema.Types.ObjectId },
    contentType: { type: String },
});

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
        type: String
    },
    group: {
        type: String
    },
    profilePic: { 
        type: FileSchema
    }
}, {
    timestamps: true
});  

export default mongoose.model<IStaff>('Staff', StaffSchema);