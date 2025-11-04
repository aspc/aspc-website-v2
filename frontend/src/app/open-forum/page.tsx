'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Loading from '@/components/Loading';
import { ForumEvent, User } from '@/types';
import moment from 'moment';
import { FormattedReviewText } from '@/utils/textFormatting';

const OpenForumPage = () => {
    const [events, setEvents] = useState<ForumEvent[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filter, setFilter] = useState<'all' | 'past' | 'upcoming'>('all');
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
    const [userCache, setUserCache] = useState<Record<string, User>>({});

    // Fetch user details for a user ID
    const fetchUserInfo = async (userId: string): Promise<User | null> => {
        if (userCache[userId]) {
            return userCache[userId];
        }

        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/auth/users/${userId}`,
                {
                    method: 'GET',
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                return null;
            }

            const userInfo: User = await response.json();
            setUserCache((prev) => ({
                ...prev,
                [userId]: userInfo,
            }));
            return userInfo;
        } catch (err) {
            console.error('Failed to fetch user info:', err);
            return null;
        }
    };

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true);
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/openforum`,
                    {
                        method: 'GET',
                        credentials: 'include',
                    }
                );
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const data = await response.json();
                setEvents(data);

                // Fetch user details for all unique createdBy IDs
                const uniqueUserIds = Array.from(
                    new Set(
                        data
                            .map((event: ForumEvent) => event.createdBy)
                            .filter((id: string) => id)
                    )
                ) as string[];

                await Promise.all(
                    uniqueUserIds.map((userId) => fetchUserInfo(userId))
                );

                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch events:', err);
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    const filteredEvents = React.useMemo(() => {
        const now = new Date();
        const filtered = events.filter(event => {
            const eventDate = new Date(event.eventDate);
            switch (filter) {
                case 'past':
                    return eventDate < now;
                case 'upcoming':
                    return eventDate >= now;
                case 'all':
                default:
                    return true;
            }
        });
        
        // Sort events chronologically (most recent first)
        return filtered.sort((a, b) => {
            const dateA = new Date(a.eventDate).getTime();
            const dateB = new Date(b.eventDate).getTime();
            return dateB - dateA; // Descending order (most recent first)
        });
    }, [events, filter]);

    const getEventStatusColor = (eventDate: Date) => {
        const now = new Date();
        const event = new Date(eventDate);
        const diffDays = Math.ceil((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return 'bg-gray-100 border-gray-300'; // Past event
        } else if (diffDays <= 7) {
            return 'bg-yellow-50 border-yellow-300'; // Upcoming within a week
        } else {
            return 'bg-blue-50 border-blue-300'; // Future event
        }
    };

    const getEventStatusText = (eventDate: Date) => {
        const now = new Date();
        const event = new Date(eventDate);
        const diffDays = Math.ceil((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return 'Past Event';
        } else if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Tomorrow';
        } else if (diffDays <= 7) {
            return `In ${diffDays} days`;
        } else {
            return 'Upcoming';
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            <div className="p-5">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        Open Forum - Event Bulletin Board
                    </h1>
                    <p className="text-gray-600 mb-4">
                        Browse past and upcoming events. Click on any event to view reviews and details.
                    </p>
                    
                    {/* Filter buttons */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setFilter('past')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                filter === 'past'
                                    ? 'bg-gray-800 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Past Events
                        </button>
                        <button
                            onClick={() => setFilter('upcoming')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                filter === 'upcoming'
                                    ? 'bg-gray-800 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Upcoming Events
                        </button>
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                filter === 'all'
                                    ? 'bg-gray-800 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            All Events
                        </button>
                    </div>
                </div>

                {filteredEvents.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-gray-400 text-6xl mb-4">📅</div>
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">
                            No {filter === 'all' ? '' : filter} events found
                        </h3>
                        <p className="text-gray-500">
                            {filter === 'past' 
                                ? 'No past events are available at the moment.'
                                : filter === 'upcoming'
                                ? 'No upcoming events are scheduled.'
                                : 'No events are available at the moment.'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEvents.map((event) => (
                            <Link
                                key={event._id}
                                href={`/open-forum/${event._id}`}
                                className="block"
                            >
                                <div className={`border-2 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer h-full flex flex-col ${getEventStatusColor(event.eventDate)}`}>
                                    {/* Event Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-lg font-bold text-gray-800 line-clamp-2 flex-1 mr-2">
                                            {event.title}
                                        </h3>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                            new Date(event.eventDate) < new Date()
                                                ? 'bg-gray-200 text-gray-700'
                                                : 'bg-green-200 text-green-700'
                                        }`}>
                                            {getEventStatusText(event.eventDate)}
                                        </span>
                                    </div>

                                    {/* Event Details */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center text-sm text-gray-600">
                                            <span className="font-medium mr-2">📅</span>
                                            <span>{moment(event.eventDate).format('MMM DD, YYYY')}</span>
                                        </div>
                                        
                                        <div className="flex items-center text-sm text-gray-600">
                                            <span className="font-medium mr-2">🕐</span>
                                            <span>{moment(event.eventDate).format('h:mm A')}</span>
                                        </div>
                                        
                                        <div className="flex items-center text-sm text-gray-600">
                                            <span className="font-medium mr-2">📍</span>
                                            <span className="line-clamp-1">{event.location}</span>
                                        </div>
                                        
                                        {event.createdBy && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <span className="font-medium mr-2">👤</span>
                                                <span>
                                                    {userCache[event.createdBy]
                                                        ? `${userCache[event.createdBy].firstName} ${userCache[event.createdBy].lastName}`
                                                        : event.createdBy}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Description (collapsible) */}
                                    <div className="mb-4 flex-1">
                                        <div className={`${expandedCards[event._id] ? '' : 'line-clamp-3'} text-gray-700`}>
                                            <FormattedReviewText
                                                text={event.description}
                                                className="text-gray-700"
                                            />
                                        </div>
                                    </div>

                                    {/* Footer: Rating Info + Expand toggle */}
                                    <div className="mt-auto pt-3 border-t border-gray-200 flex items-center justify-between">
                                        <div className="flex items-center text-sm text-gray-600">
                                            <span className="font-medium mr-1">⭐</span>
                                            <span>View ratings</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="text-sm text-blue-600 hover:text-blue-700 underline"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setExpandedCards((prev) => ({
                                                    ...prev,
                                                    [event._id]: !prev[event._id],
                                                }));
                                            }}
                                        >
                                            {expandedCards[event._id] ? 'Show less' : 'Show more'}
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OpenForumPage;
