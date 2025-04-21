import mongoose, { Document, Schema } from "mongoose";

// Schema for SAML Authenticated Users
interface ISAMLUser extends Document {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
}

const SAMLUserSchema = new Schema<ISAMLUser>(
    {
        id: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const SAMLUser = mongoose.model<ISAMLUser>("SAMLUser", SAMLUserSchema);

// ASPC Staff Schema
interface IStaff extends Document {
    id: string;
    name: string;
    position: string;
    bio: string;
    group: string;
    profilePic: mongoose.Types.ObjectId; // Id of picture after uploading to GridFS
}

const StaffSchema = new Schema<IStaff>(
    {
        id: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        position: {
            type: String,
            required: true,
        },
        bio: {
            type: String,
            default: "",
        },
        group: {
            type: String,
            required: true,
        },
        profilePic: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Staff = mongoose.model<IStaff>("Staff", StaffSchema);

// Instructors Schema
interface IInstructors extends Document {
    id: number;
    name: string;
    inclusivity_rating?: number;
    competency_rating?: number;
    challenge_rating?: number;
    school?: string;
    courses?: Array<{
        courseId: number;
        courseCode: string;
        courseName: string;
    }>;
}

const InstructorsSchema = new Schema<IInstructors>({
    id: {
        type: Number,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    inclusivity_rating: {
        type: Number,
    },
    competency_rating: {
        type: Number,
    },
    challenge_rating: {
        type: Number,
    },
    school: {
        type: String,
    },
    courses: [
        {
            courseId: Number,
            courseCode: String,
            courseName: String,
        },
    ],
});

const Instructors = mongoose.model<IInstructors>(
    "Instructors",
    InstructorsSchema
);

export { SAMLUser, Staff, Instructors };
