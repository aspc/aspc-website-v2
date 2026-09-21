'use client';
import { useState, useEffect, FormEvent } from 'react';
import { AdminUser } from '@/types';

const AdminsDashboard = () => {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [email, setEmail] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');

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

    const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        try {
            setIsLoading(true);
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/users/admins`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                }
            );
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Failed to add admin');
                return;
            }

            setEmail('');
            fetchAdmins();
        } catch (error) {
            console.error('Error adding admin:', error);
            setError('Failed to add admin');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (admin: AdminUser) => {
        if (
            !window.confirm(
                `Remove admin privileges from ${admin.firstName} ${admin.lastName} (${admin.email})?`
            )
        ) {
            return;
        }

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
                alert(data.message || 'Failed to remove admin');
                return;
            }

            fetchAdmins();
        } catch (error) {
            console.error('Error removing admin:', error);
            alert('Failed to remove admin');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Manage Admins</h2>

            <form onSubmit={handleAdd} className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    Add admin by Pomona email
                </label>
                <div className="flex gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@pomona.edu"
                        required
                        className="flex-1 p-2 border border-gray-300 rounded"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        Add Admin
                    </button>
                </div>
                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
                <p className="text-gray-500 text-sm mt-2">
                    The person must have logged in to the site at least once.
                </p>
            </form>

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
                                onClick={() => handleRemove(admin)}
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
        </div>
    );
};

export default AdminsDashboard;
