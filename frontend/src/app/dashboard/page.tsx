'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/Loading';
import PageDashboard from '@/components/ui/PageDashboard';
import StaffDashboard from '@/components/ui/StaffDashboard';
import ForumDashboard from '@/components/ui/ForumDashboard';
import ElectionsDashboard from '@/components/ui/ElectionsDashboard';
import AdminsDashboard from '@/components/ui/AdminsDashboard';
import RidesDashboard from '@/components/ui/RidesDashboard';

const Dashboard = () => {
    const { user, loading } = useAuth(true);
    type DashboardTab =
        'pages' | 'staff' | 'openforum' | 'elections' | 'rides' | 'admins';
    const [activeTab, setActiveTab] = useState<DashboardTab>('pages');

    if (loading) return <Loading />;

    if (!user || !user?.isAdmin) {
        return (
            <div className="min-h-screen bg-gray-100 text-gray-900 flex items-center justify-center">
                <div className="p-8 bg-white rounded-lg shadow">
                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
                        Forbidden
                    </h2>
                    <p className="text-center">
                        You do not have permission to access this page.
                    </p>
                </div>
            </div>
        );
    }

    const tabOptions: { value: DashboardTab; label: string }[] = [
        { value: 'pages', label: 'Pages' },
        { value: 'staff', label: 'Staff' },
        { value: 'openforum', label: 'Open Forum' },
        { value: 'elections', label: 'Elections' },
        { value: 'rides', label: 'Rides' },
        ...(user.isSuperAdmin
            ? [{ value: 'admins' as const, label: 'Admins' }]
            : []),
    ];

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            <div className="p-8">
                <div className="mb-6">
                    <label
                        htmlFor="dashboard-section"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Section
                    </label>
                    <select
                        id="dashboard-section"
                        value={activeTab}
                        onChange={(e) =>
                            setActiveTab(e.target.value as DashboardTab)
                        }
                        className="px-4 py-2 rounded border border-gray-300 bg-white font-medium"
                    >
                        {tabOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    {activeTab === 'pages' && <PageDashboard />}
                    {activeTab === 'staff' && <StaffDashboard />}
                    {activeTab === 'openforum' && <ForumDashboard />}
                    {activeTab === 'elections' && <ElectionsDashboard />}
                    {activeTab === 'rides' && <RidesDashboard />}
                    {activeTab === 'admins' && <AdminsDashboard />}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
