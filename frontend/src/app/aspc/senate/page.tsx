'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/Loading';

interface Senator {
  id: string;
  name: string;
  position: string;
  aboutMe: string;
  profilePicture: string;
}

// Mock data
const MOCK_SENATORS: Senator[] = [
  {
    id: '1',
    name: 'Jane Smith',
    position: 'President',
    aboutMe: 'Junior studying Politics. Passionate about student advocacy and campus sustainability.',
    profilePicture: '/default-profile.png'
  },
  {
    id: '2',
    name: 'Alex Johnson',
    position: 'Vice President',
    aboutMe: 'Senior in Economics. Focused on improving student life and academic resources.',
    profilePicture: '/default-profile.png'
  },
  {
    id: '3',
    name: 'Sam Rodriguez',
    position: 'Treasurer',
    aboutMe: 'Sophomore studying Math. Interested in transparent budgeting and club funding.',
    profilePicture: '/default-profile.png'
  }
];

const SenatePage = () => {
  const { loading } = useAuth();
  const [senators, setSenators] = useState<Senator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API calls
        // const [senatorsRes, announcementsRes, meetingsRes] = await Promise.all([
        //   fetch('/api/senators'),
        // ]);

        // Simulating API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setSenators(MOCK_SENATORS);

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
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default SenatePage;