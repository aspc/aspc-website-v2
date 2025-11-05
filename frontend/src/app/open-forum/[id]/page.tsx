'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Loading from '@/components/Loading';
import {
    ForumEvent,
    EventWithReviews,
    EventReview,
    EventReviewAverages,
    User,
} from '@/types';
import { useAuth } from '@/hooks/useAuth';
import LoginRequired from '@/components/LoginRequired';
import { StarRating } from '@/components/housing/Rooms';
import { ReviewModal } from '@/components/open-forum/ReviewModal';
import { FormattedReviewText } from '@/utils/textFormatting';
import moment from 'moment';

const EventDetailsPage = () => {
    const params = useParams();
    const { id } = params;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [eventName, setEventName] = useState<string>('');
    const [eventDetails, setEventDetails] = useState<EventWithReviews | null>(
        null
    );
    const [selectedReview, setSelectedReview] = useState<EventReview | null>(
        null
    );
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user, loading: authLoading } = useAuth();
    const [averageRatings, setAverageRatings] =
        useState<EventReviewAverages | null>(null);
    const [creatorInfo, setCreatorInfo] = useState<User | null>(null);

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedReview(null);
    };

    // Check if ratingUntil is still valid (not expired)
    const isRatingPeriodValid = () => {
        if (!eventDetails) return false;
        const now = new Date();
        const ratingUntil = new Date(eventDetails.event.ratingUntil);
        return ratingUntil >= now;
    };

    const handleAddNewReviewClick = () => {
        if (!isRatingPeriodValid()) {
            alert(
                'Rating period has expired. You can no longer add or edit reviews for this event.'
            );
            return;
        }

        if (selectedReview) {
            if (
                window.confirm(
                    'Are you sure you want to cancel editing this review? All new changes will be lost.'
                )
            ) {
                setSelectedReview(null);
            }
        } else {
            setIsModalOpen(true);
        }
    };

    const handleFormSubmitSuccess = () => {
        // Refresh the page to show updated data
        window.location.reload();
    };

    // Helper function to get author ID
    const getAuthorId = (author: string | User): string => {
        if (typeof author === 'string') {
            return author;
        }
        return author._id || author.id;
    };

    // Helper function to get author display name
    const getAuthorDisplay = (author: string | User): string => {
        if (typeof author === 'string') {
            return 'Unknown User';
        }
        const fullName =
            `${author.firstName || ''} ${author.lastName || ''}`.trim();
        return fullName || author.email || 'Unknown User';
    };

    useEffect(() => {
        const fetchEventDetails = async () => {
            try {
                setLoading(true);

                // Fetch event data
                const eventResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/openforum/${id}`,
                    {
                        method: 'GET',
                        credentials: 'include',
                    }
                );

                if (!eventResponse.ok) {
                    throw new Error(
                        `Failed to fetch event: ${eventResponse.status}`
                    );
                }

                const eventData: ForumEvent = await eventResponse.json();
                setEventName(eventData.title);

                // Fetch creator user info
                if (eventData.createdBy) {
                    try {
                        const userResponse = await fetch(
                            `${process.env.BACKEND_LINK}/api/auth/users/${eventData.createdBy}`,
                            {
                                method: 'GET',
                                credentials: 'include',
                            }
                        );

                        if (userResponse.ok) {
                            const userInfo: User = await userResponse.json();
                            setCreatorInfo(userInfo);
                        }
                    } catch (err) {
                        console.error('Failed to fetch creator info:', err);
                    }
                }

                // Fetch event reviews
                const reviewsResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/openforum/${id}/reviews`,
                    {
                        method: 'GET',
                        credentials: 'include',
                    }
                );

                if (!reviewsResponse.ok) {
                    throw new Error(
                        `Failed to fetch event reviews: ${reviewsResponse.status}`
                    );
                }

                const reviews: EventReview[] = await reviewsResponse.json();

                // Fetch average ratings
                const ratingsResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/openforum/${id}/ratings`,
                    {
                        method: 'GET',
                        credentials: 'include',
                    }
                );

                if (!ratingsResponse.ok) {
                    throw new Error(
                        `Failed to fetch average ratings: ${ratingsResponse.status}`
                    );
                }

                const averages: EventReviewAverages =
                    await ratingsResponse.json();

                setAverageRatings(averages);

                const eventWithReviews: EventWithReviews = {
                    event: eventData,
                    reviews: reviews,
                    averages: averages,
                };

                setEventDetails(eventWithReviews);
            } catch (error) {
                console.error('Server error', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEventDetails();
    }, [id]);

    if (loading || authLoading) {
        return <Loading />;
    }

    if (!user) {
        return <LoginRequired />;
    }

    const formatDate = (date: Date) => {
        const d = new Date(date);
        const month = d.toLocaleString('default', { month: 'long' });
        const year = d.getFullYear();
        return `${month} ${year}`;
    };

    const handleDelete = async (reviewId: string) => {
        if (!isRatingPeriodValid()) {
            alert(
                'Rating period has expired. You can no longer delete this review.'
            );
            return;
        }
        if (window.confirm('Are you sure you want to delete this review?')) {
            try {
                setLoading(true);
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/openforum/${reviewId}/review`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
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

    if (!eventDetails) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto px-4">
                <div className="text-center max-w-md w-full p-6 bg-white rounded-lg shadow-sm">
                    <h1 className="text-3xl font-bold text-red-500">
                        Event Not Found
                    </h1>
                    <p className="text-lg text-gray-700 mt-4">
                        The event you&apos;re looking for doesn&apos;t exist.
                        Please check the URL and try again.
                    </p>
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

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">
                        {eventName}
                    </h1>

                    <div className="py-4 flex-grow">
                        {eventDetails ? (
                            <>
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                    <h4 className="text-lg font-medium mb-3">
                                        Event Information
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-gray-600 font-medium">
                                                Created By:
                                            </p>
                                            <p>
                                                {creatorInfo
                                                    ? `${creatorInfo.firstName} ${creatorInfo.lastName}`
                                                    : eventDetails.event
                                                          .createdBy}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600 font-medium">
                                                Location:
                                            </p>
                                            <p>{eventDetails.event.location}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600 font-medium">
                                                Event Date:
                                            </p>
                                            <p>
                                                {moment(
                                                    eventDetails.event.eventDate
                                                ).format('LLLL')}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600 font-medium">
                                                Rating Until:
                                            </p>
                                            <p>
                                                {moment(
                                                    eventDetails.event
                                                        .ratingUntil
                                                ).format('LLLL')}
                                            </p>
                                        </div>
                                    </div>

                                    {eventDetails.event.description && (
                                        <div className="mb-4">
                                            <p className="text-gray-600 font-medium">
                                                Description:
                                            </p>
                                            <div className="text-gray-800">
                                                <FormattedReviewText
                                                    text={
                                                        eventDetails.event
                                                            .description
                                                    }
                                                    className="text-gray-800"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {averageRatings &&
                                        averageRatings.totalResponses > 0 && (
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
                                                                rating={Math.round(
                                                                    averageRatings.overall
                                                                )}
                                                            />
                                                            <span className="ml-2">
                                                                {averageRatings.overall.toFixed(
                                                                    1
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">
                                                            Would Repeat
                                                        </p>
                                                        <div className="flex items-center">
                                                            <StarRating
                                                                rating={Math.round(
                                                                    averageRatings.wouldRepeat
                                                                )}
                                                            />
                                                            <span className="ml-2">
                                                                {averageRatings.wouldRepeat.toFixed(
                                                                    1
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {averageRatings.customQuestions
                                                    .length > 0 && (
                                                    <div className="mt-4">
                                                        <h5 className="text-md font-medium mb-2">
                                                            Custom Questions
                                                        </h5>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {Object.entries(
                                                                averageRatings.customQuestions
                                                            ).map(
                                                                ([
                                                                    question,
                                                                    rating,
                                                                ]) => (
                                                                    <div
                                                                        key={
                                                                            question
                                                                        }
                                                                    >
                                                                        <p className="text-gray-600">
                                                                            {
                                                                                question
                                                                            }
                                                                        </p>
                                                                        <div className="flex items-center">
                                                                            <StarRating
                                                                                rating={Math.round(
                                                                                    rating
                                                                                )}
                                                                            />
                                                                            <span className="ml-2">
                                                                                {rating.toFixed(
                                                                                    1
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                <p className="text-gray-500 mt-3">
                                                    Based on{' '}
                                                    {
                                                        averageRatings.totalResponses
                                                    }{' '}
                                                    rating
                                                    {averageRatings.totalResponses >
                                                    1
                                                        ? 's'
                                                        : ''}
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
                        {eventDetails ? (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                    Event Reviews
                                </h2>
                                {eventDetails.reviews.length > 0 ? (
                                    eventDetails.reviews.map((rating) => {
                                        const authorId = getAuthorId(
                                            rating.author
                                        );
                                        const authorName = getAuthorDisplay(
                                            rating.author
                                        );
                                        const isAuthor =
                                            user._id === authorId ||
                                            user.id === authorId;

                                        return (
                                            <div
                                                key={rating._id}
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
                                                                    rating.overall ||
                                                                        0
                                                                )}
                                                            />
                                                        </span>
                                                        <span className="ml-2">
                                                            {rating.overall ||
                                                                ''}
                                                        </span>
                                                    </div>

                                                    {isAuthor &&
                                                        isRatingPeriodValid() && (
                                                            <div className="flex p-2 gap-4">
                                                                <button
                                                                    className="bg-blue-500 text-white text-m px-4 rounded-md hover:bg-blue-600"
                                                                    onClick={() => {
                                                                        setSelectedReview(
                                                                            rating
                                                                        );
                                                                        setIsModalOpen(
                                                                            true
                                                                        );
                                                                    }}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="bg-red-500 text-white text-m px-4 rounded-md hover:bg-red-600"
                                                                    onClick={() => {
                                                                        handleDelete(
                                                                            rating._id
                                                                        );
                                                                    }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                </div>

                                                {/* Author information */}
                                                <div className="mt-2 mb-2">
                                                    <p className="text-sm text-gray-600">
                                                        {rating?.isAnonymous ? (
                                                            <>
                                                                <span className="italic">
                                                                    Anonymous
                                                                    Review
                                                                </span>
                                                                {isAuthor && (
                                                                    <span className="ml-2 text-xs text-blue-600">
                                                                        (Your
                                                                        review)
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>
                                                                    Review by{' '}
                                                                    <span className="font-medium">
                                                                        {
                                                                            authorName
                                                                        }
                                                                    </span>
                                                                </span>
                                                                {isAuthor && (
                                                                    <span className="ml-2 text-xs text-blue-600">
                                                                        (Your
                                                                        review)
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                                    <div className="text-sm flex items-center mb-2">
                                                        <span className="text-gray-600 mr-2">
                                                            Would Repeat:
                                                        </span>
                                                        <span className="inline">
                                                            <StarRating
                                                                rating={Math.round(
                                                                    rating.wouldRepeat ||
                                                                        0
                                                                )}
                                                            />
                                                        </span>
                                                    </div>
                                                </div>

                                                {rating.customRatings &&
                                                    rating.customRatings
                                                        .length > 0 && (
                                                        <div className="mt-2 mb-2">
                                                            <h5 className="text-sm font-medium mb-2">
                                                                Custom Ratings
                                                            </h5>
                                                            <div className="space-y-1">
                                                                {rating.customRatings.map(
                                                                    (
                                                                        customRating,
                                                                        index
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                index
                                                                            }
                                                                            className="text-sm flex items-center"
                                                                        >
                                                                            <span className="text-gray-600 mr-2">
                                                                                {
                                                                                    customRating.question
                                                                                }

                                                                                :
                                                                            </span>
                                                                            <StarRating
                                                                                rating={Math.round(
                                                                                    customRating.rating ||
                                                                                        0
                                                                                )}
                                                                            />
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                {rating.content && (
                                                    <div className="mt-2 mb-2">
                                                        <h5 className="text-sm font-medium mb-2">
                                                            Review
                                                        </h5>
                                                        <FormattedReviewText
                                                            text={
                                                                rating.content
                                                            }
                                                            className="text-gray-800"
                                                        />
                                                    </div>
                                                )}

                                                {/* Date written */}
                                                <div className="flex flex-wrap gap-4 mt-4">
                                                    <p className="text-gray-500">
                                                        Rating submitted{' '}
                                                        {rating.createdAt &&
                                                            formatDate(
                                                                rating.createdAt
                                                            )}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40">
                                        <p className="text-gray-500 text-lg">
                                            No ratings yet for this event.
                                        </p>
                                        <p className="text-gray-400">
                                            Be the first to leave a rating!
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40">
                                <p className="text-gray-500 text-lg">
                                    No reviews yet for this event.
                                </p>
                                <p className="text-gray-400">
                                    Be the first to leave a review!
                                </p>
                            </div>
                        )}
                    </div>

                    {isRatingPeriodValid() ? (
                        <button
                            className="px-6 py-2 border border-blue-300 text-blue-500 rounded-md hover:bg-blue-50 transition-colors mt-4 mb-6"
                            onClick={handleAddNewReviewClick}
                        >
                            {selectedReview
                                ? 'Cancel rating edit'
                                : 'Add new rating'}
                        </button>
                    ) : (
                        <div className="mt-4 mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-yellow-800 font-medium">
                                ⚠️ This event is closed for reviews. The rating
                                period has expired.
                            </p>
                        </div>
                    )}

                    {/* Review Modal */}
                    {isModalOpen && (
                        <ReviewModal
                            isOpen={isModalOpen}
                            onClose={handleModalClose}
                            eventId={id as string}
                            review={selectedReview}
                            onSubmitSuccess={handleFormSubmitSuccess}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventDetailsPage;
