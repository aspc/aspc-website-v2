'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Loading from '@/components/Loading';
import { useAuth } from '@/hooks/useAuth';
import LoginRequired from '@/components/LoginRequired';
import { StarRating } from '@/components/housing/Rooms';
import { FormattedReviewText } from '@/utils/textFormatting';

interface ForumEvent {
    _id: string;
    title: string;
    description: string;
    createdBy: string;
    staffHost?: string;
    eventDate: Date;
    location: string;
    ratingUntil: Date;
    customQuestions?: Array<{
        question: string;
        type: 'rating' | 'text';
    }>;
    engageEventId?: string;
}

interface CustomRating {
    question: string;
    rating: number;
}

interface RatingDistribution {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
}

interface EventReview {
    _id: string;
    eventId: string;
    author:
        | string
        | {
              _id: string;
              email: string;
              firstName: string;
              lastName: string;
          };
    isAnonymous: boolean;
    content?: string;
    overall: number;
    wouldRepeat: number;
    customRatings?: CustomRating[];
    isHidden: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface EventStats {
    averageOverall: number;
    averageWouldRepeat: number;
    totalReviews: number;
    ratingDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
    customQuestions?: { [key: string]: number };
}

const EventDetailPage = () => {
    const params = useParams();
    const { id } = params;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState<ForumEvent | null>(null);
    const [reviews, setReviews] = useState<EventReview[]>([]);
    const [stats, setStats] = useState<EventStats | null>(null);
    const [hasUserReviewed, setHasUserReviewed] = useState(false);
    const { user, loading: authLoading } = useAuth();
    const reviewFormRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const fetchEventData = async () => {
            try {
                setLoading(true);

                // Fetch event details
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
                setEvent(eventData);

                // Fetch event stats
                const statsResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/openforum/${id}/ratings`,
                    {
                        method: 'GET',
                        credentials: 'include',
                    }
                );

                if (statsResponse.ok) {
                    const statsData: EventStats = await statsResponse.json();
                    setStats(statsData);
                }

                // Fetch reviews
                const reviewsResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/openforum/${id}/reviews`,
                    {
                        method: 'GET',
                        credentials: 'include',
                    }
                );

                if (reviewsResponse.ok) {
                    const reviewsData: EventReview[] =
                        await reviewsResponse.json();
                    setReviews(reviewsData);

                    // Check if user has already reviewed
                    if (user) {
                        const userReview = reviewsData.find((r) => {
                            const authorEmail =
                                typeof r.author === 'string'
                                    ? r.author
                                    : r.author?.email;
                            return authorEmail === user.email;
                        });
                        setHasUserReviewed(!!userReview);
                    }
                }
            } catch (error) {
                console.error('Server error', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEventData();
    }, [id, user]);

    if (loading || authLoading) {
        return <Loading />;
    }

    if (!user) {
        return <LoginRequired />;
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <p className="text-gray-500">Event not found</p>
            </div>
        );
    }

    const formatDate = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatTime = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDateTime = (date: Date) => {
        const d = new Date(date);
        const month = d.toLocaleString('default', { month: 'long' });
        const year = d.getFullYear();
        return `${month} ${year}`;
    };

    const getAuthorDisplay = (
        author:
            | string
            | {
                  _id: string;
                  email: string;
                  firstName: string;
                  lastName: string;
              }
    ): string => {
        if (typeof author === 'string') {
            return author;
        }
        if (author && typeof author === 'object') {
            const fullName =
                `${author.firstName || ''} ${author.lastName || ''}`.trim();
            return fullName || author.email || 'Unknown User';
        }
        return 'Unknown User';
    };

    const isUpcoming = (eventDate: Date) => {
        return new Date(eventDate) > new Date();
    };

    const canReview = () => {
        const now = new Date();
        const eventDate = new Date(event.eventDate);
        const ratingDeadline = new Date(event.ratingUntil);
        return now > eventDate && now < ratingDeadline && !hasUserReviewed;
    };

