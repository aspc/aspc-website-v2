"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Loading from "@/components/Loading";

interface Room {
    _id: string;
    id: number;
    room_number: string;
    size?: number;
    occupancy_type?: number;
    closet_type?: string; // No data
    bathroom_type?: string; // No data
    housing_suite_id: string; // No data
    housing_building_id: number;
    averageRating?: number;
    reviewCount?: number;
}

interface Review {
    _id: string;
    id: number;
    overall_rating?: number;
    quiet_rating?: number;
    layout_rating?: number;
    temperature_rating?: number;
    comments?: string;
    housing_room_id: number;
    user_id: string;
}

interface ReviewAverages {
    overallAverage: number;
    quietAverage: number;
    layoutAverage: number;
    temperatureAverage: number;
    reviewCount: number;
}

interface RoomWithReviews {
    room: Room;
    reviews: Review[];
    averages: ReviewAverages;
}

export default function DynamicRooms() {
    const params = useParams();
    const { building } = params; // Pass building id as a parameter in the URL
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [buildingName, setBuildingName] = useState<string>("");
    const [selectedRoom, setSelectedRoom] = useState<RoomWithReviews | null>(
        null
    );
    const [showModal, setShowModal] = useState(false); // NOTE: Show reviews modal (might be changed to a page)

    // Fetch room ratings for all rooms
    const fetchRoomRatings = async (roomsList: Room[]) => {
        const roomsWithRatings = await Promise.all(
            roomsList.map(async (room) => {
                try {
                    const response = await fetch(
                        `${process.env.BACKEND_LINK}/api/campus/housing/${room.id}/reviews`
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
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/campus/housing/${building}/rooms`
                );

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch rooms: ${response.status}`
                    );
                }

                const data = await response.json();
                const roomsData: Room[] = data.rooms || [];

                // Get ratings for all rooms
                const roomsWithRatings = await fetchRoomRatings(roomsData);
                setRooms(roomsWithRatings);

                // Get building name from the backend
                const buildingResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/campus/housing/${building}`
                );
                if (!buildingResponse.ok) {
                    throw new Error(
                        `Failed to fetch building: ${buildingResponse.status}`
                    );
                }
                const buildingData = await buildingResponse.json();
                setBuildingName(buildingData.name);
            } catch (error) {
                console.error("Error fetching rooms:", error);
                setError("Failed to load rooms. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        if (building) {
            fetchRooms();
        }
    }, [building]);

    const handleViewReviews = async (room: Room) => {
        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/campus/housing/${room.id}/reviews`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch reviews: ${response.status}`);
            }

            const data = await response.json();
            setSelectedRoom(data);
            setShowModal(true);
        } catch (error) {
            console.error("Error fetching room reviews:", error);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedRoom(null);
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">
                    Rooms in {buildingName}
                </h1>
                <p className="text-gray-600 mt-2">
                    {buildingName} has {rooms.length} room
                    {rooms.length !== 1 ? "s" : ""}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map((room) => (
                    <RoomCard
                        key={room.id}
                        buildingName={buildingName}
                        room={room}
                        onViewReviews={() => handleViewReviews(room)}
                    />
                ))}
            </div>

            {/* Reviews Modal */}
            {showModal && selectedRoom && (
                <ReviewsModal
                    room={selectedRoom.room}
                    reviews={selectedRoom.reviews}
                    averages={selectedRoom.averages}
                    buildingName={buildingName}
                    onClose={closeModal}
                />
            )}
        </div>
    );
}

// Star rating component
const StarRating = ({ rating }: { rating: number }) => {
    const totalStars = 5;
    const fullStars = Math.floor(rating);

    return (
        <div className="flex">
            {[...Array(totalStars)].map((_, i) => (
                <span key={i} className="text-xl">
                    {i < fullStars ? (
                        <span className="text-yellow-500">★</span>
                    ) : (
                        <span className="text-gray-300">★</span>
                    )}
                </span>
            ))}
        </div>
    );
};

// Room card component
interface RoomCardProps {
    buildingName: string;
    room: Room;
    onViewReviews: () => void;
}

const RoomCard = ({ buildingName, room, onViewReviews }: RoomCardProps) => {
    // Generate a descriptive room type label
    const getRoomTypeLabel = () => {
        if (room.occupancy_type) {
            switch (room.occupancy_type) {
                case 1:
                    return "Single";
                case 2:
                    return "Double";
                case 3:
                    return "Triple";
                default:
                    return room.occupancy_type;
            }
        } else {
            return "Unknown";
        }
    };

    return (
        <div className="w-full border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
                {buildingName} : {room.room_number}
            </h2>

            <div className="flex items-center mb-4">
                <span className="text-gray-600 mr-2">Rating:</span>
                {room.reviewCount && room.reviewCount > 0 ? (
                    <div className="flex items-center">
                        <StarRating rating={room.averageRating || 0} />
                        <span className="ml-2 text-gray-500">
                            ({room.reviewCount})
                        </span>
                    </div>
                ) : (
                    <span className="text-gray-500">No ratings yet</span>
                )}
            </div>

            <div className="mb-6">
                <p className="text-lg text-gray-700">{getRoomTypeLabel()}</p>
                {room.size && (
                    <p className="text-lg text-gray-700">
                        Size: {room.size} sq. ft.
                    </p>
                )}
            </div>

            <button
                className="px-6 py-2 border border-blue-300 text-blue-500 rounded-md hover:bg-blue-50 transition-colors"
                onClick={onViewReviews}
            >
                View Reviews
            </button>
        </div>
    );
};

// Reviews Modal Component
interface ReviewsModalProps {
    room: Room;
    reviews: Review[];
    averages: ReviewAverages;
    buildingName: string;
    onClose: () => void;
}

const ReviewsModal = ({
    room,
    reviews,
    averages,
    buildingName,
    onClose,
}: ReviewsModalProps) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-gray-800">
                            Reviews for {buildingName} : {room.room_number}
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-4 overflow-y-auto flex-grow">
                    {averages && averages.reviewCount > 0 ? (
                        <>
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="text-lg font-medium mb-3">
                                    Rating Summary
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-gray-600">Overall</p>
                                        <div className="flex items-center">
                                            <StarRating
                                                rating={averages.overallAverage}
                                            />
                                            <span className="ml-2">
                                                {averages.overallAverage.toFixed(
                                                    1
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Quiet</p>
                                        <div className="flex items-center">
                                            <StarRating
                                                rating={averages.quietAverage}
                                            />
                                            <span className="ml-2">
                                                {averages.quietAverage.toFixed(
                                                    1
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Layout</p>
                                        <div className="flex items-center">
                                            <StarRating
                                                rating={averages.layoutAverage}
                                            />
                                            <span className="ml-2">
                                                {averages.layoutAverage.toFixed(
                                                    1
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">
                                            Temperature
                                        </p>
                                        <div className="flex items-center">
                                            <StarRating
                                                rating={
                                                    averages.temperatureAverage
                                                }
                                            />
                                            <span className="ml-2">
                                                {averages.temperatureAverage.toFixed(
                                                    1
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-gray-500 mt-3">
                                    Based on {averages.reviewCount} review
                                    {averages.reviewCount !== 1 ? "s" : ""}
                                </p>
                            </div>

                            <h4 className="text-lg font-medium mb-4">
                                User Reviews
                            </h4>
                            <div className="space-y-6">
                                {reviews.map((review) => (
                                    <div
                                        key={review._id}
                                        className="border-b pb-4"
                                    >
                                        <div className="flex items-center mb-2">
                                            <StarRating
                                                rating={
                                                    review.overall_rating || 0
                                                }
                                            />
                                            <span className="ml-2 text-sm text-gray-500">
                                                Overall Rating:{" "}
                                                {review.overall_rating || 0}/5
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            <div className="text-sm">
                                                <span className="text-gray-600">
                                                    Quiet:{" "}
                                                </span>
                                                {review.quiet_rating || "N/A"}
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-gray-600">
                                                    Layout:{" "}
                                                </span>
                                                {review.layout_rating || "N/A"}
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-gray-600">
                                                    Temperature:{" "}
                                                </span>
                                                {review.temperature_rating ||
                                                    "N/A"}
                                            </div>
                                        </div>

                                        {review.comments && (
                                            <div className="mt-2">
                                                <p className="text-gray-800">
                                                    {review.comments}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40">
                            <p className="text-gray-500 text-lg">
                                No reviews yet for this room.
                            </p>
                            <p className="text-gray-400">
                                Be the first to leave a review!
                            </p>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t">
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
