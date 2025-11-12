'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import Loading from '@/components/Loading';
import { StaffMember, Event, ForumEvent } from '@/types';
import { FormattedReviewText, formatReviewText } from '@/utils/textFormatting';

const ForumDashboard = () => {
    const { loading } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [existingMembers, setExistingMembers] = useState<StaffMember[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<string>('');
    const [existingEvents, setExistingEvents] = useState<ForumEvent[]>([]);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isEngagePopupOpen, setIsEngagePopupOpen] = useState(false);
    const [isEngageLoading, setIsEngageLoading] = useState(false);
    const [engageEvents, setEngageEvents] = useState<Event[]>([]);

    // Form state
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [eventDate, setEventDate] = useState<string>('');
    const [location, setLocation] = useState<string>('');
    const [ratingUntil, setRatingUntil] = useState<string>('');
    const [customQuestions, setCustomQuestions] = useState<string[]>([]);
    const [engageEventId, setEngageEventId] = useState<string>('');
    const [staffHost, setStaffHost] = useState<string>('');

    const fetchMembers = async () => {
        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/members`,
                {
                    credentials: 'include',
                }
            );
            if (response.ok) {
                const data = await response.json();
                setExistingMembers(data);
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    };

    const fetchEvents = async () => {
        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/openforum`,
                {
                    credentials: 'include',
                }
            );
            if (response.ok) {
                const data = await response.json();
                setExistingEvents(data);
            }
        } catch (error) {
            console.error('Error fetching forum events:', error);
        }
    };
    const toDatetimeLocal = (dateString: string) => {
        const date = new Date(dateString);
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - offset * 60 * 1000);
        return localDate.toISOString().slice(0, 16);
    };

    // Fetch existing events
    useEffect(() => {
        fetchEvents();
        fetchMembers();
    }, []);

    // Fetch selected event data
    useEffect(() => {
        const fetchEventData = async () => {
            if (!selectedEvent) return;

            try {
                setIsLoading(true);

                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/openforum/${selectedEvent}`,
                    {
                        credentials: 'include',
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    setTitle(data.title);
                    setDescription(data.description);
                    setEventDate(toDatetimeLocal(data.eventDate));
                    setLocation(data.location);
                    setRatingUntil(toDatetimeLocal(data.ratingUntil));
                    setCustomQuestions(data.customQuestions);
                    setStaffHost(data.staffHost);
                    setEngageEventId(data.engageEventId);
                }
            } catch (error) {
                console.error('Error fetching event data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEventData();
    }, [selectedEvent]);

    // Fetch Engage data
    useEffect(() => {
        const fetchEngageEvents = async () => {
            try {
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/events`
                );

                if (response.ok) {
                    const events = await response.json();
                    setEngageEvents(events);
                    console.log(engageEvents);
                }
            } catch (error) {
                console.error('Error fetching Engage events:', error);
            } finally {
                setIsEngageLoading(false);
            }
        };

        if (isEngagePopupOpen) {
            fetchEngageEvents();
        }
    }, [isEngagePopupOpen]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setEventDate('');
        setLocation('');
        setRatingUntil('');
        setCustomQuestions([]);
        setEngageEventId('');
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            try {
                setIsLoading(true);
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/openforum/${selectedEvent}`,
                    {
                        method: 'DELETE',
                        credentials: 'include',
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to delete event');
                }

                alert('Event deleted successfully!');
                resetForm();
                setIsEditing(false);
                setIsCreatingNew(false);
                setSelectedEvent('');
                fetchEvents();
            } catch (error) {
                console.error('Error deleting staff data:', error);
                alert('Failed to delete staff data');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setIsLoading(true);

            const url = selectedEvent
                ? `${process.env.BACKEND_LINK}/api/openforum/${selectedEvent}`
                : `${process.env.BACKEND_LINK}/api/openforum`;

            const method = selectedEvent ? 'PUT' : 'POST';

            const payload = {
                title,
                description,
                eventDate: new Date(eventDate).toISOString(),
                location,
                ratingUntil: new Date(ratingUntil).toISOString(),
                customQuestions,
                ...(staffHost && { staffHost }),
                ...(engageEventId && { engageEventId }),
            };

            const response = await fetch(url, {
                method,
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Failed to save event');

            alert('Event saved successfully!');
            resetForm();
            setIsEditing(false);
            setIsCreatingNew(false);
            setSelectedEvent('');
            fetchEvents();
        } catch (error) {
            console.error('Error saving event:', error);
            alert('Failed to save event');
        } finally {
            setIsLoading(false);
        }
    };

    if (loading || isLoading) return <Loading />;

    if (!isEditing && !isCreatingNew) {
        return (
            <div className="bg-gray-100 p-6 lg:p-8">
                {/* Header */}
                <header className="mb-6 border-b border-gray-300 pb-4">
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">
                        Forum Event Management
                    </h1>
                    <p className="text-gray-600 text-base">
                        Manage, create, or import events for the Open Forum
                        system.
                    </p>
                </header>

                {/* Overview Section */}
                <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-5">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        Overview
                    </h2>
                    <p className="text-gray-700 text-sm mb-3">
                        From here, you can manage all Open Forum events:
                    </p>

                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mb-3">
                        <li>
                            <strong>Add new events</strong> or import from
                            Engage.
                        </li>
                        <li>
                            <strong>Edit or update</strong> existing events.
                        </li>
                        <li>
                            <strong>Set up polls</strong> to gauge student
                            satisfaction with past events.
                        </li>
                    </ul>

                    <div className="w-fit p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-blue-700 text-sm leading-snug">
                            <strong>Tip: </strong>
                            When creating a new event, you can use the{' '}
                            <strong>“Import from Engage”</strong> option to
                            automatically pull details like title, description,
                            date, and location.
                        </p>
                    </div>
                </section>

                {/* Add / Edit Events */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow transition-shadow">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            Add New Forum Event
                        </h2>
                        <p className="text-gray-600 text-sm mb-4">
                            Create a new forum event from scratch or import from
                            Engage.
                        </p>

                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setIsCreatingNew(true);
                                setSelectedEvent('');
                                resetForm();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto"
                        >
                            + Add New Event
                        </button>
                    </section>

                    <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow transition-shadow">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            Edit Existing Event
                        </h2>
                        <p className="text-gray-600 text-sm mb-4">
                            Select an existing event to edit its details.
                        </p>

                        <select
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                            value={selectedEvent}
                            onChange={(e) => {
                                setSelectedEvent(e.target.value);
                                if (e.target.value) setIsEditing(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        >
                            <option value="">Select an event to edit</option>
                            {existingEvents.map((event) => (
                                <option key={event._id} value={event._id}>
                                    {event.title} (
                                    {new Date(
                                        event.eventDate
                                    ).toLocaleDateString()}
                                    )
                                </option>
                            ))}
                        </select>
                    </section>
                    <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow transition-shadow">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            View Event Insights
                        </h2>
                        <p className="text-gray-600 text-sm mb-4">
                            See rating distribution and feedback for past events
                            to find which were most successful.
                        </p>
                        <Link
                            className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto"
                            href="/dashboard/events"
                        >
                            View Event Ratings
                        </Link>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="min-h-screen bg-gray-100 p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                    {selectedEvent ? 'Edit Event' : 'Add New Event'}
                </h1>
                <div className="flex space-x-4 mb-6">
                    {isCreatingNew && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsEngageLoading(true);
                                setIsEngagePopupOpen(true);
                            }}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            Import from Engage
                        </button>
                    )}
                    {!isCreatingNew && (
                        <button
                            type="button"
                            onClick={() => {
                                handleDelete();
                            }}
                            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                        >
                            Delete Event
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setIsEditing(false);
                            setIsCreatingNew(false);
                            setSelectedEvent('');
                            resetForm();
                        }}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                        Back
                    </button>
                </div>

                {isEngagePopupOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full min-h-[80vh] max-h-[80vh] flex flex-col">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800">
                                    Import from Engage
                                </h2>
                                <button
                                    onClick={() => setIsEngagePopupOpen(false)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </div>

                            {/* List of Events */}
                            <div className="flex-1 flex flex-col overflow-y-auto">
                                {isEngageLoading ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : engageEvents.length > 0 ? (
                                    <ul className="space-y-4">
                                        {engageEvents.map(
                                            (event: Event, index) => (
                                                <li
                                                    key={index}
                                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50"
                                                >
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                        {event.name}
                                                    </h3>

                                                    <p className="text-sm text-gray-600 mb-1">
                                                        <strong>Date:</strong>{' '}
                                                        {new Date(
                                                            event.start
                                                        ).toLocaleString()}{' '}
                                                        →{' '}
                                                        {new Date(
                                                            event.end
                                                        ).toLocaleString()}
                                                    </p>

                                                    <p className="text-sm text-gray-600 mb-1">
                                                        <strong>
                                                            Location:
                                                        </strong>{' '}
                                                        {event.location ||
                                                            'N/A'}
                                                    </p>

                                                    <p className="text-sm text-gray-600 mb-1">
                                                        <strong>Host:</strong>{' '}
                                                        {event.host ||
                                                            'Unknown'}
                                                    </p>

                                                    <div className="text-sm text-gray-700 mt-2 line-clamp-3">
                                                        <FormattedReviewText
                                                            text={
                                                                event.description
                                                            }
                                                        />
                                                    </div>

                                                    <div className="flex justify-between items-center mt-3">
                                                        <a
                                                            href={
                                                                event.details_url
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-500 hover:underline text-sm"
                                                        >
                                                            View on Engage ↗
                                                        </a>

                                                        <button
                                                            onClick={() => {
                                                                setEngageEventId(
                                                                    event.details_url
                                                                );
                                                                setTitle(
                                                                    event.name
                                                                );
                                                                setDescription(
                                                                    event.description
                                                                );
                                                                setLocation(
                                                                    event.location
                                                                );
                                                                setEventDate(
                                                                    toDatetimeLocal(
                                                                        new Date(
                                                                            event.start
                                                                        ).toISOString()
                                                                    )
                                                                );
                                                                setIsEngagePopupOpen(
                                                                    false
                                                                );
                                                            }}
                                                            className="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 text-sm"
                                                        >
                                                            Select
                                                        </button>
                                                    </div>
                                                </li>
                                            )
                                        )}
                                    </ul>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <p className="text-gray-500 text-center">
                                            No Engage events found.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={() => setIsEngagePopupOpen(false)}
                                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {engageEventId && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
                    <div>
                        <p className="text-blue-800 font-semibold">
                            This event was imported from Engage
                        </p>
                        <a
                            href={engageEventId}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                        >
                            View original event ↗
                        </a>
                    </div>
                    {isCreatingNew && (
                        <button
                            type="button"
                            onClick={() => resetForm()}
                            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                        >
                            Unlink
                        </button>
                    )}
                </div>
            )}

            {/* Title */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Title
                </h2>
                <input
                    className="w-full p-4 border rounded"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Description
                </h2>
                <textarea
                    className="w-full p-4 border rounded resize-y min-h-[120px]"
                    value={formatReviewText(description)}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                />
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Date
                </h2>
                <p className="text-sm text-gray-500 mt-2 mb-4">
                    Note: Forum postings are intended for past events
                </p>
                <input
                    className="w-full p-4 border rounded"
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                />
            </div>

            {/* Location */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Location
                </h2>
                <textarea
                    className="w-full p-4 border rounded"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                />
            </div>

            {/* Rating Timeframe */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Allow users to submit ratings until
                </h2>
                <p className="text-sm text-gray-500 mt-2 mb-4">
                    ex. 1 week after event
                </p>
                <input
                    className="w-full p-4 border rounded"
                    type="datetime-local"
                    value={ratingUntil}
                    onChange={(e) => setRatingUntil(e.target.value)}
                    required
                />
            </div>

            {/* Custom Questions */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Custom Questions
                </h2>
                {customQuestions.map((question, index) => (
                    <div
                        key={index}
                        className="flex items-center space-x-2 mb-2"
                    >
                        <input
                            type="text"
                            className="w-full p-3 border rounded"
                            value={question}
                            onChange={(e) => {
                                const updated = [...customQuestions];
                                updated[index] = e.target.value;
                                setCustomQuestions(updated);
                            }}
                            placeholder={`Question ${index + 1}`}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const updated = customQuestions.filter(
                                    (_, i) => i !== index
                                );
                                setCustomQuestions(updated);
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Remove question"
                        >
                            ✕
                        </button>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => setCustomQuestions([...customQuestions, ''])}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    + Add Question
                </button>
            </div>

            {/* Staff Host (optional) */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Staff Host (optional)
                </h2>
                <select
                    className="w-full p-4 border rounded mb-4"
                    value={staffHost}
                    onChange={(e) => {
                        setStaffHost(e.target.value);
                        if (e.target.value) {
                            setIsEditing(true);
                        }
                    }}
                >
                    <option value="">Select host</option>
                    {existingMembers.map((member) => (
                        <option key={member._id} value={member._id}>
                            {member.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 w-full disabled:bg-blue-300"
            >
                {isLoading
                    ? 'Saving...'
                    : selectedEvent
                      ? 'Update Event'
                      : 'Add Event'}
            </button>
        </form>
    );
};

export default ForumDashboard;
