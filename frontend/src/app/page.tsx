'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (imageLoaded) {
      setIsLoading(false);
    }
  }, [imageLoaded]);

  return (
    <div className="min-h-screen bg-white font-[Lora]">
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}
      <div className="relative h-screen flex items-center justify-center text-center text-white">
          <Image
            src="/sccSunset.jpg"
            alt="Smith Campus Center"
            fill
            className="object-cover"
            priority
            quality={100}
            onLoadingComplete={() => {
              setImageLoaded(true);
              setTimeout(() => setShowFilter(true), 100); // Delay filter slightly for smooth transition
            }}
          />
          <div className="absolute inset-0 bg-orange-500/30 mix-blend-multiply" />

        <div className="relative z-10 px-6">
          <h1 className="text-6xl font-extrabold tracking-wider leading-snug font-[Playfair Display]">
            Associated Students <br /> of Pomona College
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          <section>
            <h2 className="text-2xl font-bold mb-6">Upcoming Events</h2>
            <div className="bg-white rounded-lg shadow p-6">
      

              <div className="mt-4 space-x-4">
                <Link href='/events' className="text-blue-500 hover:underline">See more events</Link>
                <Link href='https://pomona.campuslabs.com/engage/' className="text-blue-500 hover:underline">Submit an event</Link>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6">Latest From ASPC</h2>
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-medium mb-2">Spring 2025 Funding Request Forms</h3>
                <p className="text-gray-600 text-sm">Request funds allocated for conferences, alcohol, and club events from ASPC.</p>
                <button className="text-blue-500 hover:underline mt-2">Click Here</button>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-medium mb-2">The Chirp Guide: ASPC Resource Guide</h3>
                <p className="text-gray-600 text-sm">All your questions about ASPC answered here</p>
                <Link href="https://docs.google.com/document/d/1usryOaKsIwZ6kABFcaYK5ub0TJSku4WBuoKj70OpNw4/edit?tab=t.0" className="text-blue-500 hover:underline mt-2" target="_blank">
                  Click Here
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


