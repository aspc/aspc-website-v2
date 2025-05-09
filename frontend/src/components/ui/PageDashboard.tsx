'use client';

import { useState, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { PageContent } from '@/types';
import Loading from '@/components/Loading';

const PageDashboard = () => {
    const [linkPages, setLinkPages] = useState<PageContent[]>([]);
    const [staticPages, setStaticPages] = useState<PageContent[]>([]);
    const [selectedStaticPage, setSelectedStaticPage] = useState<string>('');
    const [selectedLinkPage, setSelectedLinkPage] = useState<string>('');
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [pageId, setPageId] = useState('');
    const [pageName, setPageName] = useState('');
    const [pageLink, setPageLink] = useState('');
    const [content, setContent] = useState<string>('');
    const [pageType, setPageType] = useState<'content' | 'link'>('content');
    const [pageSection, setPageSection] = useState<string>('about');
    const [loading, setLoading] = useState(false);

    // Available page sections
    const pageSections = [
        'about',
        'members',
        'resources',
        'press',
        'scs'
    ];

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
        setPageType('content');
        setPageSection('about');
    };

    const handleNewPage = () => {
        setIsCreatingNew(true);
        setSelectedStaticPage('');
        setSelectedLinkPage('');
        resetForm();
    };

    const handleEditPage = () => {
        setIsCreatingNew(false);
        setSelectedStaticPage('');
        setSelectedLinkPage('');
        resetForm();
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

    const handleStaticPageSelect = async (pageId: string) => {
        if (!pageId) {
            setSelectedStaticPage('');
            return;
        }

        setSelectedStaticPage(pageId);
        setSelectedLinkPage('');
        setIsCreatingNew(false);

        try {
            setLoading(true);
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/pages/${pageId}`
            );

            if (response.ok) {
                const pageData: PageContent = await response.json();
                setPageId(pageData.id);
                setPageName(pageData.name);
                setContent(pageData.content || '');
                setPageType('content');
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

    const handleLinkPageSelect = async (pageId: string) => {
        if (!pageId) {
            setSelectedLinkPage('');
            return;
        }

        setSelectedLinkPage(pageId);
        setSelectedStaticPage('');
        setIsCreatingNew(false);

        try {
            setLoading(true);
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/pages/${pageId}`
            );

            if (response.ok) {
                const pageData: PageContent = await response.json();
                setPageId(pageData.id);
                setPageName(pageData.name);
                setPageLink(pageData.link || '');
                setPageType('link');
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
                const pageIdToUpdate = selectedStaticPage || selectedLinkPage;

                const updateResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/admin/pages/${pageIdToUpdate}`,
                    {
                        method: 'PUT',
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
            setSelectedStaticPage('');
            setSelectedLinkPage('');
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
        const pageIdToDelete = selectedStaticPage || selectedLinkPage;
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
                }
            );

            if (!response.ok) {
                throw new Error('Failed to delete the page');
            }

            alert('Page deleted successfully!');

            // RESET STATE AFTER SUCCESSFUL DELETION
            setIsCreatingNew(false);
            setSelectedStaticPage('');
            setSelectedLinkPage('');
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

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Page Management</h1>
                {!isCreatingNew && (
                    <button
                        onClick={handleNewPage}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                    >
                        Add New Page
                    </button>
                )}
                {isCreatingNew && (
                    <button
                        onClick={handleEditPage}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                    >
                        Back
                    </button>
                )}
            </div>

            {!isCreatingNew && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Static Pages Section */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">
                            Content Pages
                        </h2>
                        <select
                            className="w-full p-2 border rounded mb-4"
                            value={selectedStaticPage}
                            onChange={(e) =>
                                handleStaticPageSelect(e.target.value)
                            }
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
                    </div>

                    {/* Link Pages Section */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">
                            Link Pages
                        </h2>
                        <select
                            className="w-full p-2 border rounded mb-4"
                            value={selectedLinkPage}
                            onChange={(e) =>
                                handleLinkPageSelect(e.target.value)
                            }
                        >
                            <option value="">Select a link page to edit</option>
                            {linkPages.map((page) => (
                                <option key={page.id} value={page.id}>
                                    {page.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Edit Form */}
            {(isCreatingNew || selectedStaticPage || selectedLinkPage) && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">
                        {isCreatingNew ? 'Create New Page' : 'Edit Page'}
                    </h2>

                    <div className="space-y-4">
                        {/* Page Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Page Section
                            </label>
                            <select
                                className="w-full p-2 border rounded"
                                value={pageSection}
                                onChange={(e) => setPageSection(e.target.value)}
                            >
                                {pageSections.map((section) => (
                                    <option key={section} value={section}>
                                        {section.charAt(0).toUpperCase() +
                                            section.slice(1)}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-sm text-gray-500">
                                This page will be displayed under the{' '}
                                {pageSection.charAt(0).toUpperCase() +
                                    pageSection.slice(1)}{' '}
                                section
                            </p>
                        </div>

                        {/* Page Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Page Name
                            </label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                value={pageName}
                                onChange={(e) => setPageName(e.target.value)}
                                placeholder="e.g., About Us"
                                required
                            />
                        </div>

                        {/* Page Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Page Type
                            </label>
                            <div className="flex space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setPageType('content')}
                                    className={`px-4 py-2 rounded-md ${
                                        pageType === 'content'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-700'
                                    }`}
                                    disabled={
                                        pageType === 'link' && !isCreatingNew
                                    }
                                >
                                    Content Page
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPageType('link')}
                                    className={`px-4 py-2 rounded-md ${
                                        pageType === 'link'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-700'
                                    }`}
                                    disabled={
                                        pageType === 'content' && !isCreatingNew
                                    }
                                >
                                    Link Page
                                </button>
                            </div>
                        </div>

                        {/* Page ID - only visible for content pages */}
                        {pageType === 'content' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Page ID
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded"
                                    value={pageId}
                                    onChange={(e) => setPageId(e.target.value)}
                                    placeholder="e.g., about-us"
                                    required
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    This will be used in the URL: /pages/
                                    {pageSection}/{pageId}
                                </p>
                            </div>
                        )}

                        {/* Page Content or Link based on type */}
                        {pageType === 'link' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    External/Internal Link URL
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded"
                                    value={pageLink}
                                    onChange={(e) =>
                                        setPageLink(e.target.value)
                                    }
                                    placeholder="e.g., https://example.com or /internal-path"
                                    required
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Page Content
                                </label>
                                <Editor
                                    apiKey={
                                        process.env.NEXT_PUBLIC_TINYMCE_API_KEY
                                    }
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

                        {/* Action Buttons */}
                        <div className="flex space-x-4 mt-6">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:bg-blue-300 disabled:cursor-not-allowed"
                            >
                                {isCreatingNew ? 'Create Page' : 'Save Changes'}
                            </button>

                            {!isCreatingNew && (
                                <button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md disabled:bg-red-300 disabled:cursor-not-allowed"
                                >
                                    Delete Page
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setIsCreatingNew(false);
                                    setSelectedStaticPage('');
                                    setSelectedLinkPage('');
                                    resetForm();
                                }}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PageDashboard;
