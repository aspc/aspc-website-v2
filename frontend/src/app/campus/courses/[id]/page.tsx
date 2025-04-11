"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import { CourseWithReviews, Course, CourseReview } from "@/types";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import LoginRequired from "@/components/LoginRequired";
import { StarRating, getRoomOccupancyType } from "@/components/housing/Rooms";
import { ReviewForm, PictureModal } from "@/components/housing/Reviews";

const CoursePage = () => {
    const params = useParams();
    const { id } = params;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [courseName, setCourseName] = useState<string>("");
    const [courseReviews, setCourseReviews] =
        useState<CourseWithReviews | null>(null);
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                setLoading(true);

                // Fetch course data
                const coursesResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/courses/${id}`
                );

                if (!coursesResponse.ok) {
                    throw new Error(
                        `Failed to fetch building name: ${coursesResponse.status}`
                    );
                }

                const courseData = await coursesResponse.json();
                setCourseName(courseData.name);

                // Fetch course reviews
                const reviews = await fetch(
                    `${process.env.BACKEND_LINK}/api/courses/${id}/reviews`
                );

                if (!reviews.ok) {
                    throw new Error(
                        `Failed to fetch reviews: ${reviews.status}`
                    );
                }

                const data: CourseReview[] = await reviews.json();
                const reviewsData: CourseWithReviews = {
                    reviews: data,
                    course: courseData,
                };

                setCourseReviews(reviewsData);
                console.log("Course reviews:", reviewsData);
            } catch (error) {
                console.error("Error fetching room reviews:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [id]);

    const targetRef = useRef<HTMLButtonElement | null>(null);

    // const scrollToReviewForm = () => {
    //     setTimeout(() => {
    //         if (targetRef.current) {
    //             targetRef.current.scrollIntoView({
    //                 behavior: "smooth",
    //                 block: "start",
    //             });
    //         }
    //     }, 0);
    // };

    if (loading || authLoading) {
        return <Loading />;
    }

    if (!user) {
        return <LoginRequired />;
    }

    const formatDate = (date: Date) => {
        const d = new Date(date);
        const month = d.toLocaleString("default", { month: "long" });
        const year = d.getFullYear();
        return `${month} ${year}`;
    };

    // const handleDelete = async (id: number) => {
    //     if (window.confirm("Are you sure you want to delete this review?")) {
    //         try {
    //             setLoading(true);
    //             const response = await fetch(
    //                 `${process.env.BACKEND_LINK}/api/campus/housing/reviews/${id}`,
    //                 {
    //                     method: "DELETE",
    //                 }
    //             );

    //             if (!response.ok) {
    //                 throw new Error("Failed to delete review");
    //             }

    //             alert("Review deleted successfully!");
    //             setTimeout(() => window.location.reload(), 1000);
    //         } catch (error) {
    //             console.error("Error deleting review", error);
    //             alert("Failed to delete review");
    //         } finally {
    //             setLoading(false);
    //         }
    //     }
    // };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="mb-6 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                Back
            </button>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">
                    Reviews for {courseName}
                </h1>

                <div className="py-4 flex-grow">
                    {/* {courseReviews &&
                    courseReviews. &&
                    courseReviews.averages.reviewCount > 0 ? (
                        <>
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="text-lg font-medium mb-3">
                                    Summary
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <p className="text-gray-600">
                                        Occupancy:{" "}
                                        {getRoomOccupancyType(
                                            roomReviews.room.occupancy_type
                                        )}
                                    </p>

                                    {roomReviews.room.size && (
                                        <p className="text-gray-600">
                                            Size: {roomReviews.room.size} sq.
                                            ft.
                                        </p>
                                    )}
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
                            </div> */}

                    {/* User Reviews */}
                    {courseReviews ? (
                        <div className="space-y-6">
                            {courseReviews.reviews.map((review) => (
                                <div key={review._id} className="border-b pb-4">
                                    <div className="flex justify-between mb-2">
                                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                            <span className="text-m text-gray-600 mr-2">
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
                                            <span className="ml-2">
                                                {review.overall_rating || ""}
                                            </span>
                                        </div>

                                        {/* {user.email == review.user_email && (
                                            <div className="flex p-2 gap-4">
                                                <button
                                                    className="bg-blue-500 text-white text-m px-4 rounded-md hover:bg-blue-600"
                                                    onClick={() => {
                                                        setSelectedReview(
                                                            review
                                                        );
                                                        scrollToReviewForm();
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="bg-red-500 text-white text-m px-4 rounded-md hover:bg-red-600"
                                                    onClick={() => {
                                                        handleDelete(review.id);
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )} */}
                                    </div>

                                    {review.comments && (
                                        <div className="mt-2 mb-2">
                                            <p className="text-gray-800">
                                                {review.comments}
                                            </p>
                                        </div>
                                    )}

                                    {/* Review Pictures */}
                                    {/* {review.pictures && (
                                        <div className="pictures-container flex space-x-4">
                                            {review.pictures &&
                                                review.pictures.length > 0 &&
                                                review.pictures.map(
                                                    (picture, index) => (
                                                        <div
                                                            key={index}
                                                            className="picture-item"
                                                        >
                                                            <Image
                                                                src={`${process.env.BACKEND_LINK}/api/campus/housing/review_pictures/${picture}`}
                                                                alt={`Review image ${
                                                                    index + 1
                                                                }`}
                                                                width={200}
                                                                height={200}
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
                                    )} */}

                                    {/* If user clicks a picture, open a popup with enlarged image */}
                                    {/* {selectedPicture && (
                                        <PictureModal
                                            isOpen={!!selectedPicture}
                                            onClose={() =>
                                                setSelectedPicture(null)
                                            }
                                            picture={selectedPicture}
                                        />
                                    )} */}

                                    {/* Date written, last updated */}
                                    <div className="flex space-x-16">
                                        <p className="text-gray-500 mt-3">
                                            Review written{" "}
                                            {review.createdAt &&
                                                formatDate(review.createdAt)}
                                        </p>
                                        <p className="text-gray-500 mt-3">
                                            Last updated{" "}
                                            {review.updatedAt &&
                                                formatDate(review.updatedAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40">
                            <p className="text-gray-500 text-lg">
                                No reviews yet for this course.
                            </p>
                            <p className="text-gray-400">
                                Be the first to leave a review!
                            </p>
                        </div>
                    )}
                </div>

                {/* <button
                    className="px-6 py-2 border border-blue-300 text-blue-500 rounded-md hover:bg-blue-50 transition-colors mt-4 mb-6"
                    onClick={handleAddNewReviewClick}
                    ref={targetRef}
                >
                    {selectedReview ? "Cancel review edit" : "Add new review"}
                </button> */}

                {/* {(isCreatingNew || selectedReview) && (
                    <div>
                        <ReviewForm review={selectedReview} />
                    </div>
                )} */}
            </div>
        </div>
    );
};

export default CoursePage;
