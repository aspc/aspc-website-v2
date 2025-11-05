'use client';
import { useState, useEffect } from 'react';
import { EventReview, ForumEvent } from '@/types';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    review: EventReview | null;
    onSubmitSuccess: () => void;
}

interface StarRatingInputProps {
    rating: number;
    onRatingChange: (rating: number) => void;
    label: string;
}

const StarRatingInput = ({
    rating,
    onRatingChange,
    label,
}: StarRatingInputProps) => {
    const [hoveredStar, setHoveredStar] = useState(0);

    const handleStarClick = (value: number) => {
        onRatingChange(value);
    };

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>
            <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => handleStarClick(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="text-3xl transition-colors"
                    >
                        {star <= (hoveredStar || rating) ? (
                            <span className="text-yellow-500">★</span>
                        ) : (
                            <span className="text-gray-300">★</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const ReviewModal = ({
    isOpen,
    onClose,
    eventId,
    review,
    onSubmitSuccess,
}: ReviewModalProps) => {
    const [eventDetails, setEventDetails] = useState<ForumEvent | null>(null);
    const [overallRating, setOverallRating] = useState(0);
    const [wouldRepeat, setWouldRepeat] = useState(0);
    const [customRatings, setCustomRatings] = useState<{
        [key: string]: number;
    }>({});
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchEventDetails();

            // If editing existing review, populate the form
            if (review) {
                setOverallRating(review.overall || 0);
                setWouldRepeat(review.wouldRepeat || 0);
                setIsAnonymous(review.isAnonymous || false);
                setContent(review.content || '');
                if (review.customRatings) {
                    const customRatingsObj: { [key: string]: number } = {};
                    review.customRatings.forEach((cr) => {
                        customRatingsObj[cr.question] = cr.rating;
                    });
                    setCustomRatings(customRatingsObj);
                }
            } else {
                // Reset form for new review
                setOverallRating(0);
                setWouldRepeat(0);
                setIsAnonymous(false);
                setContent('');
                setCustomRatings({});
            }
        }
    }, [isOpen, eventId, review]);

    const fetchEventDetails = async () => {
        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/openforum/${eventId}`,
                {
                    method: 'GET',
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch event details');
            }

            const eventData: ForumEvent = await response.json();
            setEventDetails(eventData);

            // Initialize custom ratings for each question
            if (
                eventData.customQuestions &&
                eventData.customQuestions.length > 0
            ) {
                const initialCustomRatings: { [key: string]: number } = {};
                eventData.customQuestions.forEach((question) => {
                    if (!review || !review.customRatings) {
                        initialCustomRatings[question] = 0;
                    }
                });
                if (!review || !review.customRatings) {
                    setCustomRatings(initialCustomRatings);
                }
            }
        } catch (error) {
            console.error('Error fetching event details:', error);
        }
    };

    const handleCustomRatingChange = (question: string, rating: number) => {
        setCustomRatings((prev) => ({
            ...prev,
            [question]: rating,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if rating period is still valid
        if (eventDetails) {
            const now = new Date();
            const ratingUntil = new Date(eventDetails.ratingUntil);
            if (ratingUntil < now) {
                alert(
                    'Rating period has expired. You can no longer submit reviews for this event.'
                );
                return;
            }
        }

        // Validate required ratings
        if (overallRating === 0) {
            alert('Please provide an overall rating');
            return;
        }

        if (wouldRepeat === 0) {
            alert('Please indicate if you would repeat this event');
            return;
        }

        // Validate custom ratings
        const hasInvalidCustomRating = eventDetails?.customQuestions?.some(
            (question) => {
                const rating = customRatings[question];
                return !rating || rating === 0;
            }
        );

        if (hasInvalidCustomRating) {
            alert('Please rate all custom questions');
            return;
        }

        setSubmitting(true);

        try {
            const customRatingsArray =
                eventDetails?.customQuestions?.map((question) => ({
                    question,
                    rating: customRatings[question] || 0,
                })) || [];

            const body = {
                isAnonymous: isAnonymous,
                content: content,
                overall: overallRating,
                wouldRepeat,
                customRatings: customRatingsArray,
            };

            let response;
            if (review) {
                // Editing existing review - use PUT
                response = await fetch(
                    `${process.env.BACKEND_LINK}/api/openforum/${review._id}/review`,
                    {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify(body),
                    }
                );
            } else {
                // Creating new review - use POST
                response = await fetch(
                    `${process.env.BACKEND_LINK}/api/openforum/${eventId}/review`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify(body),
                    }
                );
            }

            if (!response.ok) {
                const error = await response.json();
                alert('Error: ' + error.message);
                return;
            } else {
                alert(
                    review
                        ? 'Review updated successfully!'
                        : 'Review submitted successfully!'
                );
                onSubmitSuccess();
            }
        } catch (error) {
            console.error('Error submitting review:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {review ? 'Edit Rating' : 'Submit Rating'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <StarRatingInput
                            rating={overallRating}
                            onRatingChange={setOverallRating}
                            label="Overall Rating *"
                        />

                        <StarRatingInput
                            rating={wouldRepeat}
                            onRatingChange={setWouldRepeat}
                            label="Would you repeat this event? *"
                        />

                        {eventDetails?.customQuestions &&
                            eventDetails.customQuestions.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-700">
                                        Additional Questions
                                    </h3>
                                    {eventDetails.customQuestions.map(
                                        (question, index) => (
                                            <StarRatingInput
                                                key={index}
                                                rating={
                                                    customRatings[question] || 0
                                                }
                                                onRatingChange={(rating) =>
                                                    handleCustomRatingChange(
                                                        question,
                                                        rating
                                                    )
                                                }
                                                label={question}
                                            />
                                        )
                                    )}
                                </div>
                            )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Review Content
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={5}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Share your thoughts about this event..."
                            />
                        </div>

                        <div className="mb-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={isAnonymous}
                                    onChange={(e) =>
                                        setIsAnonymous(e.target.checked)
                                    }
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    Post anonymously
                                </span>
                            </label>
                            <p className="mt-1 text-xs text-gray-500">
                                Your name will not be displayed if you choose to
                                post anonymously
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {submitting
                                ? 'Submitting...'
                                : review
                                  ? 'Update Rating'
                                  : 'Submit Rating'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
