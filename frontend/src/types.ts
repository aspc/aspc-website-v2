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