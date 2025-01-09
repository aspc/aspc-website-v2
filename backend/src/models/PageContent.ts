import mongoose, { Document, Schema } from 'mongoose';

interface IPageContent extends Document {
    id: string;
    name: string;
    content: string;
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
    content: {
        type: String,
        required: true,
    },
});

export default mongoose.model<IPageContent>('PageContent', PageContentSchema);
