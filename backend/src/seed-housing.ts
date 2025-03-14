import mongoose from "mongoose";
import {
    HousingBuildings,
    HousingRooms,
    HousingReviews,
} from "./models/Housing";

// Connect to MongoDB
const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/school-platform";

mongoose
    .connect(MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB");
        const db = mongoose.connection.db;

        if (!db) {
            throw new Error("Database connection is not ready");
        }
    })
    .catch((err) => console.error("MongoDB connection error:", err));

// Mock data for housing buildings
const housingBuildingsData = [
    {
        id: 1,
        name: "Mudd-Blaisdell",
        campus: "south",
        floors: 1,
        description:
            "Mudd-Blaisdell, the largest residence hall on South Campus, houses more than 280 students in singles and one-room doubles. It is situated around a grassy courtyard and is adjacent to tennis courts and a swimming pool.",
    },
    {
        id: 2,
        name: "Oldenborg Center",
        campus: "south",
        floors: 3,
        description:
            "Oldenborg Center is a language residence hall with themed corridors for different language communities. It features a dining hall and cultural programming spaces.",
    },
    {
        id: 3,
        name: "Sontag Hall",
        campus: "north",
        floors: 4,
        description:
            "Sontag Hall is a modern residence hall with suite-style living arrangements, energy-efficient design, and common areas for collaboration and study.",
    },
    {
        id: 4,
        name: "Dialynas Hall",
        campus: "east",
        floors: 4,
        description:
            "Dialynas Hall is a contemporary residence with apartment-style living, featuring spacious common areas and sustainable design elements.",
    },
    {
        id: 5,
        name: "Clark I",
        campus: "north",
        floors: 2,
        description:
            "Clark I offers apartment-style living with suites featuring shared kitchens and living rooms. It provides a quiet environment with easy access to campus resources.",
    },
];

// Function to insert housing buildings and return their IDs
async function insertHousingBuildings() {
    try {
        // Clear existing data
        await HousingBuildings.deleteMany({});

        // Insert new data
        const buildings = await HousingBuildings.insertMany(
            housingBuildingsData
        );
        console.log("Housing buildings inserted successfully");

        // Return the buildings with their MongoDB ObjectIds
        return buildings;
    } catch (error) {
        console.error("Error inserting housing buildings:", error);
        throw error;
    }
}

// Function to insert housing rooms
async function insertHousingRooms(buildings: any) {
    // Clear existing data
    await HousingRooms.deleteMany({});

    // Create a dummy suite ID for reference (since the schema requires it)
    const dummySuiteId = new mongoose.Types.ObjectId();

    const roomsData = [];
    let roomId = 1000;

    // Create rooms for each building
    for (const building of buildings) {
        // Number of rooms per building varies based on building size
        const numRooms = building.floors * 10 + Math.floor(Math.random() * 5);

        for (let i = 0; i < numRooms; i++) {
            // Generate room number based on building ID and room index
            const floorNum = Math.floor(i / 10) + 1;
            const roomNum = (i % 10) + 1;

            // Create a unique room number by using building ID as a prefix
            // For example: Building 1, floor 1, room 1 = 10101
            // Building 2, floor 1, room 1 = 20101
            const roomNumber = parseInt(
                `${building.id}0${floorNum}${roomNum
                    .toString()
                    .padStart(2, "0")}`
            );

            roomsData.push({
                id: roomId++,
                size: 150 + Math.floor(Math.random() * 100), // Random size between 150-250
                occupancy_type: Math.floor(Math.random() * 3), // 0-2
                closet_type: Math.floor(Math.random() * 3), // 0-2
                bathroom_type: Math.floor(Math.random() * 3), // 0-2
                housing_suite_id: dummySuiteId, // Using a dummy ObjectId instead of empty string
                housing_building_id: building.id,
                room_number: roomNumber,
            });
        }
    }

    try {
        const rooms = await HousingRooms.insertMany(roomsData);
        console.log(`${rooms.length} housing rooms inserted successfully`);
        return rooms;
    } catch (error) {
        console.error("Error inserting housing rooms:", error);
        throw error;
    }
}
// Mock user IDs (in a real scenario, these would be actual user IDs from your user database)
const mockUserIds = [
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
];

