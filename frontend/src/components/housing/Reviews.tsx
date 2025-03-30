"use client";
import React from "react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ReviewFormProps } from "@/types";
import Image from "next/image";

export const ReviewForm: React.FC<ReviewFormProps> = ({ review }) => {
  const params = useParams();
  const { id, room } = params;

  const [ratings, setRatings] = useState({
    overall: review?.overall_rating || 0,
    quiet: review?.quiet_rating || 0,
    layout: review?.layout_rating || 0,
    temperature: review?.temperature_rating || 0,
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

  const [comments, setComments] = useState<string>("");
  const [pictures, setPictures] = useState<FileList | null>(null);
  const [pictureURLs, setPictureURLs] = useState<string[] | null>(null);

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (review) {
      setComments(review.comments || "");
      const urlList: string[] = [];

      if (review.pictures) {
        for (const picture of review.pictures) {
          urlList.push(
            `${process.env.BACKEND_LINK}/api/campus/housing/review_pictures/${picture}`
          );
        }
      }
      setPictureURLs(urlList);
    }
  }, [review]);

  const handleCommentsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComments(e.target.value);
  };

  const handlePicturesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPictures(e.target.files);

    const urlList: string[] = [];
    if (e.target.files) {
      for (const file of e.target.files) {
        urlList.push(URL.createObjectURL(file));
      }
    }
    setPictureURLs(urlList);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { [key: string]: string } = {};

    // Check if all ratings are selected
    if (ratings.overall === 0)
      errors.overall = "Please select an overall rating.";
    if (ratings.quiet === 0) errors.quiet = "Please select a quiet rating.";
    if (ratings.layout === 0) errors.layout = "Please select a layout rating.";
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

      const url = review
        ? `${process.env.BACKEND_LINK}/api/campus/housing/reviews/${review.id}`
        : `${process.env.BACKEND_LINK}/api/campus/housing/${id}/${room}/reviews`;

      const method = review ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        body: formData,
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
                ratings.quiet >= value || hoveredStar.quiet >= value
                  ? "text-yellow-500"
                  : ""
              }`}
            >
              &#9733;
            </span>
          ))}
        </div>
        {formErrors.quiet && <p style={{ color: "red" }}>{formErrors.quiet}</p>}
      </div>

      {/* Layout Rating */}
      <div className="rating">
        <label>Layout: </label>
        <div>
          {[1, 2, 3, 4, 5].map((value) => (
            <span
              key={value}
              onClick={() => handleStarClick("layout", value)}
              onMouseEnter={() => handleStarHover("layout", value)}
              onMouseLeave={() => handleStarHoverOut("layout")}
              className={`${baseStarClass} ${
                ratings.layout >= value || hoveredStar.layout >= value
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
              onClick={() => handleStarClick("temperature", value)}
              onMouseEnter={() => handleStarHover("temperature", value)}
              onMouseLeave={() => handleStarHoverOut("temperature")}
              className={`${baseStarClass} ${
                ratings.temperature >= value || hoveredStar.temperature >= value
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

        <div className="flex">
          {pictureURLs &&
            pictureURLs.length > 0 &&
            pictureURLs.map((pictureURL, index) => (
              <div key={index} className="picture-item">
                <Image
                  src={pictureURL}
                  alt={`Review image ${index + 1}`}
                  width={200}
                  height={200}
                  className="object-cover"
                  style={{
                    height: "200px",
                    objectFit: "cover",
                  }}
                />
              </div>
            ))}
        </div>
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

export const PictureModal = ({
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
          width={800}
          height={800}
          alt="Review picture"
          className="object-contain"
        />
      </div>
    </div>
  );
};
