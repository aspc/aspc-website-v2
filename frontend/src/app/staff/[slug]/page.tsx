"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Loading from "@/components/Loading";
import { StaffMember, PageProps } from "@/types";
import Image from "next/image";

const groupSlugMap: { [key: string]: string } = {
    Senate: "senate",
    AcademicAffairs: "academicAffairs",
    StudentAffairs: "studentAffairs",
    Finance: "finance",
    Communications: "communications",
    Software: "software",
};

const SenatePage: React.FC<PageProps> = ({ params }) => {
    const resolvedParams = React.use(params);
    const { loading } = useAuth();
    const [members, setMembers] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                    throw new Error("Failed to fetch members");
                }

                const data = await res.json();
                setMembers(data);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (resolvedParams.slug) {
            fetchData();
        }
    }, [resolvedParams.slug]);

    if (loading || isLoading) return <Loading />;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    ASPC {resolvedParams.slug.replace(/([a-z])([A-Z])/g, '$1 $2')}
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
                                    <div className="flex items-center space-x-4 mb-4 ">
                                        <div className="w-24 h-24 relative">
                                            <Image
                                                src={`${process.env.BACKEND_LINK}/api/members/profile-pic/${member.profilePic}`}
                                                alt={member.name}
                                                fill
                                                className="rounded-full object-cover"
                                                onError={(e) => {
                                                    const target =
                                                        e.target as HTMLImageElement;
                                                    target.src = "/cecil.jpg"; // Direct src replacement
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">
                                                {member.name}
                                            </h2>
                                            <p className="text-gray-600">
                                                {member.position}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-medium text-gray-900 mb-2">
                                                About Me
                                            </h3>
                                            <p className="text-gray-700">
                                                {member.bio}
                                            </p>
                                        </div>
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
