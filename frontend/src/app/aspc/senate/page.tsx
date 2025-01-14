'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/Loading';

interface Senator {
  id: string;
  name: string;
  position: string;
  aboutMe: string;
  workingOn: string;
  profilePicture: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  location: string;
}

// Mock data
const MOCK_SENATORS: Senator[] = [
  {
    id: '1',
    name: 'Jane Smith',
    position: 'President',
    aboutMe: 'Junior studying Politics. Passionate about student advocacy and campus sustainability.',
    workingOn: 'Currently leading initiatives on mental health resources and sustainable dining options.',
    profilePicture: '/default-profile.png'
  },
  {
    id: '2',
    name: 'Alex Johnson',
    position: 'Vice President',
    aboutMe: 'Senior in Economics. Focused on improving student life and academic resources.',
    workingOn: 'Working on expanding library hours and creating more study spaces.',
    profilePicture: '/default-profile.png'
  },
  {
    id: '3',
    name: 'Sam Rodriguez',
    position: 'Treasurer',
    aboutMe: 'Sophomore studying Math. Interested in transparent budgeting and club funding.',
    workingOn: 'Developing a new system for club budget requests and financial transparency.',
    profilePicture: '/default-profile.png'
  }
];

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'New Mental Health Resources',
    content: 'We are excited to announce additional mental health support services starting next month.',
    date: '2024-01-10'
  },
  {
    id: '2',
    title: 'Student Senate Elections',
    content: 'Spring elections are coming up! Submit your candidacy by February 1st.',
    date: '2024-01-08'
  }
];

const MOCK_MEETINGS: Meeting[] = [
  {
    id: '1',
    title: 'Weekly Senate Meeting',
    date: '2024-01-15',
    location: 'Smith Campus Center 208'
  },
  {
    id: '2',
    title: 'Budget Committee',
    date: '2024-01-17',
    location: 'Frank Dining Hall Meeting Room'
  }
];

const SenatePage = () => {
  const { loading } = useAuth();
  const [senators, setSenators] = useState<Senator[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API calls
        // const [senatorsRes, announcementsRes, meetingsRes] = await Promise.all([
        //   fetch('/api/senators'),
        //   fetch('/api/senator/announcements'),
        //   fetch('/api/senator/meetings')
        // ]);

        // Simulating API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setSenators(MOCK_SENATORS);
        setAnnouncements(MOCK_ANNOUNCEMENTS);
        setMeetings(MOCK_MEETINGS);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">ASPC Senate</h1>

        {/* Senator Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {senators.map((senator) => (
            <div key={senator.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4">
                <div className="flex items-center space-x-4 mb-4">
                  {/* TODO: Add proper image handling with next/image */}
                  <img
                    src={senator.profilePicture}
                    alt={'No Pfp'}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{senator.name}</h2>
                    <p className="text-gray-600">{senator.position}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">About Me</h3>
                    <p className="text-gray-700 line-clamp-3">{senator.aboutMe}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Currently Working On</h3>
                    <p className="text-gray-700 line-clamp-3">{senator.workingOn}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Announcements */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Announcements</h2>
            </div>
            <div className="p-6">
              {announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <h3 className="font-medium text-gray-900 mb-1">{announcement.title}</h3>
                      <p className="text-gray-700 mb-2">{announcement.content}</p>
                      <span className="text-sm text-gray-500">
                        {new Date(announcement.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No announcements at this time.</p>
              )}
            </div>
          </div>

          {/* Upcoming Meetings */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Upcoming Meetings</h2>
            </div>
            <div className="p-6">
              {meetings.length > 0 ? (
                <div className="space-y-4">
                  {meetings.map((meeting) => (
                    <div key={meeting.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <h3 className="font-medium text-gray-900 mb-1">{meeting.title}</h3>
                      <p className="text-gray-700 mb-1">Location: {meeting.location}</p>
                      <span className="text-sm text-gray-500">
                        {new Date(meeting.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No upcoming meetings scheduled.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SenatePage;