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
    // housing_suite_id: number; // DELETE
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

export interface Instructor {
    id: number;
    name: string;
  }
  
export interface Course {
_id: string;
id: number;
code: string;
code_slug: string;
name: string;
created_at: string;
updated_at: string;
department_names: string[];
requirement_codes: string[];
requirement_names: string[];
term_keys: string[];
description: string;
all_instructor_ids: number[];
}

export type SchoolKey = 'PO' | 'CM' | 'HM' | 'SC' | 'PZ';

export interface CourseCardProps {
course: Course;
schoolCode: SchoolKey;
instructorCache: Record<number, Instructor>;
onInstructorLoad: (ids: number[]) => void;
}