'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Loading from '@/components/Loading'
import { Editor } from '@tinymce/tinymce-react'
import { PageContent } from '@/types'
import StaffPage from '@/app/staff/page'

const Dashboard = () => {
  const { user, loading } = useAuth(true)
  const [pages, setPages] = useState<PageContent[]>([])
  const [selectedPage, setSelectedPage] = useState<string>('')
  const [content, setContent] = useState<string>('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newPageId, setNewPageId] = useState('')
  const [newPageName, setNewPageName] = useState('')
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'pages' | 'staff'>('pages')

  // Fetch available pages on component mount
  useEffect(() => {
    const fetchPages = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/admin/pages');
        if (response.ok) {
          const data = await response.json();
          setPages(data);
        }
      } catch (error) {
        console.error('Error fetching pages:', error);
      }
    };

    fetchPages();
  }, []);

  const handlePageSelect = async (pageId: string) => {
    if (pageId === 'new') {
      setIsCreatingNew(true);
      setContent('<p>Add your content here...</p>');
      setSelectedPage('');
      return;
    }
    

    setIsCreatingNew(false);
    setSelectedPage(pageId);
    
    try {
      const response = await fetch(`http://localhost:5000/api/admin/pages/${pageId}`);
      
      if (response.ok) {
        const pageData: PageContent = await response.json();
        setContent(pageData.content);
      } else {
        throw new Error('Failed to fetch page content');
      }
    } catch (error) {
      console.error('Error fetching page content:', error);
      alert('Error loading page content');
    }
  }

  const handleContentSave = async () => {
    try {
      if (isCreatingNew) {
        if (!newPageId || !newPageName || !content) {
          alert('Please fill in all fields');
          return;
        }

        const createResponse = await fetch('http://localhost:5000/api/admin/pages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: newPageId,
            name: newPageName,
            content: content,
          }),
        });

        if (!createResponse.ok) {
          if (createResponse.headers.get("content-type")?.includes("application/json")) {
            const errorData = await createResponse.json();
            throw new Error(errorData.message);
          }
          throw new Error(`Server error: ${createResponse.status}`);
        }

        // Refresh page list
        const pagesResponse = await fetch('/api/admin/pages');
        if (pagesResponse.ok) {
          const data = await pagesResponse.json();
          setPages(data);
        }

        setIsCreatingNew(false);
        setNewPageId('');
        setNewPageName('');
        alert('New page created successfully!');
        setTimeout(() => window.location.reload(), 1000);

      } else {
        if (!selectedPage || !content) return;

        const updateResponse = await fetch(`http://localhost:5000/api/admin/pages/${selectedPage}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: content
          }),
        });

        if (!updateResponse.ok) {
          if (updateResponse.headers.get("content-type")?.includes("application/json")) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.message);
          }
          throw new Error(`Server error: ${updateResponse.status}`);
        }

        alert('Content saved successfully!');
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      console.error('Error saving content:', error);
      alert(error instanceof Error ? error.message : 'Error saving content');
    }
  }

  if (loading) return <Loading />

  return (
    <div className="min-h-screen bg-gray-100">
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
        {activeTab === 'pages' && (
        <>
          <div>
            <h2 className="text-xl font-semibold mb-4">Edit Page</h2>
            <select 
              className="w-full p-2 border rounded mb-4"
              value={isCreatingNew ? 'new' : selectedPage}
              onChange={(e) => handlePageSelect(e.target.value)}
            >
              <option value="">Select a page to edit</option>

              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
              <option value="new">+ Create New Page</option>
            </select>

            {isCreatingNew && (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page ID
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={newPageId}
                    onChange={(e) => setNewPageId(e.target.value)}
                    placeholder="e.g., about-us"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                    placeholder="e.g., About Us"
                  />
                </div>
              </div>
            )}
          </div>

          {(selectedPage || isCreatingNew) && (
            <div>
              <Editor
                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                value={content}
                onEditorChange={(content: string) => setContent(content)}
                init={{
                  height: 500,
                  menubar: false,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'fontsize',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | blocks | ' +
                    'bold italic forecolor fontsizeselect | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'removeformat | image media table | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                }}
              />
              <button
                onClick={handleContentSave}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                {isCreatingNew ? 'Create Page' : 'Save Changes'}
              </button>
            </div>
          )}
          </>
        )}
          {activeTab === 'staff' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Edit Staff</h2>
            {!selectedPage && (
              <div className="flex flex-col space-y-4">
                {}
                <button
                  onClick={() => setSelectedPage('staff')}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Add Staff Member
                </button>

                {}
                <button
                  onClick={() => {
                    // TODO: Add functionality for editing existing staff
                    alert('Edit Existing Staff functionality is not implemented yet.');
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Edit Existing Staff
                </button>
              </div>
            )}

            {selectedPage === 'staff' && (
              <div>
                <button
                  onClick={() => setSelectedPage('')}
                  className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300 mb-4"
                >
                  Back to Edit Staff
                </button>

                <StaffPage />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  /</div>
  )
}

export default Dashboard;