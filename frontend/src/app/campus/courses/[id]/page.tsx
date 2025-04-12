"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import { CourseWithReviews, Course, CourseReview } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import LoginRequired from "@/components/LoginRequired";
import { StarRating } from "@/components/housing/Rooms";

const CoursePage = () => {
    const params = useParams();
    const { id } = params;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [courseName, setCourseName] = useState<string>("");
    const [courseReviews, setCourseReviews] =
        useState<CourseWithReviews | null>(null);
    const { user, loading: authLoading } = useAuth();
    const [averageRatings, setAverageRatings] = useState({
        overallAverage: 0,
        inclusivityAverage: 0,
        challengeAverage: 0,
        workPerWeekAverage: 0,
        reviewCount: 0,
    });

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const calculateAverage = (reviews: CourseReview[]) => {
                    if (!reviews || reviews.length === 0) {
                        return {
                            overallAverage: 0,
                            inclusivityAverage: 0,
                            challengeAverage: 0,
                            workPerWeekAverage: 0,
                            reviewCount: 0,
                        };
                    }

                    let overallSum = 0;
                    let overallCount = 0;
                    let inclusivitySum = 0;
                    let inclusivityCount = 0;
                    let challengeSum = 0;
                    let challengeCount = 0;
                    let workPerWeekSum = 0;
                    let workPerWeekCount = 0;

                    reviews.forEach((review) => {
                        if (review.overall_rating) {
                            overallSum += review.overall_rating;
                            overallCount++;
                        }
                        if (review.inclusivity_rating) {
                            inclusivitySum += review.inclusivity_rating;
                            inclusivityCount++;
                        }
                        if (review.challenge_rating) {
                            challengeSum += review.challenge_rating;
                            challengeCount++;
                        }
                        if (review.work_per_week) {
                            workPerWeekSum += review.work_per_week;
                            workPerWeekCount++;
                        }
                    });

                    return {
                        overallAverage:
                            overallCount > 0 ? overallSum / overallCount : 0,
                        inclusivityAverage:
                            inclusivityCount > 0
                                ? inclusivitySum / inclusivityCount
                                : 0,
                        challengeAverage:
                            challengeCount > 0
                                ? challengeSum / challengeCount
                                : 0,
                        workPerWeekAverage:
                            workPerWeekCount > 0
                                ? workPerWeekSum / workPerWeekCount
                                : 0,
                        reviewCount: reviews.length,
                    };
                };

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

                setAverageRatings(calculateAverage(data));

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

    // Calculate the average for the course

    // Format average work per week to a readable string
    const formatWorkPerWeek = (hours: number) => {
        if (hours === 0) return "N/A";
        if (hours < 1) return "Less than 1 hour";
        if (hours < 2) return "1 hour";
        return `${Math.round(hours)} hours`;
    };

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
                    {courseName}
                </h1>

                <div className="py-4 flex-grow">
                    {courseReviews ? (
                        <>
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="text-lg font-medium mb-3">
                                    Course Information
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-gray-600 font-medium">
                                            Course Code:
                                        </p>
                                        <p>{courseReviews.course.code}</p>
                                    </div>

                                    {courseReviews.course.department_names &&
                                        courseReviews.course.department_names
                                            .length > 0 && (
                                            <div>
                                                <p className="text-gray-600 font-medium">
                                                    Departments:
                                                </p>
                                                <p>
                                                    {courseReviews.course.department_names
                                                        .map((dept) =>
                                                            dept.includes(
                                                                "Philosophy,Politics,Econ"
                                                            )
                                                                ? "PPE"
                                                                : dept
                                                        )
                                                        .join(", ")}
                                                </p>
                                            </div>
                                        )}

                                    {courseReviews.course.requirement_names &&
                                        courseReviews.course.requirement_names
                                            .length > 0 && (
                                            <div className="col-span-1 md:col-span-2">
                                                <p className="text-gray-600 font-medium">
                                                    Requirements Fulfilled:
                                                </p>
                                                <p>
                                                    {courseReviews.course.requirement_names.join(
                                                        ", "
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                    {courseReviews.course.term_keys &&
                                    courseReviews.course.term_keys.length >
                                        0 ? (
                                        <div>
                                            <p className="text-gray-600 font-medium">
                                                Terms Offered (After 2020):
                                            </p>
                                            <p>
                                                {courseReviews.course.term_keys
                                                    .filter((term) => {
                                                        // Extract the year from term (format: "2002;FA")
                                                        const year = parseInt(
                                                            term.split(";")[0],
                                                            10
                                                        );
                                                        // Only include terms after 2020
                                                        return year > 2020;
                                                    })
                                                    .map((term) => {
                                                        const [year, semester] =
                                                            term.split(";");

                                                        // Convert semester code to full name
                                                        let semesterName = "";
                                                        switch (semester) {
                                                            case "FA":
                                                                semesterName =
                                                                    "Fall";
                                                                break;
                                                            case "SP":
                                                                semesterName =
                                                                    "Spring";
                                                                break;
                                                            case "SU":
                                                                semesterName =
                                                                    "Summer";
                                                                break;
                                                            case "WI":
                                                                semesterName =
                                                                    "Winter";
                                                                break;
                                                            default:
                                                                semesterName =
                                                                    semester;
                                                        }

                                                        return `${semesterName} ${year}`;
                                                    })
                                                    .join(", ")}
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-gray-600 font-medium">
                                                Terms Offered:
                                            </p>
                                            <p>Offered most terms</p>
                                        </div>
                                    )}
                                </div>

                                {courseReviews.course.description && (
                                    <div className="mb-4">
                                        <p className="text-gray-600 font-medium">
                                            Description:
                                        </p>
                                        <p className="text-gray-800">
                                            {courseReviews.course.description}
                                        </p>
                                    </div>
                                )}

                                {averageRatings &&
                                    averageRatings.reviewCount > 0 && (
                                        <>
                                            <h4 className="text-lg font-medium mb-3 mt-6">
                                                Review Summary
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-gray-600">
                                                        Overall Rating
                                                    </p>
                                                    <div className="flex items-center">
                                                        <StarRating
                                                            rating={
                                                                averageRatings.overallAverage
                                                            }
                                                        />
                                                        <span className="ml-2">
                                                            {averageRatings.overallAverage.toFixed(
                                                                1
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">
                                                        Inclusivity
                                                    </p>
                                                    <div className="flex items-center">
                                                        <StarRating
                                                            rating={
                                                                averageRatings.inclusivityAverage
                                                            }
                                                        />
                                                        <span className="ml-2">
                                                            {averageRatings.inclusivityAverage.toFixed(
                                                                1
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">
                                                        Challenge Level
                                                    </p>
                                                    <div className="flex items-center">
                                                        <StarRating
                                                            rating={
                                                                averageRatings.challengeAverage
                                                            }
                                                        />
                                                        <span className="ml-2">
                                                            {averageRatings.challengeAverage.toFixed(
                                                                1
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">
                                                        Average Work Per Week
                                                    </p>
                                                    <p className="font-medium">
                                                        {formatWorkPerWeek(
                                                            averageRatings.workPerWeekAverage
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-gray-500 mt-3">
                                                Based on{" "}
                                                {averageRatings.reviewCount}{" "}
                                                review
                                                {averageRatings.reviewCount !==
                                                1
                                                    ? "s"
                                                    : ""}
                                            </p>
                                        </>
                                    )}
                            </div>

                            <div className="py-4">
                                <hr className="border-t border-gray-300" />
                            </div>
                        </>
                    ) : null}

                    {/* User Reviews */}
                    {courseReviews ? (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                Student Reviews
                            </h2>
                            {courseReviews.reviews.length > 0 ? (
                                courseReviews.reviews.map((review) => (
                                    <div
                                        key={review._id}
                                        className="border-b pb-4 bg-white p-4 rounded-lg shadow-sm"
                                    >
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
                                                    {review.overall_rating ||
                                                        ""}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                                            {review.challenge_rating !==
                                                undefined && (
                                                <div className="text-sm flex items-center mb-2">
                                                    <span className="text-gray-600 mr-2">
                                                        Difficulty:
                                                    </span>
                                                    <span className="inline">
                                                        <StarRating
                                                            rating={
                                                                review.challenge_rating ||
                                                                0
                                                            }
                                                        />
                                                    </span>
                                                </div>
                                            )}
                                            {review.inclusivity_rating && (
                                                <div className="text-sm flex items-center mb-1">
                                                    <span className="text-gray-600 mr-2">
                                                        Inclusivity:
                                                    </span>
                                                    <span className="inline">
                                                        <StarRating
                                                            rating={
                                                                review.inclusivity_rating ||
                                                                0
                                                            }
                                                        />
                                                    </span>
                                                </div>
                                            )}
                                            <div className="text-sm flex items-center mb-2">
                                                <span className="text-gray-600 mr-2">
                                                    Work per week:
                                                </span>
                                                <span className="inline">
                                                    {review.work_per_week
                                                        ? `${formatWorkPerWeek(
                                                              review.work_per_week
                                                          )}`
                                                        : "N/A"}
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

                                        {/* Date written, last updated */}
                                        <div className="flex flex-wrap gap-4 mt-4">
                                            <p className="text-gray-500">
                                                Review written{" "}
                                                {review.createdAt &&
                                                    formatDate(
                                                        review.createdAt
                                                    )}
                                            </p>
                                            <p className="text-gray-500">
                                                Last updated{" "}
                                                {review.updatedAt &&
                                                    formatDate(
                                                        review.updatedAt
                                                    )}
                                            </p>
                                        </div>
                                    </div>
                                ))
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
            </div>
        </div>
    );
};

export default CoursePage;
