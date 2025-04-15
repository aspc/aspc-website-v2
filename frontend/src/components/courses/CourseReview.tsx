"use client";
import React from "react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Instructor, CourseReviewFormProps } from "@/types";
// import Image from "next/image";

export const CourseReviewForm: React.FC<CourseReviewFormProps> = ({
  review,
  courseId,
}) => {
  const params = useParams();

  const [ratings, setRatings] = useState({
    overall: 0,
    challenge: 0,
    inclusivity: 0,
  });

  const [workPerWeek, setWorkPerWeek] = useState<string>("");
  const [instructorId, setInstructorId] = useState<string>("");
  const [courseInstructors, setCourseInstructors] = useState<
    Instructor[] | null
  >(null);

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
    "text-xl text-gray-300 cursor-pointer transition-colors duration-300";

  const [comments, setComments] = useState<string>("");

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
        setWorkPerWeek("");
      }

      setInstructorId(review.instructor_id.toString() || "");
      setComments(review.comments || "");
    }
    // Get all instructors for course
    const fetchInstructors = async () => {
      const response = await fetch(
        `${process.env.BACKEND_LINK}/api/courses/${courseId}/instructors`
      );

      console.log("here");

      if (!response.ok) {
        throw new Error("Error fetching course instructors");
      }

      const instructors: Instructor[] = await response.json();
      console.log(instructors);
      setCourseInstructors(instructors);
    };

    fetchInstructors();
  }, [review, courseId]);

  const handleCommentsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComments(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { [key: string]: string } = {};

    // Check if all ratings are selected
    if (ratings.overall === 0)
      errors.overall = "Please select an overall rating.";
    if (ratings.challenge === 0)
      errors.challenge = "Please select a challenge rating.";
    if (ratings.inclusivity === 0)
      errors.inclusivity = "Please select an inclusivity rating.";
    if (workPerWeek === null)
      errors.workPerWeek =
        "Please input the average number of hours of work per week for this course.";
    // TODO: handle the case the the instructor was not listed
    // if (instructorId === null)
    //   errors.instructor = "Please select your instructor for this course.";
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
      const reviewPayload = {
        overall: ratings.overall,
        challenge: ratings.challenge,
        inclusivity: ratings.inclusivity,
        workPerWeek: workPerWeek,
        comments: comments,
        email: user.user.email,
        ...(instructorId && { instructorId }), // TODO: handle case that instructor is not listed
      };

      const url = review
        ? `${process.env.BACKEND_LINK}/api/courses/reviews/${review.id}`
        : `${process.env.BACKEND_LINK}/api/courses/${courseId}/reviews`;

      const method = review ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reviewPayload),
      });

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
              onMouseEnter={() => handleStarHover("overall", value)}
              onMouseLeave={() => handleStarHoverOut("overall")}
              className={`${baseStarClass} ${
                ratings.overall >= value || hoveredStar.overall >= value
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

      {/* Challenge Rating */}
      <div className="rating">
        <label>Challenge: </label>
        <div>
          {[1, 2, 3, 4, 5].map((value) => (
            <span
              key={value}
              onClick={() => handleStarClick("challenge", value)}
              onMouseEnter={() => handleStarHover("challenge", value)}
              onMouseLeave={() => handleStarHoverOut("challenge")}
              className={`${baseStarClass} ${
                ratings.challenge >= value || hoveredStar.challenge >= value
                  ? "text-yellow-500"
                  : ""
              }`}
            >
              &#9733;
            </span>
          ))}
        </div>
        {formErrors.challenge && (
          <p style={{ color: "red" }}>{formErrors.challenge}</p>
        )}
      </div>

      {/* Inclusivity Rating */}
      <div className="rating">
        <label>Inclusivity: </label>
        <div>
          {[1, 2, 3, 4, 5].map((value) => (
            <span
              key={value}
              onClick={() => handleStarClick("inclusivity", value)}
              onMouseEnter={() => handleStarHover("inclusivity", value)}
              onMouseLeave={() => handleStarHoverOut("inclusivity")}
              className={`${baseStarClass} ${
                ratings.inclusivity >= value || hoveredStar.inclusivity >= value
                  ? "text-yellow-500"
                  : ""
              }`}
            >
              &#9733;
            </span>
          ))}
        </div>
        {formErrors.inclusivity && (
          <p style={{ color: "red" }}>{formErrors.inclusivity}</p>
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
              Select the average hours per week for this course
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
      </div>

      {/* Instructor id */}
      <div>
        <label>Instructor: </label>
        <div>
          <select
            className="w-auto p-2 border rounded mb-4"
            value={instructorId}
            onChange={(e) => setInstructorId(e.target.value)}
          >
            <option value="">Select the instructor for this course</option>
            {courseInstructors &&
              courseInstructors.map((instructor, index) => {
                return (
                  <option key={instructor.name} value={instructor.id}>
                    {instructor.name}
                  </option>
                );
              })}
          </select>
        </div>
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
