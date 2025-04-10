import mongoose, { Document, Schema } from 'mongoose';

// Courses
interface ICourses extends Document {
    id: number;
    code: string;
    code_slug: string;
    name: string;
    department_names: string[];
    requirement_codes: string[];
    requirement_names: string[];
    // empty array signifies offered most terms
    term_keys: string[];
    description: string;
    all_instructor_ids: number[];
}

const CoursesSchema = new Schema<ICourses>({
    id: {
        type: Number,
        required: true,
        unique: true,
    },
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    code_slug: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    department_names: [{
        type: String,
    }],
    requirement_codes: [{
        type: String,
    }],
    requirement_names: [{
        type: String,
    }],
    term_keys: [{
        type: String,
    }],
    description: {
        type: String,
    },
    all_instructor_ids: [{
        type: Number,
        ref: 'Instructors',
    }],
},
    {
        timestamps: true,
});

const Courses = mongoose.model<ICourses>('Courses', CoursesSchema);


// Course Reviews
interface ICourseReviews extends Document {
    id: number;
    overall_rating: mongoose.Schema.Types.Decimal128;
    challenge_rating: mongoose.Schema.Types.Decimal128;
    inclusivity_rating: mongoose.Schema.Types.Decimal128;
    work_per_week: mongoose.Schema.Types.Decimal128;
    total_cost: mongoose.Schema.Types.Decimal128;
    comments: string;
    course_id: number;
    instructor_id: number;
    user_id: string;
}

const CourseReviewsSchema = new Schema<ICourseReviews>({
    id: {
        type: Number,
        required: true,
        unique: true,
    },
    overall_rating: {
        type: mongoose.Schema.Types.Decimal128,
    },
    challenge_rating: {
        type: mongoose.Schema.Types.Decimal128,
    },
    inclusivity_rating: {
        type: mongoose.Schema.Types.Decimal128,
    },
    work_per_week: {
        type: mongoose.Schema.Types.Decimal128,
    },
    total_cost: {
        type: mongoose.Schema.Types.Decimal128,
    },
    comments: {
        type: String,
        trim: true,
    },
    course_id: {
        type: Number,
        required: true,
        ref: 'Courses',
        index: true
    },
    instructor_id: {
        type: Number,
        ref: 'Instructors',
        required: true,
        index: true
    },
    user_id: {
        type: String,
        required: true,
        ref: 'SAMLUser',
        index: true
    },
},
{
    timestamps: true,
});

const CourseReviews = mongoose.model<ICourseReviews>('CourseReviews', CourseReviewsSchema);


export { Courses, CourseReviews };