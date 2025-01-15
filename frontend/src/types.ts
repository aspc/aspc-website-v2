export interface PageContent {
    id: string;
    name: string;
    content: string;
  }


export interface Member {
  id: string;
  name: string;
  position: string;
  aboutMe: string;
  profilePicture: string;
  group: string;
}

export interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}