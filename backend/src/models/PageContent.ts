import mongoose, { Document, Schema } from "mongoose";

interface IPageContent extends Document {
    id: string;
    name: string;
    header: string;
    content?: string;
    link?: string;
}

const PageContentSchema = new Schema<IPageContent>({
    id: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    header: {
        type: String,
        required: true,
        trim: true,
        default: "about",
    },
    content: {
        type: String,
        required: false,
    },
    link: {
        type: String,
        required: false,
        trim: true,
    },
});

export default mongoose.model<IPageContent>("PageContent", PageContentSchema);
