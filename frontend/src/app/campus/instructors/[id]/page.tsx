'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Loading from '@/components/Loading';
import { useAuth } from '@/hooks/useAuth';
import LoginRequired from '@/components/LoginRequired';
import { StarRating } from '@/components/housing/Rooms';
import { ReviewForm } from '@/components/courses/Review';
import { FormattedReviewText } from '@/utils/textFormatting';
import {
    CourseReview,
    //Course,
    Instructor,
    InstructorWithReviews,
} from '@/types';
import Link from 'next/link';

interface AverageRatings {
    overallAverage: number;
    inclusivityAverage: number;
    challengeAverage: number;
    reviewCount: number;
}

const InstructorPage = (): JSX.Element => {
    const params = useParams();
    const instructorId = typeof params.id === 'string' ? params.id : '';
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(true);
    const [instructorName, setInstructorName] = useState<string>('');
    const [instructorSchool, setInstructorSchool] = useState<string>('');
    const [instructorCourses, setInstructorCourses] = useState<
        Array<{ courseId: number; courseCode: string; courseName: string }>
    >([]);
    const [instructorReviews, setInstructorReviews] =
        useState<InstructorWithReviews | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
    const [selectedReview, setSelectedReview] = useState<CourseReview | null>(
        null
    );
    const { user, loading: authLoading } = useAuth();
    const [averageRatings, setAverageRatings] = useState<AverageRatings>({
        overallAverage: 0,
        inclusivityAverage: 0,
        challengeAverage: 0,
        reviewCount: 0,
    });

    const handleAddNewReviewClick = (): void => {
        if (isCreatingNew) {
            setIsCreatingNew(false);
        } else if (selectedReview) {
            if (
                window.confirm(
                    'Are you sure you want to cancel editing this review? All new changes will be lost.'
                )
            ) {
                setSelectedReview(null);
            }
        } else {
            setIsCreatingNew(true);
            scrollToReviewForm();
        }
    };

    // Function to convert school code to full name
    const getSchoolFullName = (code: string): string => {
        switch (code) {
            case 'PO':
                return 'Pomona College';
            case 'CM':
                return 'Claremont Mckenna College';
            case 'SC':
                return 'Scripps College';
            case 'HM':
                return 'Harvey Mudd College';
            case 'PZ':
                return 'Pitzer College';
            case 'N/A':
            default:
                return code;
        }
    };

    useEffect(() => {
        const fetchReviews = async (): Promise<void> => {
            try {
                // Function to calculate average ratings
                //--------------------------------------
                const calculateAverage = (
                    reviews: CourseReview[]
                ): AverageRatings => {
                    if (!reviews || reviews.length === 0) {
                        return {
                            overallAverage: 0,
                            inclusivityAverage: 0,
                            challengeAverage: 0,
                            reviewCount: 0,
                        };
                    }

                    let overallSum = 0;
                    let overallCount = 0;
                    let inclusivitySum = 0;
                    let inclusivityCount = 0;
                    let challengeSum = 0;
                    let challengeCount = 0;

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
                        reviewCount: reviews.length,
                    };
                };
                //-----------------------------------------

                setLoading(true);

                // Fetch instructor data
                const instructorResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/instructors/${instructorId}`,
                    {
                        credentials: 'include',
                    }
                );

                if (!instructorResponse.ok) {
                    throw new Error(
                        `Failed to fetch instructor: ${instructorResponse.status}`
                    );
                }

                const instructorData: Instructor =
                    await instructorResponse.json();
                setInstructorName(instructorData.name);
                setInstructorSchool(instructorData.school || 'N/A');
                setInstructorCourses(instructorData.courses || []);

                // Fetch instructor reviews
                const reviews = await fetch(
                    `${process.env.BACKEND_LINK}/api/instructors/${instructorId}/reviews`,
                    {
                        credentials: 'include',
                    }
                );

                if (!reviews.ok) {
                    throw new Error(
                        `Failed to fetch instructor reviews: ${reviews.status}`
                    );
                }

                const reviewsData: CourseReview[] = await reviews.json();

                setAverageRatings(calculateAverage(reviewsData));

                const instructorWithReviews: InstructorWithReviews = {
                    reviews: reviewsData,
                    instructor: instructorData,
                };

                setInstructorReviews(instructorWithReviews);
            } catch (error) {
                console.error('Server error', error);
            } finally {
                setLoading(false);
            }
        };

        if (instructorId) {
            fetchReviews();
        }
    }, [instructorId]);

    const targetRef = useRef<HTMLButtonElement | null>(null);

    const scrollToReviewForm = (): void => {
        setTimeout(() => {
            if (targetRef.current) {
                targetRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }
        }, 0);
    };

    if (loading || authLoading) {
        return <Loading />;
    }

    if (!user) {
        return <LoginRequired />;
    }

    const formatDate = (date: Date): string => {
        const d = new Date(date);
        const month = d.toLocaleString('default', { month: 'long' });
        const year = d.getFullYear();
        return `${month} ${year}`;
    };

    // Format average work per week to a readable string
    const formatWorkPerWeek = (hours: number): string => {
        if (hours === 0) return 'N/A';
        if (hours < 1) return 'Less than 1 hour';
        if (hours < 2) return '1 hour';
        return `${Math.round(hours)} hours`;
    };

    const handleDelete = async (id: number): Promise<void> => {
        if (window.confirm('Are you sure you want to delete this review?')) {
            try {
                setLoading(true);
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/courses/reviews/${id}`, // Reusing the course review endpoint
                    {
                        method: 'DELETE',
                        credentials: 'include',
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to delete review');
                }

                alert('Review deleted successfully!');
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                console.error('Error deleting review', error);
                alert('Failed to delete review');
            } finally {
                setLoading(false);
            }
        }
    };

    // Format the courses list with each course on its own line and with styled links
    const formatCoursesList = (): JSX.Element => {
        if (!instructorCourses || instructorCourses.length === 0)
            return <span>No courses listed</span>;

        // Sort courses if needed
        const sortedCourses = [...instructorCourses].sort((a, b) =>
            a.courseCode.localeCompare(b.courseCode)
        );

        // Return a JSX fragment with each course as a link on its own line
        return (
            <div className="mt-2 flex flex-col space-y-2">
                {sortedCourses.map((course) => (
                    <div key={course.courseId} className="flex items-start">
                        <span className="mr-2 text-gray-400">•</span>
                        <Link
                            href={`/campus/courses/${course.courseId}`}
                            className="text-gray-700 hover:text-indigo-600 hover:underline transition-colors duration-200 font-medium"
                        >
                            {course.courseCode}: {course.courseName}
                        </Link>
                    </div>
                ))}
            </div>
        );
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
                    {instructorName}
                </h1>

                <div className="py-4 flex-grow">
                    {instructorReviews ? (
                        <>
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="text-lg font-medium mb-3">
                                    Instructor Information
                                </h4>

                                {/* School and courses info about the prof */}
                                <div className="mb-4">
                                    <p className="text-gray-700 mb-2">
                                        <span className="font-medium">
                                            School:
                                        </span>{' '}
                                        {getSchoolFullName(instructorSchool)}
                                    </p>
                                    <div className="text-gray-700">
                                        <details className="mt-2">
                                            <summary className="cursor-pointer text-indigo-600 hover:underline">
                                                View Courses
                                            </summary>
                                            <div className="mt-2">
                                                {formatCoursesList()}
                                            </div>
                                        </details>
                                    </div>
                                </div>

                                {averageRatings &&
                                    averageRatings.reviewCount > 0 && (
                                        <>
                                            <h4 className="text-lg font-medium mb-3 mt-6">
                                                Review Summary
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-gray-600">
                                                        Overall Rating
                                                    </p>
                                                    <div className="flex items-center">
                                                        <StarRating
                                                            rating={Math.round(
                                                                averageRatings.overallAverage
                                                            )}
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
                                                            rating={Math.round(
                                                                averageRatings.inclusivityAverage
                                                            )}
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
                                                            rating={Math.round(
                                                                averageRatings.challengeAverage
                                                            )}
                                                        />
                                                        <span className="ml-2">
                                                            {averageRatings.challengeAverage.toFixed(
                                                                1
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-gray-500 mt-3">
                                                Based on{' '}
                                                {averageRatings.reviewCount}{' '}
                                                review
                                                {averageRatings.reviewCount !==
                                                1
                                                    ? 's'
                                                    : ''}
                                            </p>
                                        </>
                                    )}
                            </div>

                            <button
                                className="px-6 py-2 border border-blue-300 text-blue-500 rounded-md hover:bg-blue-50 transition-colors mt-4 mb-6"
                                onClick={handleAddNewReviewClick}
                                ref={targetRef}
                            >
                                Add New Review
                            </button>

                            <div className="py-4">
                                <hr className="border-t border-gray-300" />
                            </div>
                        </>
                    ) : null}

                    {/* User Reviews */}
                    {instructorReviews ? (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                Student Reviews
                            </h2>
                            {instructorReviews.reviews.length > 0 ? (
                                instructorReviews.reviews.map((review) => (
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
                                                        rating={Math.round(
                                                            review.overall_rating ||
                                                                0
                                                        )}
                                                    />
                                                </span>
                                                <span className="ml-2">
                                                    {review.overall_rating ||
                                                        ''}
                                                </span>
                                            </div>

                                            {user.email ===
                                                review.user_email && (
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
                                                            handleDelete(
                                                                review.id
                                                            );
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
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
                                                            rating={Math.round(
                                                                review.challenge_rating ||
                                                                    0
                                                            )}
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
                                                            rating={Math.round(
                                                                review.inclusivity_rating ||
                                                                    0
                                                            )}
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
                                                        : 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-sm mb-2">
                                            <span className="text-gray-600 mr-2">
                                                Course:
                                            </span>
                                            <a
                                                href={`../courses/${review.course_id}`}
                                                className="text-blue-500 hover:underline"
                                            >
                                                {review.course_id}
                                            </a>
                                        </div>

                                        {review.comments && (
                                            <div className="mt-2 mb-2">
                                                <FormattedReviewText
                                                    text={review.comments}
                                                    className="text-gray-800"
                                                />
                                            </div>
                                        )}

                                        {/* Date written, last updated */}
                                        <div className="flex flex-wrap gap-4 mt-4">
                                            <p className="text-gray-500">
                                                Review written{' '}
                                                {review.createdAt &&
                                                    formatDate(
                                                        review.createdAt
                                                    )}
                                            </p>
                                            <p className="text-gray-500">
                                                Last updated{' '}
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
                                        No reviews yet for this instructor.
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
                                No reviews yet for this instructor.
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
                    ref={targetRef}
                >
                    {selectedReview ? 'Cancel review edit' : 'Add new review'}
                </button>

                {(isCreatingNew || selectedReview) && (
                    <div>
                        <ReviewForm
                            review={selectedReview}
                            courseId={selectedReview?.course_id || undefined}
                            instructorId={Number(instructorId)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default InstructorPage;
