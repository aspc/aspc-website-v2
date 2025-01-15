'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/Loading';
import { Member, PageProps } from '@/types';
import Image from 'next/image';


// Mock data
const MOCK_SENATORS: Member[] = [
  {
    id: '1',
    name: 'Jane Smith',
    position: 'President',
    aboutMe: 'Junior studying Politics. Passionate about student advocacy and campus sustainability.',
    profilePicture: '',
    group: 'ASPC'
  },
  {
    id: '2',
    name: 'Alex Johnson',
    position: 'Vice President',
    aboutMe: 'Senior in Economics. Focused on improving student life and academic resources.',
    profilePicture: '',
    group: 'ASPC'
  },
  {
    id: '3',
    name: 'Sam Rodriguez',
    position: 'Treasurer',
    aboutMe: 'Sophomore studying Math. Interested in transparent budgeting and club funding.',
    profilePicture: '',
    group: 'ASPC'
  }
];

const SenatePage: React.FC<PageProps> = ({ params }) => {
    const resolvedParams = React.use(params);
    const { loading } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
        try {
            setIsLoading(true);
            // TODO: Replace with actual API calls
            // const res = await fetch(`http://localhost:5000/api/members/${resolvedParams.slug}`);
            // if (!res.ok) throw new Error('Failed to fetch data');
            // const data: Member[] = await res.json();
            const data: Member[] = MOCK_SENATORS;
            setMembers(data);


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
            <h1 className="text-3xl font-bold text-gray-900 mb-8">ASPC {resolvedParams.slug}</h1>

            {/* Senator Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {members.map((member) => (
                <div key={member.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4">
                    <div className="flex items-center space-x-4 mb-4">
                    <Image
                        src={member.profilePicture || '/cecil.jpg'}
                        alt={'No Pfp'}
                        width={96}
                        height={96}
                        className="rounded-full object-cover"
                    />
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">{member.name}</h2>
                        <p className="text-gray-600">{member.position}</p>
                    </div>
                    </div>
                    <div className="space-y-4">
                    <div>
                        <h3 className="font-medium text-gray-900 mb-2">About Me</h3>
                        <p className="text-gray-700 line-clamp-3">{member.aboutMe}</p>
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