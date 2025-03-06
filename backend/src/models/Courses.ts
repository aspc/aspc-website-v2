import mongoose, { Document, Schema } from 'mongoose';

// Courses
interface ICourses extends Document {
    id: number;
    code: string;
    name: string;
    code_slug: string;
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

const Courses = mongoose.model<ICourses>('Courses', CoursesSchema);


// Departments
interface IDepartments extends Document {
    id: number;
    code: string;
    name: string;
}

const DepartmentsSchema = new Schema<IDepartments>({
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

const Departments = mongoose.model<IDepartments>('Departments', DepartmentsSchema);


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
    user_id: number;
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

const CourseReviews = mongoose.model<ICourseReviews>('CourseReviews', CourseReviewsSchema);


export { Courses, Departments, CourseReviews };