// Function to insert housing reviews
async function insertHousingReviews(rooms: any) {
    // Clear existing data
    await HousingReviews.deleteMany({});

    const reviewsData = [];
    let reviewId = 1;

    // Create reviews for some of the rooms (not all rooms will have reviews)
    for (const room of rooms) {
        // Only create reviews for about 60% of rooms
        if (Math.random() > 0.4) {
            // Some rooms might have multiple reviews
            const numReviews = Math.floor(Math.random() * 2) + 1;

            for (let i = 0; i < numReviews; i++) {
                const overallRating = Math.floor(Math.random() * 5) + 1; // 1-5 rating

                reviewsData.push({
                    id: reviewId++,
                    overall_rating: overallRating,
                    quiet_rating: Math.floor(Math.random() * 5) + 1,
                    layout_rating: Math.floor(Math.random() * 5) + 1,
                    temperature_rating: Math.floor(Math.random() * 5) + 1,
                    comments: generateRandomComment(overallRating, room),
                    housing_room_id: room.id, // Using room.id instead of room._id
                    user_id:
                        mockUserIds[
                            Math.floor(Math.random() * mockUserIds.length)
                        ],
                });
            }
        }
    }

    const reviews = await HousingReviews.insertMany(reviewsData);
    console.log(`${reviews.length} housing reviews inserted successfully`);
    return reviews;
}

// Helper function to generate random comments for reviews
function generateRandomComment(rating: number, room: any) {
    const positiveComments = [
        "Great room with plenty of natural light. The size is perfect for my needs and the closet space is ample.",
        "I love living here! The location is convenient and the building is well-maintained.",
        "The room exceeded my expectations. It's quiet and the temperature control works well.",
        "Excellent room layout and the bathroom is always clean. Would definitely recommend.",
        "Perfect living space with good amenities. The building staff is responsive to maintenance requests.",
    ];

    const neutralComments = [
        "The room is decent sized but gets a bit hot in the summer. The layout is functional but nothing special.",
        "Living here is okay. The room is adequate but walls are thin so you can hear neighbors sometimes.",
        "Average accommodations. The bathroom could use some updates but everything works fine.",
        "It's a standard room with basic amenities. Nothing to complain about but nothing exceptional either.",
        "The room is fine for a temporary living situation. The closet is small but manageable.",
    ];

    const negativeComments = [
        "The room is smaller than advertised and has poor ventilation. Gets very hot in summer months.",
        "Disappointed with the living conditions. The bathroom fixtures are outdated and often have issues.",
        "Constant noise from neighboring rooms and hallways makes it difficult to study or sleep.",
        "The heating system is unreliable and maintenance requests take weeks to be addressed.",
        "Poor layout and limited storage space. The building needs significant upgrades.",
    ];

    const detailedComments = [
        "Living in this room was a mixed experience. The common areas were spacious and included basic amenities like a small kitchen area. The room itself had decent closet space but temperature control was an issue.\n\nDuring the fall semester, the room stayed relatively cool even without air conditioning. However, as winter approached, it became very cold before the heating system was activated. The common areas were consistently 5-10 degrees warmer than the bedrooms.\n\nThe location within the building placed me near first-year student halls, which created an interesting social dynamic but occasionally meant dealing with more noise than I would have preferred.",
        "I spent two semesters in this room and found it to be comfortable overall. The size was adequate for my needs, though storage options were somewhat limited. The bathroom facilities were clean and well-maintained throughout my stay.\n\nThe building's location provided easy access to dining halls and academic buildings. One downside was the inconsistent heating/cooling system - the room would often be too warm in winter and too cool in early fall.\n\nThe walls were reasonably soundproof, though weekend nights could get noisy depending on neighboring residents. The natural lighting was excellent, with large windows that provided a pleasant atmosphere during daytime hours.",
    ];

    let comments;
    if (rating >= 4) {
        comments = positiveComments;
    } else if (rating >= 3) {
        comments = neutralComments;
    } else {
        comments = negativeComments;
    }

    // 15% chance of getting a detailed comment
    if (Math.random() < 0.15) {
        return detailedComments[
            Math.floor(Math.random() * detailedComments.length)
        ];
    }

    return comments[Math.floor(Math.random() * comments.length)];
}

// Main function to run the data insertion
async function insertAllData() {
    try {
        const buildings = await insertHousingBuildings();
        const rooms = await insertHousingRooms(buildings);
        const reviews = await insertHousingReviews(rooms);

        console.log("All mock data inserted successfully!");

        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    } catch (error) {
        console.error("Error inserting mock data:", error);
        await mongoose.disconnect();
    }
}

// Run the insertion script
insertAllData();
