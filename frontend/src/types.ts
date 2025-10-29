export interface PageContent {
    id: string;
    name: string;
    content?: string;
    header: string;
    link?: string;
}

export interface StaffMember {
    id: string;
    name: string;
    position: string;
    bio: string;
    email: string;
    profilePic: string;
    group: string;
}

export interface PageProps {
    params: Promise<{
        slug: string;
    }>;
}

export interface Event {
    name: string;
    location: string;
    description: string;
    host: string;
    details_url: string;
    start: Date;
    end: Date;
    status: string;
}

export interface ForumEvent {
    _id: string;
    title: string;
    description: string;
    createdBy: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
    };
    staffHost?: {
        name: string;
        position: string;
    };
    eventDate: Date;
    location: string;
    engageEventId?: string;
    ratingUntil: Date;
    ratings?: EventReview[];
    customQuestions: string[];
    createdAt: Date;  // Added by Mongoose timestamps
    updatedAt: Date;  // Added by Mongoose timestamps
}

export interface EventReview {
    _id: string;
    eventId: string;
    author: string; // email
    isAnonymous: boolean;
    content: string;
    isHidden: boolean;
    overall: number;
    wouldRepeat: number;
    customRatings: CustomRating[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface EventRating {
    _id: string;
    userId: string;
    isAnonymous: boolean;
    overall: number;
    wouldRepeat: number;
    customRatings: CustomRating[];
    createdAt: Date;
}

export interface CustomRating {
    question: string;
    rating: number;
}

export interface EventComment {
    _id: string;
    eventId: string;
    author: {
        _id: string;
        email: string;
        firstName: string;
        lastName: string;
    };
    isAnonymous: boolean;
    content: string;
    isHidden: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface EventWithReviews {
    event: ForumEvent;
    reviews: EventReview[];
    averages: EventReviewAverages;
}

export interface EventReviewAverages {
    overall: number;
    wouldRepeat: number;
    customQuestions: { [key: string]: number };
    totalResponses: number;
}

export interface EventReviewFormProps {
    eventId: string;
    existingRating?: EventRating;
    review?: EventRating;
    onSubmitSuccess?: () => void;
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
}

export interface Building {
    id: number;
    name: string;
    campus: string;
    floors: number;
    description?: string;
}
export interface Room {
    _id: string;
    id: number;
    room_number: string;
    size?: number;
    occupancy_type?: number;
    closet_type?: number; // No data
    bathroom_type?: number; // No data
    housing_building_id: number;
    averageRating?: number;
    reviewCount?: number;
}

export interface Review {
    _id: string;
    id: number;
    overall_rating?: number;
    quiet_rating?: number;
    layout_rating?: number;
    temperature_rating?: number;
    comments?: string;
    housing_room_id: number;
    user_email: string;
    pictures?: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ReviewAverages {
    overallAverage: number;
    quietAverage: number;
    layoutAverage: number;
    temperatureAverage: number;
    reviewCount: number;
}

export interface RoomWithReviews {
    room: Room;
    reviews: Review[];
    averages: ReviewAverages;
}

export type SchoolKey = 'PO' | 'CM' | 'HM' | 'SC' | 'PZ';

export interface CourseCardProps {
    course: Course;
    schoolCode: SchoolKey;
    instructorCache: Record<number, Instructor>;
    onInstructorLoad: (ids: number[]) => void;
}

// Room card component
export interface RoomCardProps {
    buildingName: string;
    room: Room;
}

export interface ReviewFormProps {
    review: Review | null;
}

// Course and course review types
export type Course = {
    _id: number;
    id: number;
    code: string;
    code_slug: string;
    name: string;
    department_names: string[];
    requirement_codes: string[];
    requirement_names: string[];
    term_keys: string[]; // empty array means offered most terms
    description: string;
    all_instructor_ids: number[];
    createdAt?: Date;
    updatedAt?: Date;
    review_count: number;
};

export type CourseReview = {
    _id: string;
    id: number;
    overall_rating?: number;
    challenge_rating?: number;
    inclusivity_rating?: number;
    work_per_week?: number;
    total_cost?: number;
    comments?: string;
    course_id: number;
    instructor_id: number;
    user_email?: string;
    createdAt?: Date;
    updatedAt?: Date;
};

export type CourseWithReviews = {
    course: Course;
    reviews: CourseReview[];
};

export interface CourseReviewFormProps {
    review: CourseReview | null;
    instructorId?: number;
    courseId?: number;
}

export type Instructor = {
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
};

export interface InstructorWithReviews {
    instructor: Instructor;
    reviews: CourseReview[];
}
