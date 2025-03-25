"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Loading from "@/components/Loading";
import { RoomWithReviews } from "@/types";
import Image from "next/image";

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

const ReviewForm: React.FC = () => {
    const params = useParams();
    const { building, room } = params;

    const [ratings, setRatings] = useState({
        overall: 0,
        quiet: 0,
        layout: 0,
        temperature: 0,
    });

    const [hoveredStar, setHoveredStar] = useState<{
        overall: number;
        quiet: number;
        layout: number;
        temperature: number;
    }>({ overall: 0, quiet: 0, layout: 0, temperature: 0 });

    const handleStarClick = (category: string, value: number) => {
        setRatings((prevRatings) => ({
            ...prevRatings,
            [category]: value,
        }));
    };

    const handleStarHover = (category: string, value: number) => {
        setHoveredStar((prev) => ({
            ...prev,
            [category]: value,
        }));
    };

    const handleStarHoverOut = (category: string) => {
        setHoveredStar((prev) => ({
            ...prev,
            [category]: 0,
        }));
    };

    const baseStarClass =
        "text-xl text-gray-300 cursor-pointer transition-colors duration-300";

    const [comments, setComments] = useState("");
    const [pictures, setPictures] = useState<FileList | null>(null);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

    const handleCommentsChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
        setComments(e.target.value);
    };

    const handlePicturesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPictures(e.target.files);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const errors: { [key: string]: string } = {};

        // Check if all ratings are selected
        if (ratings.overall === 0)
            errors.overall = "Please select an overall rating.";
        if (ratings.quiet === 0) errors.quiet = "Please select a quiet rating.";
        if (ratings.layout === 0)
            errors.layout = "Please select a layout rating.";
        if (ratings.temperature === 0)
            errors.temperature = "Please select a temperature rating.";

        // Check if comments are provided
        if (!comments.trim()) errors.comments = "Please leave a comment.";

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        try {
            // Get current user's email
            const userResponse = await fetch(
                `${process.env.BACKEND_LINK}/api/auth/current_user`,
                {
                    credentials: "include",
                }
            );

            if (!userResponse.ok) {
                throw new Error("Error getting current user");
            }

            const user = await userResponse.json();

            // Construct review request
            const formData = new FormData();
            formData.append("overall", ratings.overall.toString());
            formData.append("quiet", ratings.quiet.toString());
            formData.append("layout", ratings.layout.toString());
            formData.append("temperature", ratings.temperature.toString());
            formData.append("comments", comments);
            formData.append("email", user.user.email);

            if (pictures) {
                Array.from(pictures).forEach((file) => {
                    formData.append("pictures", file);
                });
            }

            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/campus/housing/${building}/${room}/reviews`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error("Error submitting review");
            }

            alert("Review submitted successfully!");
            window.location.reload();
        } catch (error) {
            alert("Error submitting review");
            console.error(error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Overall Rating */}
            <div className="rating">
                <label>Overall: </label>
                <div>
                    {[1, 2, 3, 4, 5].map((value) => (
                        <span
                            key={value}
                            onClick={() => handleStarClick("overall", value)}
                            onMouseEnter={() =>
                                handleStarHover("overall", value)
                            }
                            onMouseLeave={() => handleStarHoverOut("overall")}
                            className={`${baseStarClass} ${
                                ratings.overall >= value ||
                                hoveredStar.overall >= value
                                    ? "text-yellow-500"
                                    : ""
                            }`}
                        >
                            &#9733;
                        </span>
                    ))}
                </div>
                {formErrors.overall && (
                    <p style={{ color: "red" }}>{formErrors.overall}</p>
                )}
            </div>

            {/* Quiet Rating */}
            <div className="rating">
                <label>Quiet: </label>
                <div>
                    {[1, 2, 3, 4, 5].map((value) => (
                        <span
                            key={value}
                            onClick={() => handleStarClick("quiet", value)}
                            onMouseEnter={() => handleStarHover("quiet", value)}
                            onMouseLeave={() => handleStarHoverOut("quiet")}
                            className={`${baseStarClass} ${
                                ratings.quiet >= value ||
                                hoveredStar.quiet >= value
                                    ? "text-yellow-500"
                                    : ""
                            }`}
                        >
                            &#9733;
                        </span>
                    ))}
                </div>
                {formErrors.quiet && (
                    <p style={{ color: "red" }}>{formErrors.quiet}</p>
                )}
            </div>

            {/* Layout Rating */}
            <div className="rating">
                <label>Layout: </label>
                <div>
                    {[1, 2, 3, 4, 5].map((value) => (
                        <span
                            key={value}
                            onClick={() => handleStarClick("layout", value)}
                            onMouseEnter={() =>
                                handleStarHover("layout", value)
                            }
                            onMouseLeave={() => handleStarHoverOut("layout")}
                            className={`${baseStarClass} ${
                                ratings.layout >= value ||
                                hoveredStar.layout >= value
                                    ? "text-yellow-500"
                                    : ""
                            }`}
                        >
                            &#9733;
                        </span>
                    ))}
                </div>
                {formErrors.layout && (
                    <p style={{ color: "red" }}>{formErrors.layout}</p>
                )}
            </div>

            {/* Temperature Rating */}
            <div className="rating">
                <label>Temperature: </label>
                <div>
                    {[1, 2, 3, 4, 5].map((value) => (
                        <span
                            key={value}
                            onClick={() =>
                                handleStarClick("temperature", value)
                            }
                            onMouseEnter={() =>
                                handleStarHover("temperature", value)
                            }
                            onMouseLeave={() =>
                                handleStarHoverOut("temperature")
                            }
                            className={`${baseStarClass} ${
                                ratings.temperature >= value ||
                                hoveredStar.temperature >= value
                                    ? "text-yellow-500"
                                    : ""
                            }`}
                        >
                            &#9733;
                        </span>
                    ))}
                </div>
                {formErrors.temperature && (
                    <p style={{ color: "red" }}>{formErrors.temperature}</p>
                )}
            </div>

            {/* Comment Box */}
            <div>
                <label htmlFor="comments">Comments:</label>
                <textarea
                    id="comments"
                    value={comments}
                    onChange={handleCommentsChange}
                    placeholder="Write your comments here..."
                    rows={4}
                    className="border rounded p-2 w-full"
                />
                {formErrors.comments && (
                    <p style={{ color: "red" }}>{formErrors.comments}</p>
                )}
            </div>

            {/* File Upload */}
            <div>
                <label htmlFor="pictures">Upload Files:</label>
                <input
                    id="pictures"
                    type="file"
                    multiple
                    onChange={handlePicturesChange}
                    className="border rounded p-2 w-full"
                />
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                className="bg-blue-500 text-white py-2 px-4 rounded mt-4"
            >
                Submit
            </button>
        </form>
    );
};

const PictureModal = ({
    isOpen,
    onClose,
    picture,
}: {
    isOpen: boolean;
    onClose: () => void;
    picture: string;
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-10 flex justify-center items-center z-50"
            onClick={onClose}
        >
            <div className="bg-white p-4 rounded max-w-4xl max-h-screen overflow-auto relative">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-3xl font-bold text-gray-500 hover:text-red-700"
                >
                    &times;
                </button>
                <Image
                    src={`${process.env.BACKEND_LINK}/api/campus/housing/review_pictures/${picture}`}
                    alt="Review picture"
                    className="max-w-[80vw] max-h-[80vh] object-contain"
                />
            </div>
        </div>
    );
};

const RoomPage = () => {
    const params = useParams();
    const { building, room } = params;
    const [loading, setLoading] = useState(true);
    const [buildingName, setBuildingName] = useState<string>("");
    const [roomReviews, setRoomReviews] = useState<RoomWithReviews | null>(
        null
    );
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [selectedPicture, setSelectedPicture] = useState<string | null>(null);

    const handleAddNewReviewClick = () => {
        if (!isCreatingNew) {
            setIsCreatingNew(true);
        } else {
            setIsCreatingNew(false);
        }
    };

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                setLoading(true);

                // Fetch building data
                const buildingResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/campus/housing/${building}`
                );

                if (!buildingResponse.ok) {
                    throw new Error(
                        `Failed to fetch building name: ${buildingResponse.status}`
                    );
                }

                const buildingData = await buildingResponse.json();
                setBuildingName(buildingData.name);

                // Fetch reviews
                const reviews = await fetch(
                    `${process.env.BACKEND_LINK}/api/campus/housing/${building}/${room}/reviews`
                );

                if (!reviews.ok) {
                    throw new Error(
                        `Failed to fetch reviews: ${reviews.status}`
                    );
                }

                const data = await reviews.json();

                setRoomReviews(data);
            } catch (error) {
                console.error("Error fetching room reviews:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [building, room]);

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">
                    Reviews for {buildingName} {room}
                </h1>

                <div className="py-4 overflow-y-auto flex-grow">
                    {roomReviews &&
                    roomReviews.averages &&
                    roomReviews.averages.reviewCount > 0 ? (
                        <>
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="text-lg font-medium mb-3">
                                    Summary
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-gray-600">Overall</p>
                                        <div className="flex items-center">
                                            <StarRating
                                                rating={
                                                    roomReviews.averages
                                                        .overallAverage
                                                }
                                            />
                                            <span className="ml-2">
                                                {roomReviews.averages.overallAverage.toFixed(
                                                    1
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Quiet</p>
                                        <div className="flex items-center">
                                            <StarRating
                                                rating={
                                                    roomReviews.averages
                                                        .quietAverage
                                                }
                                            />
                                            <span className="ml-2">
                                                {roomReviews.averages.quietAverage.toFixed(
                                                    1
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Layout</p>
                                        <div className="flex items-center">
                                            <StarRating
                                                rating={
                                                    roomReviews.averages
                                                        .layoutAverage
                                                }
                                            />
                                            <span className="ml-2">
                                                {roomReviews.averages.layoutAverage.toFixed(
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
                                                    roomReviews.averages
                                                        .temperatureAverage
                                                }
                                            />
                                            <span className="ml-2">
                                                {roomReviews.averages.temperatureAverage.toFixed(
                                                    1
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-gray-500 mt-3">
                                    Based on {roomReviews.averages.reviewCount}{" "}
                                    review
                                    {roomReviews.averages.reviewCount !== 1
                                        ? "s"
                                        : ""}
                                </p>
                            </div>

                            <div className="py-4">
                                <hr className="border-t border-gray-300" />
                            </div>

                            {/* User Reviews */}
                            <div className="space-y-6">
                                {roomReviews.reviews.map((review) => (
                                    <div
                                        key={review._id}
                                        className="border-b pb-4"
                                    >
                                        <div className="flex items-center mb-2">
                                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                                <span className="ml-2 text-m text-gray-600 mr-2">
                                                    Overall Rating:
                                                </span>
                                                <span>
                                                    <StarRating
                                                        rating={
                                                            review.overall_rating ||
                                                            0
                                                        }
                                                    />
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                            <div className="text-sm flex items-center mb-2">
                                                <span className="text-gray-600 mr-2">
                                                    Quiet:
                                                </span>
                                                <span className="inline">
                                                    <StarRating
                                                        rating={
                                                            review.quiet_rating ||
                                                            0
                                                        }
                                                    />
                                                </span>
                                            </div>
                                            <div className="text-sm flex items-center mb-1">
                                                <span className="text-gray-600 mr-2">
                                                    Layout:
                                                </span>
                                                <span className="inline">
                                                    <StarRating
                                                        rating={
                                                            review.layout_rating ||
                                                            0
                                                        }
                                                    />
                                                </span>
                                            </div>
                                            <div className="text-sm flex items-center mb-2">
                                                <span className="text-gray-600 mr-2">
                                                    Temperature:
                                                </span>
                                                <span className="inline">
                                                    <StarRating
                                                        rating={
                                                            review.temperature_rating ||
                                                            0
                                                        }
                                                    />
                                                </span>
                                            </div>
                                        </div>

                                        {review.comments && (
                                            <div className="mt-2 mb-2">
                                                <p className="text-gray-800">
                                                    {review.comments}
                                                </p>
                                            </div>
                                        )}

                                        {/* Review Pictures */}
                                        {review.pictures && (
                                            <div className="pictures-container flex space-x-4">
                                                {review.pictures &&
                                                    review.pictures.length >
                                                        0 &&
                                                    review.pictures.map(
                                                        (picture, index) => (
                                                            <div
                                                                key={index}
                                                                className="picture-item"
                                                            >
                                                                <Image
                                                                    src={`${process.env.BACKEND_LINK}/api/campus/housing/review_pictures/${picture}`}
                                                                    alt={`Review image ${
                                                                        index +
                                                                        1
                                                                    }`}
                                                                    className="object-cover"
                                                                    onClick={() =>
                                                                        setSelectedPicture(
                                                                            picture
                                                                        )
                                                                    } // Open modal when image is clicked
                                                                    style={{
                                                                        height: "200px",
                                                                        objectFit:
                                                                            "cover",
                                                                    }}
                                                                />
                                                            </div>
                                                        )
                                                    )}
                                            </div>
                                        )}

                                        {selectedPicture && (
                                            // If user clicks a picture, open a popup with enlarged image
                                            <PictureModal
                                                isOpen={!!selectedPicture}
                                                onClose={() =>
                                                    setSelectedPicture(null)
                                                }
                                                picture={selectedPicture}
                                            />
                                        )}

                                        {/* TODO: Add date */}
                                        {/* <p className="text-gray-500 mt-3">
                                            Review written 
                                        </p> */}
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

                <button
                    className="px-6 py-2 border border-blue-300 text-blue-500 rounded-md hover:bg-blue-50 transition-colors mt-4 mb-6"
                    onClick={handleAddNewReviewClick}
                >
                    Add a new review
                </button>

                {isCreatingNew && (
                    <div>
                        <ReviewForm />
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomPage;
