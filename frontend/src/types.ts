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