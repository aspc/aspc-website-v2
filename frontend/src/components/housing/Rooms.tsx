"use client";
import React from "react";
import Link from "next/link";
import { RoomCardProps } from "@/types";

export const StarRating = ({ rating }: { rating: number }) => {
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

export const getRoomOccupancyType = (occupancy_type: number | undefined) => {
  if (occupancy_type) {
    switch (occupancy_type) {
      case 1:
        return "Single";
      case 2:
        return "Double";
      case 3:
        return "Triple";
      default:
        return occupancy_type;
    }
  } else {
    return "Unknown";
  }
};

export const RoomCard = ({ buildingName, room }: RoomCardProps) => {
  return (
    <div className="w-full border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Room {room.room_number}
        </h2>
        <p className="text-sm text-gray-500">{buildingName}</p>
      </div>

      <div className="flex items-center mb-4">
        <span className="text-gray-600 mr-2">Rating:</span>
        {room.reviewCount && room.reviewCount > 0 ? (
          <div className="flex items-center">
            <StarRating rating={room.averageRating || 0} />
            <span className="ml-2 text-gray-500">({room.reviewCount})</span>
          </div>
        ) : (
          <span className="text-gray-500">No ratings yet</span>
        )}
      </div>

      <div className="mb-6">
        <p className="text-lg text-gray-700">
          {getRoomOccupancyType(room.occupancy_type)}
        </p>
        {room.size && (
          <p className="text-lg text-gray-700">Size: {room.size} sq. ft.</p>
        )}
      </div>

      <Link
        href={`/campus/housing/${room.housing_building_id}/${room.room_number}`}
      >
        <button className="px-6 py-2 border border-blue-300 text-blue-500 rounded-md hover:bg-blue-50 transition-colors">
          View Reviews
        </button>
      </Link>
    </div>
  );
};
