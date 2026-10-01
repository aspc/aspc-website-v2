'use client';
import { useState, useEffect, FormEvent } from 'react';
import { AdminUser } from '@/types';

const AdminsDashboard = () => {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [email, setEmail] = useState<string>('');
    const [nameQuery, setNameQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<AdminUser[] | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [pendingRemoval, setPendingRemoval] = useState<AdminUser | null>(
        null
    );
    const [showEmailForm, setShowEmailForm] = useState(false);

    const fetchAdmins = async () => {
        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/users/admins`,
                {
                    credentials: 'include',
                }
            );
            if (response.ok) {
                const data = await response.json();
                setAdmins(data);
            }
        } catch (error) {
            console.error('Error fetching admins:', error);
        }
    };

    // Fetch existing admins
    useEffect(() => {
        fetchAdmins();
    }, []);

    const grantAdmin = async (targetEmail: string) => {
        setError('');
        setSuccessMessage('');

        try {
            setIsLoading(true);
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/users/admins`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: targetEmail }),
                }
            );
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Failed to add admin');
                return false;
            }

            await fetchAdmins();
            return true;
        } catch (error) {
            console.error('Error adding admin:', error);
            setError('Failed to add admin');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const searchUsers = async (query: string) => {
        setError('');
        setSuccessMessage('');

        try {
            setIsLoading(true);
            const params = new URLSearchParams({ q: query.trim() });
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/users/search?${params}`,
                {
                    credentials: 'include',
                }
            );
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Search failed');
                return;
            }

            setSearchResults(data);
        } catch (error) {
            console.error('Error searching users:', error);
            setError('Search failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchByName = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await searchUsers(nameQuery);
    };

    const handleSearchByEmail = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await searchUsers(email);
    };

    const handleAddFromSearch = async (user: AdminUser) => {
        const ok = await grantAdmin(user.email);
        if (ok) {
            // Reset the lookup so the section returns to its starting state.
            // grantAdmin already refreshed the current admins list.
            setSearchResults(null);
            setNameQuery('');
            setEmail('');
            setShowEmailForm(false);
            setSuccessMessage(
                `You added ${user.firstName} ${user.lastName} as an admin!`
            );
        }
    };

    const handleConfirmRemove = async () => {
        if (!pendingRemoval) return;
        const admin = pendingRemoval;
        setError('');
        setSuccessMessage('');

        try {
            setIsLoading(true);
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/users/admins/${admin._id}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                const data = await response.json();
                setError(data.message || 'Failed to remove admin');
                return;
            }

            await fetchAdmins();
            setSearchResults(
                (prev) =>
                    prev?.map((u) =>
                        u._id === admin._id ? { ...u, isAdmin: false } : u
                    ) ?? null
            );
        } catch (error) {
            console.error('Error removing admin:', error);
            setError('Failed to remove admin');
        } finally {
            setIsLoading(false);
            setPendingRemoval(null);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Manage Admins</h2>

            {/* Find by name */}
            <form onSubmit={handleSearchByName} className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    Find by name
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={nameQuery}
                        onChange={(e) => setNameQuery(e.target.value)}
                        placeholder="First or last name"
                        required
                        minLength={2}
                        className="flex-1 p-2 border border-gray-300 rounded"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        Search
                    </button>
                </div>
            </form>

            {successMessage && (
                <p className="text-green-600 text-sm mb-4">{successMessage}</p>
            )}

            {/* Find by email, hidden until requested */}
            {showEmailForm ? (
                <form onSubmit={handleSearchByEmail} className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                        Find by Pomona email
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="student@mymail.pomona.edu"
                            required
                            minLength={2}
                            className="flex-1 p-2 border border-gray-300 rounded"
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            Search
                        </button>
                    </div>
                </form>
            ) : (
                <button
                    type="button"
                    onClick={() => setShowEmailForm(true)}
                    className="text-sm text-blue-600 hover:underline mb-6"
                >
                    Or find by email
                </button>
            )}

            {/* Search results, shared by both lookups */}
            {searchResults && (
                <ul className="mb-6 divide-y divide-gray-200 border border-gray-200 rounded">
                    {searchResults.map((user) => (
                        <li
                            key={user._id}
                            className="flex items-center justify-between p-3"
                        >
                            <div>
                                <p className="font-medium">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {user.email}
                                </p>
                            </div>
                            {user.isAdmin ? (
                                <span className="text-sm text-gray-500">
                                    Already admin
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleAddFromSearch(user)}
                                    disabled={isLoading}
                                    className="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                                >
                                    Add
                                </button>
                            )}
                        </li>
                    ))}
                    {searchResults.length === 0 && (
                        <li className="p-3 text-gray-500">
                            No matching users found.
                        </li>
                    )}
                </ul>
            )}

            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            <h3 className="text-lg font-semibold mb-3">Current admins</h3>
            <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
                {admins.map((admin) => (
                    <li
                        key={admin._id}
                        className="flex items-center justify-between p-3"
                    >
                        <div>
                            <p className="font-medium">
                                {admin.firstName} {admin.lastName}
                            </p>
                            <p className="text-sm text-gray-600">
                                {admin.email}
                            </p>
                        </div>
                        {admin.isSuperAdmin ? (
                            <span className="text-sm text-gray-500">
                                Super admin
                            </span>
                        ) : (
                            <button
                                onClick={() => setPendingRemoval(admin)}
                                disabled={isLoading}
                                className="bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 disabled:opacity-50 text-sm"
                            >
                                Remove
                            </button>
                        )}
                    </li>
                ))}
                {admins.length === 0 && (
                    <li className="p-3 text-gray-500">No admins found.</li>
                )}
            </ul>

            {/* Remove confirmation */}
            {pendingRemoval && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">
                            Remove admin
                        </h2>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to remove{' '}
                            <span className="font-semibold">
                                {pendingRemoval.firstName}{' '}
                                {pendingRemoval.lastName}
                            </span>{' '}
                            as an admin?
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingRemoval(null)}
                                disabled={isLoading}
                                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmRemove}
                                disabled={isLoading}
                                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminsDashboard;
