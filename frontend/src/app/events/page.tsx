'use client';
import React, { useState, useEffect } from 'react';
import Loading from '@/components/Loading';
import { Event } from '@/types';
import Link from 'next/link';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${process.env.BACKEND_LINK}/api/events`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setEvents(data);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className='p-8'>
      <h1 className="text-3xl font-bold mb-4">Events</h1>
      <ul className="gap-4">
        {events.map((event: Event, index: number) => (
          <li key={index} className="p-4 border rounded-lg shadow-md">
            <h2 className="text-xl font-semibold">{event.name}</h2>
            <p className="text-gray-600">Date: {new Date(event.start).toLocaleString()}</p>
            <p className="text-gray-600">Location: {event.location}</p>
            <p className="text-gray-600">Host: {event.host}</p>
            <p className="text-gray-600">{event.description}</p>
            <Link href={event.details_url} target="_blank" className="text-blue-600">More details / Save Event</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default EventsPage;
