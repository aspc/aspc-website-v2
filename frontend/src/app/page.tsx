'use client';
import Image from 'next/image';

export default function HomePage() {

  return (
    <div className="min-h-screen bg-white">
      <div className="relative bg-blue-800 text-white py-16 h-72">
        <div className="absolute inset-0 z-0">
          <Image
            src="/scc.webp"
            alt="Smith Campus Center"
            fill
            className="object-cover"
            priority
            quality={100}
          />
          <div className="absolute inset-0 bg-blue-800/70" />
        </div>

        <div className="container mx-auto pt-10 px-4 relative z-10">
          <h1 className="text-4xl text-center">
            Associated Student of Pomona College
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          <section>
            <h2 className="text-2xl font-bold mb-6">Upcoming Events</h2>
            <div className="bg-white rounded-lg shadow p-6">
      

              <div className="mt-4 space-x-4">
                <button className="text-blue-500 hover:underline">See more events</button>
                <button className="text-blue-500 hover:underline">Submit an event</button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6">Latest From ASPC</h2>
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-medium mb-2">Spring 2024 Funding Request Forms</h3>
                <p className="text-gray-600 text-sm">Request funds allocated for conferences, alcohol, and club events from ASPC.</p>
                <button className="text-blue-500 hover:underline mt-2">Click Here</button>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-medium mb-2">COVID-19 Isolation FAQ</h3>
                <p className="text-gray-600 text-sm">Your COVID isolation questions answered.</p>
                <button className="text-blue-500 hover:underline mt-2">Click Here</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


