import mongoose, { Document, Schema } from 'mongoose';
import { ObjectId } from 'mongodb';

export interface IPageContent extends Document {
    id: string;
    name: string;
    header: string;
    content?: string;
    link?: string;
    pdfId?: ObjectId;
    editRoles: string[];
    createdBy?: mongoose.Types.ObjectId;
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
        default: 'about',
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
    pdfId: {
        type: Schema.Types.ObjectId,
        required: false,
    },
    editRoles: {
        type: [String],
        default: [],
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'SAMLUser',
        required: false,
    },
});

export default mongoose.model<IPageContent>('PageContent', PageContentSchema);
