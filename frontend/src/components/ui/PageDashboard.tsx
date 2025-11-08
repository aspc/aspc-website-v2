'use client';

import { useState, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { PageContent } from '@/types';
import Loading from '@/components/Loading';

const PageDashboard = () => {
    const [linkPages, setLinkPages] = useState<PageContent[]>([]);
    const [staticPages, setStaticPages] = useState<PageContent[]>([]);
    const [selectedPage, setSelectedPage] = useState<string>('');
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [pageId, setPageId] = useState('');
    const [pageName, setPageName] = useState('');
    const [pageLink, setPageLink] = useState('');
    const [content, setContent] = useState<string>('');
    const [pageType, setPageType] = useState<'content' | 'link' | ''>('');
    const [pageSection, setPageSection] = useState<string>('about');
    const [loading, setLoading] = useState(false);

    const pageSections = ['about', 'members', 'resources', 'press'];

    const fetchPages = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/pages`
            );
            if (response.ok) {
                const data: PageContent[] = await response.json();
                setLinkPages(
                    data.filter((page) => page.link && page.link !== null)
                );
                setStaticPages(
                    data.filter((page) => page.content && page.content !== null)
                );
            }
        } catch (error) {
            console.error('Error fetching pages:', error);
            alert('Error fetching pages');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPages();
    }, []);

    const resetForm = () => {
        setPageId('');
        setPageName('');
        setPageLink('');
        setContent('<p>Add your content here...</p>');
        setPageSection('about');
    };

    // Update page ID when link changes for link-type pages
    useEffect(() => {
        if (pageType === 'link' && pageLink) {
            // Create a sanitized version of the link for use as ID
            // Remove http/https, special chars, and use dashes instead of spaces
            const sanitizedLink = pageLink
                .replace(/^https?:\/\//, '')
                .replace(/[^a-zA-Z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .toLowerCase();

            setPageId(sanitizedLink);
        }
    }, [pageLink, pageType]);

    const handlePageSelect = async (pageId: string) => {
        if (!pageId) {
            setSelectedPage('');
            return;
        }

        setSelectedPage(pageId);
        setIsCreatingNew(false);
        resetForm();

        try {
            setLoading(true);
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/pages/${pageId}`,
                {
                    method: 'GET',
                    credentials: 'include',
                }
            );

            if (response.ok) {
                const pageData: PageContent = await response.json();
                setPageId(pageData.id);
                setPageName(pageData.name);
                setContent(pageData.content || '');
                setPageLink(pageData.link || '');
                setPageSection(pageData.header);
            } else {
                throw new Error('Failed to fetch page content');
            }
        } catch (error) {
            console.error('Error fetching page content:', error);
            alert('Error loading page content');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Validate form
        if (
            (pageType === 'content' && !pageId) ||
            !pageName ||
            (pageType === 'link' && !pageLink) ||
            (pageType === 'content' && !content)
        ) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);

            if (isCreatingNew) {
                // Create new page
                const createResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/admin/pages`,
                    {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            id: pageId,
                            name: pageName,
                            header: pageSection,
                            content: pageType === 'content' ? content : null,
                            link: pageType === 'link' ? pageLink : null,
                            section: pageSection,
                        }),
                    }
                );

                if (!createResponse.ok) {
                    if (
                        createResponse.headers
                            .get('content-type')
                            ?.includes('application/json')
                    ) {
                        const errorData = await createResponse.json();
                        throw new Error(errorData.message);
                    }
                    throw new Error(`Server error: ${createResponse.status}`);
                }

                alert('Page created successfully!');
            } else {
                // Update existing page
                const pageIdToUpdate = selectedPage;

                const updateResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/admin/pages/${pageIdToUpdate}`,
                    {
                        method: 'PUT',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            newId: pageId,
                            name: pageName,
                            header: pageSection,
                            content: pageType === 'content' ? content : null,
                            link: pageType === 'link' ? pageLink : null,
                            section: pageSection,
                        }),
                    }
                );

                if (!updateResponse.ok) {
                    if (
                        updateResponse.headers
                            .get('content-type')
                            ?.includes('application/json')
                    ) {
                        const errorData = await updateResponse.json();
                        throw new Error(errorData.message);
                    }
                    throw new Error(`Server error: ${updateResponse.status}`);
                }

                alert('Page updated successfully!');
            }

            // RESET STATE AFTER SUCCESSFUL EDIT/CREATION
            setIsCreatingNew(false);
            setSelectedPage('');
            setPageType('');
            resetForm();
            fetchPages(); // Re-fetch the data after a successful save (to update the list)
        } catch (error) {
            console.error('Error saving page:', error);
            alert(error instanceof Error ? error.message : 'Error saving page');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        const pageIdToDelete = selectedPage;
        if (!pageIdToDelete) return;

        const confirmDelete = window.confirm(
            'Are you sure you want to delete this page?'
        );
        if (!confirmDelete) return;

        try {
            setLoading(true);

            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/pages/${pageIdToDelete}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to delete the page');
            }

            alert('Page deleted successfully!');

            // RESET STATE AFTER SUCCESSFUL DELETION
            setIsCreatingNew(false);
            setSelectedPage('');
            setPageType('');
            resetForm();
            fetchPages();
        } catch (error) {
            console.error('Error deleting page:', error);
            alert('Error deleting page');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading />;

    if (!isCreatingNew && !selectedPage) {
        return (
            <div className="bg-gray-100 p-6 lg:p-8">
                {/* Header */}
                <header className="mb-6 border-b border-gray-300 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">
                            Page Management
                        </h1>
                        <p className="text-gray-600 text-base">
                            Create and edit custom webpages
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            setIsCreatingNew(true);
                            setSelectedPage('');
                            setPageType('');
                            resetForm();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                        + Add New Page
                    </button>
                </header>

                {/* Overview Section */}
                <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-5">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        Overview
                    </h2>
                    <p className="text-gray-700 text-sm mb-3">
                        From here, you can manage all content and link pages
                    </p>

                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mb-3">
                        <li>
                            <strong>Content pages:</strong> Enter text to be
                            displayed on a static page.
                        </li>
                        <li>
                            <strong>Link pages:</strong> Link out to another
                            website.
                        </li>
                    </ul>
                </section>

                {/* Edit Events */}
                <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow transition-shadow">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        Edit Existing Page
                    </h2>
                    <p className="text-gray-600 text-sm mb-4">
                        Select an existing event to edit its details.
                    </p>

                    {/* Page Type Selection */}
                    <div className="mb-6">
                        <div className="flex space-x-4">
                            {/* Content Page Button */}
                            <button
                                type="button"
                                onClick={() => setPageType('content')}
                                className={`px-4 py-2 rounded-md font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                    pageType === 'content'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                Content Page
                            </button>

                            {/* Link Page Button */}
                            <button
                                type="button"
                                onClick={() => setPageType('link')}
                                className={`px-4 py-2 rounded-md font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                    pageType === 'link'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                Link Page
                            </button>
                        </div>
                    </div>

                    {pageType === 'content' && (
                        <select
                            className="w-full p-2 border rounded mb-4"
                            value={selectedPage}
                            onChange={(e) => handlePageSelect(e.target.value)}
                        >
                            <option value="">
                                Select a content page to edit
                            </option>
                            {staticPages.map((page) => (
                                <option key={page.id} value={page.id}>
                                    {page.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {pageType === 'link' && (
                        <select
                            className="w-full p-2 border rounded mb-4"
                            value={selectedPage}
                            onChange={(e) => handlePageSelect(e.target.value)}
                        >
                            <option value="">Select a link page to edit</option>
                            {linkPages.map((page) => (
                                <option key={page.id} value={page.id}>
                                    {page.name}
                                </option>
                            ))}
                        </select>
                    )}
                </section>
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} className="min-h-screen bg-gray-100 p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                    {selectedPage ? 'Edit Page' : 'Add New Page'}
                </h1>
                <div className="flex space-x-4 mb-6">
                    {!isCreatingNew && (
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => {
                                handleDelete();
                            }}
                            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                        >
                            Delete Page
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setIsCreatingNew(false);
                            setSelectedPage('');
                            resetForm();
                        }}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                        Back
                    </button>
                </div>
            </div>

            {/* Page Name */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Page Name
                </h2>
                <input
                    className="w-full p-4 border rounded"
                    type="text"
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                    placeholder="e.g. About Us"
                    required
                />
            </div>

            {/* Page Type */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Page Type
                </h2>
                <p className="text-sm text-gray-500 mt-2 mb-4">
                    Content pages are text-based, link pages hyperlink to an
                    external site
                </p>

                {/* Page Type Selection */}
                <div className="flex space-x-4">
                    {/* Content Page Button */}
                    <button
                        type="button"
                        onClick={() => {
                            if (isCreatingNew) {
                                setPageType('content');
                            }
                        }}
                        className={`px-4 py-2 rounded-md font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                            pageType === 'content'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        Content Page
                    </button>

                    {/* Link Page Button */}
                    <button
                        type="button"
                        onClick={() => {
                            if (isCreatingNew) {
                                setPageType('link');
                            }
                        }}
                        className={`px-4 py-2 rounded-md font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                            pageType === 'link'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        Link Page
                    </button>
                </div>
            </div>

            {/* Page Content or Link based on type */}
            {pageType === 'link' && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Link URL
                    </h2>
                    <input
                        className="w-full p-4 border rounded"
                        type="text"
                        value={pageLink}
                        onChange={(e) => setPageLink(e.target.value)}
                        placeholder="e.g., https://example.com"
                        required
                    />
                </div>
            )}

            {pageType === 'content' && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Page Content
                    </h2>
                    <Editor
                        apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                        value={content}
                        onEditorChange={(content: string) =>
                            setContent(content)
                        }
                        init={{
                            height: 500,
                            menubar: false,
                            plugins: [
                                'advlist',
                                'autolink',
                                'lists',
                                'link',
                                'image',
                                'charmap',
                                'preview',
                                'anchor',
                                'searchreplace',
                                'visualblocks',
                                'code',
                                'fullscreen',
                                'insertdatetime',
                                'media',
                                'table',
                                'code',
                                'help',
                                'wordcount',
                            ],
                            toolbar:
                                'undo redo | blocks | ' +
                                'bold italic forecolor | alignleft aligncenter ' +
                                'alignright alignjustify | bullist numlist outdent indent | ' +
                                'removeformat | image media table | help',
                            content_style:
                                'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                        }}
                    />
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Header
                </h2>
                <p className="text-sm text-gray-500 mt-2 mb-4">
                    Which header section (About, Officers, Resources, ...) do
                    you want this page under?
                </p>
                <select
                    className="w-full p-2 border rounded"
                    value={pageSection}
                    onChange={(e) => setPageSection(e.target.value)}
                >
                    {pageSections.map((section) => (
                        <option key={section} value={section}>
                            {section.charAt(0).toUpperCase() + section.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Page ID - only visible for content pages */}
            {pageType === 'content' && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Page ID
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 mb-4">
                        This will be used in the URL: /pages/
                        {pageSection}/{pageId}
                    </p>
                    <input
                        className="w-full p-4 border rounded"
                        type="text"
                        value={pageId}
                        onChange={(e) => setPageId(e.target.value)}
                        placeholder="e.g., about-us"
                        required
                    />
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={loading}
                className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 w-full disabled:bg-blue-300"
            >
                {loading
                    ? 'Saving...'
                    : selectedPage
                      ? 'Update Page'
                      : 'Add Page'}
            </button>
        </form>
    );
};

export default PageDashboard;
