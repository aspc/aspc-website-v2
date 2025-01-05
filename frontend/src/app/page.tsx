'use client';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    fetch('http://localhost:5000/api/test')
      .then(res => res.json())
      .then(data => {
        setMessage(data.message);
        console.log('Backend response:', data);
      })
      .catch(err => {
        console.error('Error connecting to backend:', err);
        setMessage('Failed to connect to backend');
      });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-blue-800 text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-light text-center mb-4">
            Associated Student of Pomona College
          </h1>
          <p className="text-center mb-20">
            Backend Status: {message || 'Connecting...'}
          </p>
          

         
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


