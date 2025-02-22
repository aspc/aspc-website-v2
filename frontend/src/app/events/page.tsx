"use client";
import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer, Event as BigCalendarEvent, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Dialog } from "@headlessui/react";

const localizer = momentLocalizer(moment);

interface CalendarEvent extends BigCalendarEvent {
  title: string;
  start: Date;
  end: Date;
  url: string;
  description: string;
}

const EventsPage = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dropdownEvent, setDropdownEvent] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());



  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${process.env.BACKEND_LINK}/api/events`);
        const data = await response.json();

        const formattedEvents = data.map((event: any) => ({
          title: event.name,
          start: new Date(event.start),
          end: event.end ? new Date(event.end) : new Date(event.start),
          url: event.details_url,
          description: event.description,
        }));

        setEvents(formattedEvents);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen text-xl">Loading events...</div>;
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-100 relative">
      <h1 className="text-4xl font-bold text-center py-4">Event Calendar</h1>

      {/* Selected Event Description Above Calendar */}
      {selectedEvent && (
        <div className="absolute top-16 w-full max-w-4xl bg-white p-6 rounded-lg shadow-md z-[15]">
          <h2 className="text-xl font-semibold selected-event-title">{selectedEvent.title}</h2>
          <p className="text-gray-600 mt-2">{selectedEvent.description}</p>
          <p className="text-gray-500 mt-2">
            <strong>Start:</strong> {moment(selectedEvent.start).format("LLL")}
          </p>
          <p className="text-gray-500">
            <strong>End:</strong> {moment(selectedEvent.end).format("LLL")}
          </p>
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setSelectedEvent(null)}
              className="bg-gray-500 text-white px-4 py-2 rounded-md"
            >
              Close
            </button>
            <a
              href={selectedEvent.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              More Details
            </a>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="w-full max-w-6xl h-[85vh] p-4 bg-white shadow-md rounded-lg relative">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views={{ month: true, week: false, day: false, agenda: false }}
          defaultView={Views.MONTH}
          date={currentDate}
          onNavigate={(newDate) => setCurrentDate(newDate)}
          popup={true} 
          style={{ height: "100%", width: "100%" }}
          tooltipAccessor={(event) => `${moment(event.start).format("hh:mm A")} - ${event.title}`} 
          components={{
            event: ({ event }) => (
            <div className="flex items-center whitespace-nowrap overflow-hidden max-w-full">
              <span className="text-white-700 font-semibold truncate">
                {moment(event.start).format("hh:mm A")} - {event.title}
              </span>
            </div>
            ),
          }}
          onSelectEvent={(event) => {
            setSelectedEvent(event);
            setDropdownEvent(true); 
          }}
        />
      </div>
    </div>
  );
};

export default EventsPage;