    const RatingHistogram = ({
        distribution,
    }: {
        distribution: RatingDistribution;
    }) => {
        if (!distribution) return null;

        const maxCount = Math.max(
            ...Object.values(distribution).map((v) => Number(v))
        );
        const total = Object.values(distribution).reduce(
            (a, b) => Number(a) + Number(b),
            0
        ) as number;

        return (
            <div className="space-y-2">
                {([5, 4, 3, 2, 1] as const).map((rating) => {
                    const count = distribution[rating] || 0;
                    const percentage = total > 0 ? (count / total) * 100 : 0;

                    return (
                        <div key={rating} className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 w-8">
                                {rating}★
                            </span>
                            <div className="flex-1 h-5 bg-gray-200 rounded overflow-hidden">
                                <div
                                    className="h-full bg-yellow-400 transition-all duration-300"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <span className="text-sm text-gray-600 w-12 text-right">
                                {count}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const scrollToReviewForm = () => {
        setTimeout(() => {
            if (reviewFormRef.current) {
                reviewFormRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }
        }, 100);
    };

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

                {/* Event Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <h1 className="text-3xl font-bold text-gray-800">
                            {event.title}
                        </h1>
                        {isUpcoming(event.eventDate) && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded">
                                Upcoming
                            </span>
                        )}
                    </div>

                    {/* Event Information Card */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                        <h4 className="text-lg font-medium mb-4">
                            Event Information
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-gray-600 font-medium">
                                    Date
                                </p>
                                <p>{formatDate(event.eventDate)}</p>
                            </div>
                            <div>
                                <p className="text-gray-600 font-medium">
                                    Time
                                </p>
                                <p>{formatTime(event.eventDate)}</p>
                            </div>
                            <div>
                                <p className="text-gray-600 font-medium">
                                    Location
                                </p>
                                <p>{event.location}</p>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <p className="text-gray-600 font-medium">
                                    Rating Deadline
                                </p>
                                <p>{formatDate(event.ratingUntil)}</p>
                            </div>
                        </div>

                        {event.description && (
                            <div>
                                <p className="text-gray-600 font-medium mb-2">
                                    Description
                                </p>
                                <p className="text-gray-800">
                                    {event.description}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Rating Summary */}
                    {stats && stats.totalReviews > 0 && (
                        <div className="bg-gray-50 rounded-lg p-6 mb-6">
                            <h4 className="text-lg font-medium mb-4">
                                Review Summary
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-gray-600 mb-1">
                                            Overall Rating
                                        </p>
                                        <div className="flex items-center">
                                            <StarRating
                                                rating={Math.round(
                                                    stats.averageOverall
                                                )}
                                            />
                                            <span className="ml-2 text-lg font-semibold">
                                                {stats.averageOverall.toFixed(
                                                    1
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-gray-600 mb-1">
                                            Would Attend Again
                                        </p>
                                        <div className="flex items-center">
                                            <StarRating
                                                rating={Math.round(
                                                    stats.averageWouldRepeat
                                                )}
                                            />
                                            <span className="ml-2 text-lg font-semibold">
                                                {stats.averageWouldRepeat.toFixed(
                                                    1
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-gray-500 mt-3">
                                        Based on {stats.totalReviews} review
                                        {stats.totalReviews !== 1 ? 's' : ''}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-gray-600 mb-3">
                                        Rating Distribution
                                    </p>
                                    <RatingHistogram
                                        distribution={stats.ratingDistribution}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="py-4">
                        <hr className="border-t border-gray-300" />
                    </div>

                    {/* Reviews Section */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            Event Reviews
                        </h2>

                        {reviews.length > 0 ? (
                            reviews.map((review) => (
                                <div
                                    key={String(review._id)}
                                    className="border-b pb-4 bg-white p-4 rounded-lg shadow-sm"
                                >
                                    <div className="flex justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                                <span className="text-sm text-gray-600 mr-2">
                                                    Overall:
                                                </span>
                                                <StarRating
                                                    rating={Math.round(
                                                        review.overall || 0
                                                    )}
                                                />
                                                <span className="ml-2">
                                                    {review.overall}
                                                </span>
                                            </div>
                                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                                <span className="text-sm text-gray-600 mr-2">
                                                    Would Attend Again:
                                                </span>
                                                <StarRating
                                                    rating={Math.round(
                                                        review.wouldRepeat || 0
                                                    )}
                                                />
                                                <span className="ml-2">
                                                    {review.wouldRepeat}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Custom Ratings */}
                                    {review.customRatings &&
                                        review.customRatings.length > 0 && (
                                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-sm font-medium text-gray-700 mb-2">
                                                    Additional Ratings:
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {review.customRatings.map(
                                                        (cr, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center"
                                                            >
                                                                <span className="text-sm text-gray-600 mr-2">
                                                                    {
                                                                        cr.question
                                                                    }
                                                                    :
                                                                </span>
                                                                <StarRating
                                                                    rating={Math.round(
                                                                        cr.rating
                                                                    )}
                                                                />
                                                                <span className="ml-1 text-sm">
                                                                    {cr.rating}
                                                                </span>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    {/* Review Content */}
                                    {review.content && (
                                        <div className="mt-2 mb-2">
                                            <FormattedReviewText
                                                text={review.content}
                                                className="text-gray-800"
                                            />
                                        </div>
                                    )}

                                    {/* Review Metadata */}
                                    <div className="flex flex-wrap gap-4 mt-4">
                                        <p className="text-gray-500 text-sm">
                                            {review.isAnonymous
                                                ? 'Anonymous'
                                                : getAuthorDisplay(
                                                      review.author
                                                  )}
                                        </p>
                                        <p className="text-gray-500 text-sm">
                                            Posted{' '}
                                            {formatDateTime(review.createdAt)}
                                        </p>
                                        {review.updatedAt &&
                                            new Date(review.updatedAt) >
                                                new Date(review.createdAt) && (
                                                <p className="text-gray-500 text-sm">
                                                    Updated{' '}
                                                    {formatDateTime(
                                                        review.updatedAt
                                                    )}
                                                </p>
                                            )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 bg-white rounded-lg shadow-sm">
                                <p className="text-gray-500 text-lg">
                                    No reviews yet for this event.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetailPage;
