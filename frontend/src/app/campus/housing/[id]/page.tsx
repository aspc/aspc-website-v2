'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Loading from '@/components/Loading';
import { Room, Building } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import LoginRequired from '@/components/LoginRequired';
import { RoomCard } from '@/components/housing/Rooms';

export default function DynamicRooms() {
    const params = useParams();
    const { id } = params; // Pass building id as a parameter in the URL
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [buildingNotFound, setBuildingNotFound] = useState(false);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [building, setBuilding] = useState<Building | null>(null);
    const [safeName, setSafeName] = useState<string>('');
    const { user, loading: authLoading } = useAuth();
    const [showFloorPlans, setShowFloorPlans] = useState(false);

    // Fetch room ratings for all rooms
    const fetchRoomRatings = async (roomsList: Room[]) => {
        const roomsWithRatings = await Promise.all(
            roomsList.map(async (room) => {
                try {
                    const response = await fetch(
                        `${process.env.BACKEND_LINK}/api/campus/housing/${room.id}/reviews`,
                        {
                            credentials: 'include',
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        return {
                            ...room,
                            averageRating: data.averages?.overallAverage || 0,
                            reviewCount: data.averages?.reviewCount || 0,
                        };
                    }

                    return room;
                } catch (error) {
                    console.error(
                        `Error fetching ratings for room ${room.id}:`,
                        error
                    );
                    return room;
                }
            })
        );

        return roomsWithRatings;
    };

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                setLoading(true);
                setBuildingNotFound(false);

                // Validate building parameter is a number
                const buildingId = Number(id);

                if (isNaN(buildingId)) {
                    setBuildingNotFound(true);
                    setError('Invalid building ID format');
                    return;
                }

                // First fetch building info to check if it exists
                const buildingResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/campus/housing/${buildingId}`,
                    {
                        credentials: 'include',
                    }
                );

                if (!buildingResponse.ok) {
                    if (buildingResponse.status === 404) {
                        setBuildingNotFound(true);
                        setError('Building not found');
                    } else {
                        throw new Error(
                            `Failed to fetch building: ${buildingResponse.status}`
                        );
                    }
                    return;
                }

                const buildingData = await buildingResponse.json();
                setBuilding(buildingData);
                setSafeName(
                    buildingData.name
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/-+/g, '-')
                );

                // Now fetch rooms for this building
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/campus/housing/${buildingId}/rooms`,
                    {
                        credentials: 'include',
                    }
                );

                if (!response.ok) {
                    if (response.status === 404) {
                        // No rooms but building exists
                        setRooms([]);
                    } else {
                        throw new Error(
                            `Failed to fetch rooms: ${response.status}`
                        );
                    }
                    return;
                }

                const data = await response.json();

                const roomsData: Room[] = data || [];

                // Get ratings for all rooms
                const roomsWithRatings = await fetchRoomRatings(roomsData);
                setRooms(roomsWithRatings);
            } catch (error) {
                console.error('Error fetching rooms:', error);
                setError('Failed to load rooms. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, [id]);

    if (loading || authLoading) {
        return <Loading />;
    }

    if (!user) {
        return <LoginRequired />;
    }

    if (buildingNotFound || !building) {
        return (
            <div className="min-h-screen bg-gray-100 text-gray-900">
                <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto px-4">
                    <div className="text-center max-w-md w-full p-6 bg-white rounded-lg shadow-sm">
                        <h1 className="text-3xl font-bold text-red-500">
                            Building Not Found
                        </h1>
                        <p className="text-lg text-gray-700 mt-4">
                            The building you&apos;re looking for doesn&apos;t exist.
                            Please check the URL and try again.
                        </p>
                        <p className="text-gray-600 mt-2">Error: {error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">

            <div className="container mx-auto px-4 py-8">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="mb-6 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Back
                </button>

                <h1 className="text-4xl font-bold mb-4">{building.name}</h1>
                <Image
                    src={`/buildings/${safeName}.jpg`}
                    width={800}
                    height={400}
                    alt={building.name}
                    className="w-full max-h-[500px] object-cover mb-6 rounded-lg"
                />
                <p className="text-lg text-gray-700 mb-4">{building.description}</p>

                {/* Button to toggle floor plans */}
                <button
                    onClick={() => setShowFloorPlans(!showFloorPlans)}
                    className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                    {showFloorPlans ? 'Hide Floor Plans' : 'Show Floor Plans'}
                </button>

                {/* Conditionally render floor plans */}
                {showFloorPlans && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                            Floor Plans
                        </h2>
                        <div className="grid gap-6 pb-6 grid-cols-1 sm:grid-cols-2">
                            {Array.from({ length: building.floors }).map((_, i) => {
                                const isLastInOddSet =
                                    building.floors % 2 !== 0 &&
                                    i === building.floors - 1;
                                const isOnlyOne = building.floors === 1;
                                const shouldSpanAndCenter =
                                    isLastInOddSet || isOnlyOne;
                                return (
                                    <div
                                        key={i}
                                        className={`${
                                            shouldSpanAndCenter
                                                ? 'sm:col-span-2 flex justify-center'
                                                : ''
                                        }`}
                                    >
                                        <Image
                                            src={`/floorplans/${safeName}-floor${i + 1}.jpg`}
                                            width={800}
                                            height={400}
                                            alt={`Floor plan ${i + 1}`}
                                            className={`w-full h-auto rounded-lg border border-gray-200 shadow ${
                                                shouldSpanAndCenter
                                                    ? 'sm:max-w-2xl'
                                                    : ''
                                            }`}
                                            onError={(e) => {
                                                e.currentTarget.src =
                                                    '/placeholder-floorplan.jpg';
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">
                        Rooms in {building.name}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {building.name} has {rooms.length} room
                        {rooms.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {rooms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map((room) => (
                            <RoomCard
                                key={room.id}
                                buildingName={building.name}
                                room={room}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <p className="text-lg text-gray-700">
                            No rooms found for this building.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
