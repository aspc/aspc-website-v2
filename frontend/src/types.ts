export interface PageContent {
    id: string;
    name: string;
    content: string;
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
  title: string;
  start: string;
  end?: string;
  url?: string;
  description?: string;  
  location?: string;     
  host?: string;       
}  

declare module 'react-big-calendar';

