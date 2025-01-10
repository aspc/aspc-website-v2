'use client'
import { useState } from 'react'
import Loading from '@/components/Loading'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface PageContent {
  id: string;
  pageName: string;
  content: string;
}

export default function Dashboard() {
  const { user, loading } = useAuth(true); // Pass true to require admin
  const [selectedPage, setSelectedPage] = useState<string>('')
  const [content, setContent] = useState<string>('')
  const router = useRouter();

  // Example static pages that can be edited
  const staticPages = [
    { id: 'home', name: 'Home Page' },
    { id: 'about', name: 'About ASPC' },
    { id: 'senate', name: 'Senate Page' },
    { id: 'committees', name: 'Committees' },
  ]

  const handlePageSelect = async (pageId: string) => {
    if (pageId === 'senate') {
      // Navigate to the Senate Editor page
      router.push('/senator');
      return;
    }
    setSelectedPage(pageId)
    // Here you would fetch the current content for the selected page
    // For now using placeholder
    setContent(`This is the current content for ${pageId} page`)
  }

  const handleContentSave = async () => {
    if (!selectedPage || !content) return
    
    try {
      // TODO: api call to save content
      console.log(`Saving content for ${selectedPage}:`, content)
      alert('Content saved successfully!')
    } catch (error) {
      console.error('Error saving content:', error)
      alert('Error saving content')
    }
  }

  if (!user) return <Loading />

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard for {user.name}</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Edit Page Content</h2>
            <select 
              className="w-full p-2 border rounded mb-4"
              value={selectedPage}
              onChange={(e) => handlePageSelect(e.target.value)}
            >
              <option value="">Select a page to edit</option>
              {staticPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          </div>

          {selectedPage && (
            <div>
              <textarea
                className="w-full h-64 p-4 border rounded mb-4"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter page content here..."
              />
              <button
                onClick={handleContentSave}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}