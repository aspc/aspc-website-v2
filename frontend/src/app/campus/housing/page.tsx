export const runtime = 'nodejs';

import { MongoClient } from 'mongodb';
import Link from 'next/link';
import Image from 'next/image';

// Define types for MongoDB docs and UI data structure
type BuildingDoc = {
    id: number;
    name: string;
    campus: string;
    description: string;
    floors: number;
};

type BuildingCard = {
    id: number;
    name: string;
    image: string;
    description: string;
    floors: number;
};

type CampusGroup = {
    campus: string;
    buildings: BuildingCard[];
};

const HousingPage = async () => {
    const client = await MongoClient.connect(
        process.env.MONGODB_URI! || 'mongodb://localhost:27017/school-platform'
    );
    const db = client.db('school-platform');
    const buildings = await db
        .collection<BuildingDoc>('housingbuildings')
        .find()
        .toArray();
    client.close();

    // Organize buildings by campus
    const housingData: CampusGroup[] = buildings.reduce((acc, building) => {
        const campusName =
            building.campus.charAt(0).toUpperCase() +
            building.campus.slice(1) +
            ' Campus';

        const buildingCard: BuildingCard = {
            id: building.id,
            name: building.name,
            image: `/buildings/${building.name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')}.jpg`,
            description: building.description,
            floors: building.floors,
        };

        const existingCampus = acc.find((c) => c.campus === campusName);
        if (existingCampus) {
            existingCampus.buildings.push(buildingCard);
        } else {
            acc.push({
                campus: campusName,
                buildings: [buildingCard],
            });
        }

        return acc;
    }, [] as CampusGroup[]);

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            <div className="container mx-auto p-6">
                {housingData.map((campus, index) => (
                    <section key={index} className="mb-12">
                        <h2 className="text-3xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-200 pb-2">
                            {campus.campus}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {campus.buildings.map((building) => (
                                <Link
                                    key={building.id}
                                    href={`/campus/housing/${building.id}`}
                                    className="block bg-white shadow-lg rounded-lg overflow-hidden transform transition-transform duration-300 hover:scale-105"
                                >
                                    <Image
                                        src={building.image}
                                        alt={building.name}
                                        width={800}
                                        height={400}
                                        className="w-full h-48 object-cover"
                                    />
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                                            {building.name}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {building.description?.slice(
                                                0,
                                                100
                                            )}
                                            ...
                                        </p>
                                        <span className="mt-4 inline-block text-blue-600 hover:underline">
                                            View Details →
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default HousingPage;
