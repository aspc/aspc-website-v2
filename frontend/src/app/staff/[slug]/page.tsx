'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/Loading';
import { StaffMember, PageProps } from '@/types';
import Image from 'next/image';

const groupSlugMap: { [key: string]: string } = {
    Senate: 'senate',
    Staff: 'staff',
    CollegeStaff: 'college-staff',
    Software: 'software',
};

const SenatePage: React.FC<PageProps> = ({ params }) => {
    const resolvedParams = React.use(params);
    console.log(resolvedParams.slug);
    const { loading } = useAuth();
    const [members, setMembers] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showBio, setShowBio] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // Fetch members by group
                const res = await fetch(
                    `${process.env.BACKEND_LINK}/api/members/group/${
                        groupSlugMap[resolvedParams.slug]
                    }`
                );

                if (!res.ok) {
                    throw new Error('Failed to fetch members');
                }

                const data = await res.json();
                setMembers(data);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (resolvedParams.slug) {
            fetchData();
        }
    }, [resolvedParams.slug]);

    if (loading || isLoading) return <Loading />;

    const toggleBio = (name: string) => {
        if (showBio === name) {
            setShowBio(null);
        } else {
            setShowBio(name);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    ASPC{' '}
                    {resolvedParams.slug.replace(/([a-z])([A-Z])/g, '$1 $2')}
                </h1>

                {/* Senator Cards */}

                {members.length === 0 ? (
                    <div className="text-center text-gray-600">
                        No members found in this group.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {members.map((member) => (
                            <div
                                key={member.id}
                                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-xl transition duration-300 ease-in-out min-h-72"
                            >
                                <div className="p-4">
                                    <div className="flex flex-col space-y-3 mb-4">
                                        <div
                                            className="relative"
                                            style={{
                                                paddingBottom: '150%',
                                                height: '0',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {showBio === member.name ? (
                                                <div className="text-gray-600">
                                                    <p>{member.bio}</p>
                                                </div>
                                            ) : (
                                                <Image
                                                    src={`${process.env.BACKEND_LINK}/api/members/profile-pic/${member.profilePic}`}
                                                    alt={member.name}
                                                    className="object-cover"
                                                    onError={(e) => {
                                                        const target =
                                                            e.target as HTMLImageElement;
                                                        target.src =
                                                            '/cecil.jpg'; // Direct src replacement
                                                    }}
                                                    layout="fill"
                                                />
                                            )}
                                        </div>
                                        <h2 className="text-xl font-semibold text-gray-900 ml-2">
                                            {member.name}
                                        </h2>
                                        <p className="text-gray-600 ml-2">
                                            {member.position}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                toggleBio(member.name);
                                            }}
                                            className="text-blue-500 px-4 py-2 rounded-md hover:bg-blue-500 hover:text-white border-2 border-blue-500 max-w-fit"
                                        >
                                            {showBio === member.name
                                                ? 'Hide biography'
                                                : 'Biography'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SenatePage;
