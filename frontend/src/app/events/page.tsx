'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar'; // // display events in calendar format
import moment from 'moment'; // handles data formatting and conversions
import 'react-big-calendar/lib/css/react-big-calendar.css'; //used to style the calendar
import Loading from '@/components/Loading';
import { Event } from '@/types';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: {
    location: string;
    host: string;
    description: string;
    details_url: string;
    status: string;
  };
}

const EventsPage = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<View>('month');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        let endpoint = 'month'; 
        
        if (currentView === 'day') {
          endpoint = 'day';
        } else if (currentView === 'month') {
          endpoint = 'month';
        }
        const response = await fetch(`${process.env.BACKEND_LINK}/api/events/${endpoint}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();

        const formattedEvents: CalendarEvent[] = data.map((event: Event) => ({
          title: event.name,
          start: moment(event.start).toDate(),
          end: event.end ? moment(event.end).toDate() : moment(event.start).toDate(),
          resource: {
            location: event.location,
            host: event.host,
            description: event.description,
            details_url: event.details_url,
            status: event.status
          }
        }));

        setEvents(formattedEvents);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentView]);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const closeEventDetails = () => {
    setSelectedEvent(null);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  if (loading) return <Loading />;

  return (
    <div className="p-5">

      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto" onClick={closeEventDetails}>
          <div 
            className="bg-white p-6 rounded-lg max-w-lg w-11/12 shadow-lg relative mt-10 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >            
            <h2 className={`text-2xl font-bold ${selectedEvent.resource.status === 'canceled' ? 'line-through text-red-500' : 'text-gray-800'}`}>
              {selectedEvent.title}
            </h2>
            <p className={`font-medium mb-2 ${selectedEvent.resource.status === 'canceled' ? 'text-red-500' : 'text-gray-600'}`}>
              Status: {selectedEvent.resource.status.charAt(0).toUpperCase() + selectedEvent.resource.status.slice(1)}
            </p>
            <p className="text-gray-600 mb-2"><strong>Start:</strong> {moment(selectedEvent.start).format('LLLL')}</p>
            {!moment(selectedEvent.start).isSame(selectedEvent.end, 'day') && (
              <p className="text-gray-600 mb-2"><strong>End:</strong> {moment(selectedEvent.end).format('LLLL')}</p>
            )}
            <p className="text-gray-600 mb-2"><strong>Location:</strong> {selectedEvent.resource.location}</p>
            <p className="text-gray-600 mb-2"><strong>Host:</strong> {selectedEvent.resource.host}</p>
            <p className="text-gray-700 mb-4">{selectedEvent.resource.description}</p>

            <div className="flex justify-between">
            <a
                href={selectedEvent.resource.details_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#3174ad] text-white py-2 px-4 rounded-lg hover:bg-[#255a89] transition"
              >                
              Event Details
            </a>
            <button onClick={closeEventDetails} className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600">
              Close
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="bg-white rounded-lg p-4 shadow-md min-h-[600px] h-[calc(100vh-180px)]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={{ month: true, week: false, day: false }}  
        view={currentView} 
        onView={handleViewChange}
        defaultView={'month'}
        date={currentDate}
        onNavigate={(newDate: Date) => setCurrentDate(newDate)}
        onSelectEvent={handleSelectEvent}
        popup={true}
      />
    </div>
  </div>
);
};

export default EventsPage;
