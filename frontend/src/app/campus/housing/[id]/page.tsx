export const runtime = "nodejs";

import { MongoClient } from "mongodb";
import { notFound } from "next/navigation";
import Image from "next/image";

async function getBuildingById(id: string) {
  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI!);
    const db = client.db("school-platform");
    const building = await db
      .collection("housingbuildings") 
      .findOne({ id: parseInt(id) });
    
    client.close();
    return building;
  } catch (error) {
    console.error("Error fetching building:", error);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const BuildingPage = async ({ params }) => {
  const building = await getBuildingById(params.id);
  
  if (!building) return notFound();
  const safeName = building.name.toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-");

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-4">{building.name}</h1>
      <Image
        src={`/buildings/${safeName}.jpg`}
        width={800}
        height={400}
        alt={building.name}
        className="w-full max-h-[500px] object-cover mb-6 rounded-lg"
      />
      <p className="text-lg text-gray-700 mb-4">{building.description}</p>
  
      {/* Floor Plans */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Floor Plans</h2>
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,_minmax(400px,_1fr))]">                
          {Array.from({ length: building.floors }).map((_, i) => (
            <Image
              key={i}
              src={`/floorplans/${safeName}-floor${i + 1}.jpg`}
              width={800}
              height={400}
              alt={`Floor plan ${i + 1}`}
              className="w-full rounded-lg border border-gray-200 shadow"
            />
          ))}
        </div>
      </div>
      {/* Room Reviews */}
      <div className="mt-6">
        <a href="#" className="text-blue-600 hover:underline">
          View Room Reviews
        </a>
      </div>
    </div>
  );
};

export default BuildingPage;