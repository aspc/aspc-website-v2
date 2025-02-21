import mongoose, { Document, Schema } from 'mongoose';

// Courses
interface ICourse extends Document {
    id: number;
    code: string;
    name: string;
    code_slug: string;
}

const CourseSchema = new Schema<ICourse>({
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
    name: {
        type: String,
        required: true,
    },
    code_slug: {
        type: String,
        required: true,
        unique: true,
    }
});

const Course = mongoose.model<ICourse>('Course', CourseSchema);


// Departments
interface IDepartment extends Document {
    id: number;
    code: string;
    name: string;
}

const DepartmentSchema = new Schema<IDepartment>({
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
    name: {
        type: String,
        required: true,
    }
});

const Department = mongoose.model<IDepartment>('Department', DepartmentSchema);


// Course Reviews
interface ICourseReview extends Document {
    id: number;
    overall_rating: mongoose.Schema.Types.Decimal128;
    challenge_rating: mongoose.Schema.Types.Decimal128;
    inclusivity_rating: mongoose.Schema.Types.Decimal128;
    work_per_week: mongoose.Schema.Types.Decimal128;
    total_cost: mongoose.Schema.Types.Decimal128;
    comments: string;
    course_id: number;
    instructor_id: number;
    user_id: number;
}

const CourseReviewSchema = new Schema<ICourseReview>({
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
        index: true
    },
    instructor_id: {
        type: Number,
        required: true,
        index: true
    },
    user_id: {
        type: Number,
        required: true,
        index: true
    }
});

const CourseReview = mongoose.model<ICourseReview>('CourseReview', CourseReviewSchema);


export { Course, Department, CourseReview };