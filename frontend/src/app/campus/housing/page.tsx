'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Loading from '@/components/Loading';
import { useAuth } from '@/hooks/useAuth';
import LoginRequired from '@/components/LoginRequired';

type BuildingDoc = {
    id: number;
    name: string;
    campus: string;
    description: string;
    floors: number;
};

type BuildingCard = {
    id: number;
    name: string;
    image: string;
    description: string;
    floors: number;
};

type CampusGroup = {
    campus: string;
    buildings: BuildingCard[];
};

const HousingPage = () => {
    const [housingData, setHousingData] = useState<CampusGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        const fetchHousingData = async () => {
            // Ensure the user is authenticated before fetching
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/campus/housing`,
                    {
                        credentials: 'include',
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch housing data');
                }

                const buildings = (await response.json()) as BuildingDoc[];

                // Organize buildings by campus
                const organizedData: CampusGroup[] = buildings.reduce(
                    (acc, building) => {
                        const campusName =
                            building.campus.charAt(0).toUpperCase() +
                            building.campus.slice(1) +
                            ' Campus';

                        const buildingCard: BuildingCard = {
                            id: building.id,
                            name: building.name,
                            image: `/buildings/${building.name
                                .toLowerCase()
                                .replace(/\s+/g, '-')
                                .replace(/-+/g, '-')}.jpg`,
                            description: building.description,
                            floors: building.floors,
                        };

                        const existingCampus = acc.find(
                            (c) => c.campus === campusName
                        );
                        if (existingCampus) {
                            existingCampus.buildings.push(buildingCard);
                        } else {
                            acc.push({
                                campus: campusName,
                                buildings: [buildingCard],
                            });
                        }

                        return acc;
                    },
                    [] as CampusGroup[]
                );

                setHousingData(organizedData);
            } catch (err) {
                console.error('Error fetching housing data:', err);
                setError(
                    'Could not load housing information. Please try again later.'
                );
            } finally {
                setLoading(false);
            }
        };

        // Only run fetch if auth has loaded and a user exists
        if (!authLoading) {
            fetchHousingData();
        }
    }, [user, authLoading]); // Re-run if auth state changes

    if (authLoading || loading) {
        return <Loading />;
    }

    if (!user) {
        return <LoginRequired />;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 text-gray-900">
                <div className="flex items-center justify-center h-screen text-red-500">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            <div className="container mx-auto p-6">
                {housingData.map((campus, index) => (
                    <section key={index} className="mb-12">
                        <h2 className="text-3xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-200 pb-2">
                            {campus.campus}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {campus.buildings.map((building) => (
                                <Link
                                    key={building.id}
                                    href={`/campus/housing/${building.id}`}
                                    className="block bg-white shadow-lg rounded-lg overflow-hidden transform transition-transform duration-300 hover:scale-105"
                                >
                                    <Image
                                        src={building.image}
                                        alt={building.name}
                                        width={800}
                                        height={400}
                                        className="w-full h-48 object-cover"
                                    />
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                                            {building.name}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {building.description?.slice(
                                                0,
                                                100
                                            )}
                                            ...
                                        </p>
                                        <span className="mt-4 inline-block text-blue-600 hover:underline">
                                            View Details
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default HousingPage;
