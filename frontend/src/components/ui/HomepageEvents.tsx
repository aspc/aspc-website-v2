import React, { useState } from 'react';
import Link from 'next/link';
import { Event } from '@/types';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import moment from 'moment';

const HomepageEvents: React.FC<{ events: Event[] }> = ({ events = [] }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const eventsPerPage = 3;
    const totalPages = Math.ceil(events.length / eventsPerPage);

    const startIndex = currentPage * eventsPerPage;
    const visibleEvents = events.slice(startIndex, startIndex + eventsPerPage);

    const handlePrevious = () => {
        setCurrentPage((prev) => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
    };

    if (events.length === 0) {
        return <p className="text-gray-600">No upcoming events</p>;
    }

    return (
        <div className="relative">
            <div className="flex items-center">
                <button
                    onClick={handlePrevious}
                    disabled={currentPage === 0}
                    className={`p-2 rounded-full ${
                        currentPage === 0
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-blue-500 hover:bg-blue-50'
                    }`}
                    aria-label="Previous page"
                >
                    <ChevronLeft size={24} />
                </button>

                <div className="flex-1">
                    <ul>
                        {visibleEvents.map((event: Event, index: number) => (
                            <li
                                key={index}
                                className="p-2 border-b-2 border-gray-100"
                            >
                                <Link
                                    href={event.details_url}
                                    target="_blank"
                                    className="text-xl font-semibold text-blue-500 hover:underline"
                                >
                                    {event.name}
                                </Link>
                                <div className="flex items-center text-gray-600 text-sm mb-1">
                                    <MapPin size={16} className="mr-2" />
                                    <span>{event.location}</span>
                                </div>
                                <div className="flex items-center text-gray-600 text-sm">
                                    <Clock size={16} className="mr-2" />
                                    <span>
                                        {moment(event.start).format(
                                            'MMMM DD, YYYY hh:mm A'
                                        )}{' '}
                                        -{' '}
                                        {moment(event.end).format(
                                            'MMMM DD, YYYY hh:mm A'
                                        )}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <button
                    onClick={handleNext}
                    disabled={currentPage >= totalPages - 1}
                    className={`p-2 rounded-full ${
                        currentPage >= totalPages - 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-blue-500 hover:bg-blue-50'
                    }`}
                    aria-label="Next page"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            <div className="text-center mt-4 text-gray-600">
                Page {currentPage + 1} of {totalPages}
            </div>
        </div>
    );
};

export default HomepageEvents;
