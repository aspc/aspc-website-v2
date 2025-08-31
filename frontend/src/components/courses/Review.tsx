'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import { Instructor, CourseReviewFormProps } from '@/types';

export const ReviewForm: React.FC<CourseReviewFormProps> = ({
    review,
    courseId,
    instructorId,
}) => {
    // Determine if we're coming from an instructor page
    const isFromInstructor = instructorId !== undefined;

    const [ratings, setRatings] = useState({
        overall: 0,
        challenge: 0,
        inclusivity: 0,
    });

    const [workPerWeek, setWorkPerWeek] = useState<string>('');
    const [selectedInstructorId, setSelectedInstructorId] = useState<
        number | undefined
    >(undefined);
    const [courseInstructors, setCourseInstructors] = useState<
        Instructor[] | null
    >(null);
    const [courses, setCourses] = useState<Array<{
        courseId: number;
        courseCode: string;
        courseName: string;
    }> | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<
        number | undefined
    >(undefined);

    const [hoveredStar, setHoveredStar] = useState<{
        overall: number;
        challenge: number;
        inclusivity: number;
    }>({ overall: 0, challenge: 0, inclusivity: 0 });

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
        'text-xl text-gray-300 cursor-pointer transition-colors duration-300';

    const [comments, setComments] = useState<string>('');
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (review) {
            setRatings({
                overall: review.overall_rating || 0,
                challenge: review.challenge_rating || 0,
                inclusivity: review.inclusivity_rating || 0,
            });

            if (review.work_per_week) {
                setWorkPerWeek(review.work_per_week.toString());
            } else {
                setWorkPerWeek('');
            }

            if (isFromInstructor) {
                setSelectedCourseId(review.course_id);
                setSelectedInstructorId(instructorId);
            } else {
                setSelectedCourseId(courseId);
                setSelectedInstructorId(review.instructor_id);
            }

            setComments(review.comments || '');
        } else {
            // For new reviews, set default selections based on the entry point
            if (isFromInstructor) {
                setSelectedInstructorId(instructorId);
            } else if (courseId !== undefined) {
                setSelectedCourseId(courseId);
            }
        }

        // Get data based on whether we're coming from an instructor page or course page
        const fetchData = async () => {
            try {
                if (isFromInstructor && instructorId !== undefined) {
                    // Fetch instructor's courses
                    const response = await fetch(
                        `${process.env.BACKEND_LINK}/api/instructors/${instructorId}/courses`,
                        {
                            credentials: 'include',
                        }
                    );

                    if (!response.ok) {
                        throw new Error('Error fetching instructor courses');
                    }

                    const coursesData = await response.json();
                    setCourses(coursesData);
                } else if (courseId !== undefined) {
                    // Fetch course instructors
                    const response = await fetch(
                        `${process.env.BACKEND_LINK}/api/courses/${courseId}/instructors`,
                        {
                            credentials: 'include',
                        }
                    );

                    if (!response.ok) {
                        throw new Error('Error fetching course instructors');
                    }

                    const instructors: Instructor[] = await response.json();
                    setCourseInstructors(instructors);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [review, courseId, instructorId, isFromInstructor]);

    const handleCommentsChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
        setComments(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const errors: { [key: string]: string } = {};

        // Check if all ratings are selected
        if (ratings.overall === 0)
            errors.overall = 'Please select an overall rating.';
        if (ratings.challenge === 0)
            errors.challenge = 'Please select a challenge rating.';
        if (ratings.inclusivity === 0)
            errors.inclusivity = 'Please select an inclusivity rating.';

        if (!workPerWeek)
            errors.workPerWeek =
                'Please input the average number of hours of work per week.';

        // Check relationship selection
        if (isFromInstructor && selectedCourseId === undefined)
            errors.course = 'Please select a course for this instructor.';
        else if (!isFromInstructor && selectedInstructorId === undefined)
            errors.instructor = 'Please select an instructor for this course.';

        // Check if comments are provided
        if (!comments.trim()) errors.comments = 'Please leave a comment.';

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        try {
            // Get current user's email
            const userResponse = await fetch(
                `${process.env.BACKEND_LINK}/api/auth/current_user`,
                {
                    credentials: 'include',
                }
            );

            if (!userResponse.ok) {
                throw new Error('Error getting current user');
            }

            const user = await userResponse.json();

            // Construct review payload
            const reviewPayload = {
                overall: ratings.overall,
                challenge: ratings.challenge,
                inclusivity: ratings.inclusivity,
                workPerWeek: parseInt(workPerWeek, 10),
                comments: comments,
                email: user.user.email,
                courseId: isFromInstructor ? selectedCourseId : courseId,
                instructorId: isFromInstructor
                    ? instructorId
                    : selectedInstructorId,
            };

            // Determine correct endpoint
            let url;
            if (review) {
                url = `${process.env.BACKEND_LINK}/api/courses/reviews/${review.id}`;
            } else {
                // Always use the course review endpoint
                const reviewCourseId = isFromInstructor
                    ? selectedCourseId
                    : courseId;
                url = `${process.env.BACKEND_LINK}/api/courses/${reviewCourseId}/reviews`;
            }

            const method = review ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reviewPayload),
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Error submitting review');
            }

            alert('Review submitted successfully!');
            window.location.reload();
        } catch (error) {
            alert('Error submitting review');
            console.error(error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-bold mb-4">
                {review ? 'Edit Review' : 'Course Review'}
            </h2>

            {/* Overall Rating */}
            <div className="rating">
                <label>Overall: </label>
                <div>
                    {[1, 2, 3, 4, 5].map((value) => (
                        <span
                            key={value}
                            onClick={() => handleStarClick('overall', value)}
                            onMouseEnter={() =>
                                handleStarHover('overall', value)
                            }
                            onMouseLeave={() => handleStarHoverOut('overall')}
                            className={`${baseStarClass} ${
                                ratings.overall >= value ||
                                hoveredStar.overall >= value
                                    ? 'text-yellow-500'
                                    : ''
                            }`}
                        >
                            &#9733;
                        </span>
                    ))}
                </div>
                {formErrors.overall && (
                    <p className="text-red-500">{formErrors.overall}</p>
                )}
            </div>

            {/* Challenge Rating */}
            <div className="rating">
                <label>Challenge: </label>
                <div>
                    {[1, 2, 3, 4, 5].map((value) => (
                        <span
                            key={value}
                            onClick={() => handleStarClick('challenge', value)}
                            onMouseEnter={() =>
                                handleStarHover('challenge', value)
                            }
                            onMouseLeave={() => handleStarHoverOut('challenge')}
                            className={`${baseStarClass} ${
                                ratings.challenge >= value ||
                                hoveredStar.challenge >= value
                                    ? 'text-yellow-500'
                                    : ''
                            }`}
                        >
                            &#9733;
                        </span>
                    ))}
                </div>
                {formErrors.challenge && (
                    <p className="text-red-500">{formErrors.challenge}</p>
                )}
            </div>

            {/* Inclusivity Rating */}
            <div className="rating">
                <label>Inclusivity: </label>
                <div>
                    {[1, 2, 3, 4, 5].map((value) => (
                        <span
                            key={value}
                            onClick={() =>
                                handleStarClick('inclusivity', value)
                            }
                            onMouseEnter={() =>
                                handleStarHover('inclusivity', value)
                            }
                            onMouseLeave={() =>
                                handleStarHoverOut('inclusivity')
                            }
                            className={`${baseStarClass} ${
                                ratings.inclusivity >= value ||
                                hoveredStar.inclusivity >= value
                                    ? 'text-yellow-500'
                                    : ''
                            }`}
                        >
                            &#9733;
                        </span>
                    ))}
                </div>
                {formErrors.inclusivity && (
                    <p className="text-red-500">{formErrors.inclusivity}</p>
                )}
            </div>

            {/* WORK PER WEEK */}
            <div>
                <label>Work per week: </label>
                <div>
                    <select
                        className="w-auto p-2 border rounded mb-4"
                        value={workPerWeek}
                        onChange={(e) => setWorkPerWeek(e.target.value)}
                    >
                        <option value="">
                            Select the average hours per week
                        </option>
                        {[...Array(20)].map((_, index) => {
                            const value = index + 1;
                            return (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            );
                        })}
                    </select>
                </div>
                {formErrors.workPerWeek && (
                    <p className="text-red-500">{formErrors.workPerWeek}</p>
                )}
            </div>

            {/* Course selection - when coming from instructor page */}
            {isFromInstructor && (
                <div>
                    <label>Course: </label>
                    <div>
                        <select
                            className="w-auto p-2 border rounded mb-4"
                            value={selectedCourseId}
                            onChange={(e) =>
                                setSelectedCourseId(
                                    parseInt(e.target.value, 10)
                                )
                            }
                        >
                            <option value="">
                                Select the course you took with this instructor
                            </option>
                            {courses &&
                                courses.map((course) => (
                                    <option
                                        key={course.courseId}
                                        value={course.courseId}
                                    >
                                        {course.courseCode}: {course.courseName}
                                    </option>
                                ))}
                        </select>
                    </div>
                    {formErrors.course && (
                        <p className="text-red-500">{formErrors.course}</p>
                    )}
                    <p className="pb-2">
                        If you don&apos;t see a course that should be here,
                        email product@aspc.pomona.edu so we can add it!
                    </p>
                </div>
            )}

            {/* Instructor selection - when coming from course page */}
            {!isFromInstructor && (
                <div>
                    <label>Instructor: </label>
                    <div>
                        <select
                            className="w-auto p-2 border rounded mb-4"
                            value={selectedInstructorId}
                            onChange={(e) =>
                                setSelectedInstructorId(
                                    parseInt(e.target.value, 10)
                                )
                            }
                        >
                            <option value="">
                                Select the instructor for this course
                            </option>
                            {courseInstructors &&
                                courseInstructors.map((instructor) => (
                                    <option
                                        key={instructor.id}
                                        value={instructor.id}
                                    >
                                        {instructor.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                    {formErrors.instructor && (
                        <p className="text-red-500">{formErrors.instructor}</p>
                    )}
                    <p className="pb-2">
                        If you don&apos;t see a professor that should be here,
                        email product@aspc.pomona.edu so we can add them!
                    </p>
                </div>
            )}

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
                    <p className="text-red-500">{formErrors.comments}</p>
                )}
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
