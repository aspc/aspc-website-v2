'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading';
import { useAuth } from '@/hooks/useAuth';
import LoginRequired from '@/components/LoginRequired';
import { StarRating } from '@/components/housing/Rooms';

interface User {
    _id: string;
    name?: string;
    email?: string;
    isAdmin?: boolean;
}

interface ForumEvent {
    _id: string;
    title: string;
    description: string;
    createdBy: string | User;
    staffHost?: string | User;
    eventDate: Date;
    location: string;
    ratingUntil: Date;
    customQuestions?: string[];
    engageEventId?: string;
}

interface EventStats {
    averageOverall: number;
    averageWouldRepeat: number;
    totalReviews: number;
    ratingDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
    customQuestions?: { [key: string]: number };
}

interface EventWithStats extends ForumEvent {
    stats?: EventStats;
}

type SortField = 'date' | 'name' | 'rating' | 'reviews' | 'wouldRepeat';
type SortOrder = 'asc' | 'desc';

const AdminEventsDashboard = () => {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<EventWithStats[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<EventWithStats[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('all');

    const [overallAnalytics, setOverallAnalytics] = useState({
        totalEvents: 0,
        totalReviews: 0,
        averageRating: 0,
        averageWouldRepeat: 0,
        averageReviewsPerEvent: 0,
        mostReviewedEvent: '',
        highestRatedEvent: '',
    });

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true);

                // Fetch all events
                const eventsResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/openforum`,
                    {
                        method: 'GET',
                        credentials: 'include',
                    }
                );

                if (!eventsResponse.ok) {
                    throw new Error(`Failed to fetch events: ${eventsResponse.status}`);
                }

                const eventsData: ForumEvent[] = await eventsResponse.json();

                // Fetch stats for each event
                const eventsWithStats = await Promise.all(
                    eventsData.map(async (event) => {
                        try {
                            const statsResponse = await fetch(
                                `${process.env.BACKEND_LINK}/api/openforum/${event._id}/ratings`,
                                {
                                    method: 'GET',
                                    credentials: 'include',
                                }
                            );

                            if (statsResponse.ok) {
                                const stats: EventStats = await statsResponse.json();
                                return { ...event, stats };
                            }
                        } catch (error) {
                            console.error(`Failed to fetch stats for event ${event._id}`, error);
                        }
                        return event;
                    })
                );

                setEvents(eventsWithStats);
                calculateOverallAnalytics(eventsWithStats);
            } catch (error) {
                console.error('Server error', error);
            } finally {
                setLoading(false);
            }
        };

        // Wait for auth to load, then decide what to do
        if (!authLoading) {
            if (user?.isAdmin) {
                fetchEvents();
            } else {
                // User is loaded but not admin (or no user), stop loading immediately
                setLoading(false);
            }
        }
    }, [authLoading, user?.isAdmin]);

    useEffect(() => {
        let result = [...events];

        // Apply status filter
        const now = new Date();
        if (statusFilter === 'upcoming') {
            result = result.filter((e) => new Date(e.eventDate) > now);
        } else if (statusFilter === 'past') {
            result = result.filter((e) => new Date(e.eventDate) <= now);
        }

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (e) =>
                    e.title.toLowerCase().includes(query) ||
                    e.description.toLowerCase().includes(query) ||
                    e.location.toLowerCase().includes(query)
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            let compareValue = 0;

            switch (sortField) {
                case 'date':
                    compareValue = new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
                    break;
                case 'rating':
                    compareValue = (a.stats?.averageOverall || 0) - (b.stats?.averageOverall || 0);
                    break;
                case 'reviews':
                    compareValue = (a.stats?.totalReviews || 0) - (b.stats?.totalReviews || 0);
                    break;
                case 'wouldRepeat':
                    compareValue = (a.stats?.averageWouldRepeat || 0) - (b.stats?.averageWouldRepeat || 0);
                    break;
            }

            return sortOrder === 'asc' ? compareValue : -compareValue;
        });

        setFilteredEvents(result);
    }, [events, searchQuery, sortField, sortOrder, statusFilter]);

    const calculateOverallAnalytics = (eventsData: EventWithStats[]) => {
        const eventsWithReviews = eventsData.filter((e) => e.stats && e.stats.totalReviews > 0);

        if (eventsWithReviews.length === 0) {
            return;
        }

        const totalReviews = eventsWithReviews.reduce((sum, e) => sum + (e.stats?.totalReviews || 0), 0);
        const totalRating = eventsWithReviews.reduce(
            (sum, e) => sum + (e.stats?.averageOverall || 0) * (e.stats?.totalReviews || 0),
            0
        );
        const totalWouldRepeat = eventsWithReviews.reduce(
            (sum, e) => sum + (e.stats?.averageWouldRepeat || 0) * (e.stats?.totalReviews || 0),
            0
        );

        const mostReviewed = [...eventsWithReviews].sort(
            (a, b) => (b.stats?.totalReviews || 0) - (a.stats?.totalReviews || 0)
        )[0];

        const highestRated = [...eventsWithReviews].sort(
            (a, b) => (b.stats?.averageOverall || 0) - (a.stats?.averageOverall || 0)
        )[0];

        setOverallAnalytics({
            totalEvents: eventsData.length,
            totalReviews,
            averageRating: totalRating / totalReviews,
            averageWouldRepeat: totalWouldRepeat / totalReviews,
            averageReviewsPerEvent: totalReviews / eventsWithReviews.length,
            mostReviewedEvent: mostReviewed?.title || 'N/A',
            highestRatedEvent: highestRated?.title || 'N/A',
        });
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Show loading only for auth
    if (authLoading) {
        return <Loading />;
    }

    // Show login required if no user
    if (!user) {
        return <LoginRequired />;
    }

    // Show access denied if not admin
    if (!user.isAdmin) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                    <p className="text-gray-700">You must have admin access to see this page.</p>
                </div>
            </div>
        );
    }

    // Show loading for data fetch (only after auth is confirmed)
    if (loading) {
        return <Loading />;
    }

    const SortButton = ({ field, label }: { field: SortField; label: string }) => (
        <button
            onClick={() => handleSort(field)}
            className={`px-4 py-2 rounded text-sm font-medium ${
                sortField === field
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
        >
            {label} {sortField === field && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Event Insights Dashboard</h1>
                </div>

                {/* Overall Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm mb-1">Total Events</p>
                        <p className="text-3xl font-bold text-blue-700">{overallAnalytics.totalEvents}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm mb-1">Total Reviews</p>
                        <p className="text-3xl font-bold text-blue-700">{overallAnalytics.totalReviews}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm mb-1">Avg Rating</p>
                        <div className="flex items-center gap-2">
                            <p className="text-3xl font-bold text-yellow-600">
                                {overallAnalytics.averageRating.toFixed(1)}
                            </p>
                            <StarRating rating={Math.round(overallAnalytics.averageRating)} />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm mb-1">Avg Would Repeat</p>
                        <div className="flex items-center gap-2">
                            <p className="text-3xl font-bold text-yellow-600">
                                {overallAnalytics.averageWouldRepeat.toFixed(1)}
                            </p>
                            <StarRating rating={Math.round(overallAnalytics.averageWouldRepeat)} />
                        </div>
                    </div>
                </div>

               
                {/* Controls */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    {/* Search Bar */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Events
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title, description, or location..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Filters and Sorting */}
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-4 py-2 rounded text-sm font-medium ${
                                        statusFilter === 'all'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setStatusFilter('upcoming')}
                                    className={`px-4 py-2 rounded text-sm font-medium ${
                                        statusFilter === 'upcoming'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    Upcoming
                                </button>
                                <button
                                    onClick={() => setStatusFilter('past')}
                                    className={`px-4 py-2 rounded text-sm font-medium ${
                                        statusFilter === 'past'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    Past
                                </button>
                            </div>
                        </div>

                        {/* Sort Options */}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                            <div className="flex flex-wrap gap-2">
                                <SortButton field="date" label="Date" />
                                <SortButton field="rating" label="Rating" />
                                <SortButton field="reviews" label="Reviews" />
                                <SortButton field="wouldRepeat" label="Would Repeat" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 text-sm text-gray-600">
                        Showing {filteredEvents.length} of {events.length} events
                    </div>
                </div>

                {/* Events Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Event
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Reviews
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Overall Rating
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Would Repeat
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredEvents.map((event) => (
                                    <tr
                                        key={String(event._id)}
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => router.push(`/dashboard/events/${event._id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {event.title}
                                                </div>
                                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                                    {event.location}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(event.eventDate)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {event.stats?.totalReviews || 0} reviews
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {event.stats?.averageOverall ? (
                                                <div className="flex items-center gap-2">
                                                    <StarRating
                                                        rating={Math.round(event.stats.averageOverall)}
                                                    />
                                                    <span className="text-sm font-medium">
                                                        {event.stats.averageOverall.toFixed(1)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">No reviews</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {event.stats?.averageWouldRepeat ? (
                                                <div className="flex items-center gap-2">
                                                    <StarRating
                                                        rating={Math.round(event.stats.averageWouldRepeat)}
                                                    />
                                                    <span className="text-sm font-medium">
                                                        {event.stats.averageWouldRepeat.toFixed(1)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">No reviews</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/dashboard/events/${event._id}`);
                                                }}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredEvents.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No events found matching your criteria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminEventsDashboard;