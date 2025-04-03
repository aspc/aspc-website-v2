'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useState } from 'react';
import { Event } from '@/types';
import HomepageEvents from '@/components/ui/HomepageEvents';
import Loading from "@/components/Loading";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from 'next/navigation';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Check for login required parameter
    if (searchParams.get('loginRequired') === 'true') {
      setShowLoginAlert(true);
      
      // Remove the query parameter from the URL without refreshing the page
      // This ensures the parameter can trigger the alert again on future redirects
      const url = new URL(window.location.href);
      url.searchParams.delete('loginRequired');
      window.history.replaceState({}, '', url);
      
      // Auto-hide the alert after 5 seconds
      const timer = setTimeout(() => {
        setShowLoginAlert(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${process.env.BACKEND_LINK}/api/events/day`);
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
    setEvents((prevEvents) => 
      [...prevEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    );
  }, []);

  if (authLoading) {
    return <Loading />
  }
  return (
    <div className="min-h-screen bg-white font-[Lora]">
      {loading && <Loading />}

       {/* Login Alert with X button */}
       {showLoginAlert && (
        <div className="fixed top-20 left-0 right-0 z-50 mx-auto max-w-md p-4 bg-red-100 border border-red-400 text-red-700 rounded-md shadow-md flex items-center justify-between">
          <p className='text-center'>You need to be logged in to access any pages on ASPC.</p>
            <button 
              className="text-gray-700 hover:text-red-500 font-bold"
              onClick={() => setShowLoginAlert(false)}
              aria-label="Close alert"
            >
              ✕
            </button>
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
              setTimeout(() => setLoading(false), 400); 
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
          <h2 className="text-2xl font-bold mb-6">Today&apos;s Events</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <HomepageEvents events={events} />

              <div className=" space-x-4 border-t-2 border-gray-200 pt-4">
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
                  <Link href="https://nam10.safelinks.protection.outlook.com/?url=https%3A%2F%2Fpomona.campuslabs.com%2Fengage%2Fsubmitter%2Fform%2Fstart%2F653080&data=05%7C02%7Cljbq2023%40MYMAIL.POMONA.EDU%7Cc07c5cd7ae9d494a99b508dd39cd4f56%7C817f590439044ee8b3a5a65d4746ff70%7C0%7C0%7C638730276335182605%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=b75f55nnL5fmR5bgW7b4rBMMQknhGr5dSGhaV7IWdfo%3D&reserved=0" className="text-blue-500 hover:underline mt-2" target="_blank">
                    Click Here
                  </Link>
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