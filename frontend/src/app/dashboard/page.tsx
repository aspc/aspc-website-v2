'use client'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Loading from '@/components/Loading'
import { Editor } from '@tinymce/tinymce-react'


export default function Dashboard() {

  const { user, loading } = useAuth(true)
  const [selectedPage, setSelectedPage] = useState<string>('')
  const [content, setContent] = useState<string>('')

  const staticPages = [
    { id: 'home', name: 'Home Page' },
    { id: 'about', name: 'About ASPC' },
    { id: 'senate', name: 'Senate Page' },
    { id: 'committees', name: 'Committees' },
  ]

  const handlePageSelect = async (pageId: string) => {
    setSelectedPage(pageId)
    // TODO: Fetch content for selected page
    setContent(`<h2>This is a heading</h2><p>This is <b>bold</b> and this is <i>italic</i> text.</p>`)
  }

  const handleContentSave = async () => {
    if (!selectedPage || !content) return
    
    try {
      // TODO: Save content to database
      console.log(`Saving HTML content for ${selectedPage}:`, content)
      alert('Content saved successfully!')
    } catch (error) {
      console.error('Error saving content:', error)
      alert('Error saving content')
    }
  }

  if (loading) return <Loading />

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
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
              <Editor
                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                value={content}
                onEditorChange={(content: string) => setContent(content)}
                init={{
                height: 500,
                menubar: false,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                  'preview', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                  'insertdatetime', 'table', 'code', 'help', 'wordcount'
                ],
                toolbar: 'undo redo | blocks | ' +
                  'bold italic forecolor | alignleft aligncenter ' +
                  'alignright alignjustify | bullist numlist outdent indent | ' +
                  'removeformat | help',
                }}
              />
              <button
              onClick={handleContentSave}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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