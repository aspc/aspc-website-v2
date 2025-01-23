'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Loading from '@/components/Loading'
import PageDashboard from '@/components/ui/PageDashboard'
import StaffDashboard from '@/components/ui/StaffDashboard'

const Dashboard = () => {
  const { loading } = useAuth(true)
  const [activeTab, setActiveTab] = useState<'pages' | 'staff'>('pages')

  if (loading) return <Loading />

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="p-8">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('pages')}
            className={`px-4 py-2 rounded ${
              activeTab === 'pages' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Edit Pages
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded ${
              activeTab === 'staff' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Edit Staff
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'pages' && <PageDashboard />}
          {activeTab === 'staff' && <StaffDashboard />}
        </div>
      </div>
    </div>
  )
}

export default Dashboard