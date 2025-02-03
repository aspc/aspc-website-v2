"use client";

import { useState, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { PageContent } from "@/types";
import Loading from "@/components/Loading";

const PageDashboard = () => {
    const [pages, setPages] = useState<PageContent[]>([]);
    const [selectedPage, setSelectedPage] = useState<string>("");
    const [content, setContent] = useState<string>("");
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newPageId, setNewPageId] = useState("");
    const [newPageName, setNewPageName] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchPages = async () => {
            try {
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/admin/pages`
                );
                if (response.ok) {
                    const data = await response.json();
                    setPages(data);
                }
            } catch (error) {
                console.error("Error fetching pages:", error);
            }
        };

        fetchPages();
    }, []);

    const handlePageSelect = async (pageId: string) => {
        if (pageId === "new") {
            setIsCreatingNew(true);
            setContent("<p>Add your content here...</p>");
            setSelectedPage("");
            return;
        }

        setIsCreatingNew(false);
        setSelectedPage(pageId);

        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/pages/${pageId}`
            );

            if (response.ok) {
                const pageData: PageContent = await response.json();
                setContent(pageData.content);
            } else {
                throw new Error("Failed to fetch page content");
            }
        } catch (error) {
            console.error("Error fetching page content:", error);
            alert("Error loading page content");
        }
    };

    const handleContentSave = async () => {
        try {
            if (isCreatingNew) {
                if (!newPageId || !newPageName || !content) {
                    alert("Please fill in all fields");
                    return;
                }

                const createResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/admin/pages`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            id: newPageId,
                            name: newPageName,
                            content: content,
                        }),
                    }
                );

                if (!createResponse.ok) {
                    if (
                        createResponse.headers
                            .get("content-type")
                            ?.includes("application/json")
                    ) {
                        const errorData = await createResponse.json();
                        throw new Error(errorData.message);
                    }
                    throw new Error(`Server error: ${createResponse.status}`);
                }

                // Refresh page list
                const pagesResponse = await fetch("/api/admin/pages");
                if (pagesResponse.ok) {
                    const data = await pagesResponse.json();
                    setPages(data);
                }

                setIsCreatingNew(false);
                setNewPageId("");
                setNewPageName("");
                alert("New page created successfully!");
                setTimeout(() => window.location.reload(), 1000);
            } else {
                if (!selectedPage || !content) return;

                const updateResponse = await fetch(
                    `${process.env.BACKEND_LINK}/api/admin/pages/${selectedPage}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            content: content,
                        }),
                    }
                );

                if (!updateResponse.ok) {
                    if (
                        updateResponse.headers
                            .get("content-type")
                            ?.includes("application/json")
                    ) {
                        const errorData = await updateResponse.json();
                        throw new Error(errorData.message);
                    }
                    throw new Error(`Server error: ${updateResponse.status}`);
                }

                alert("Content saved successfully!");
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error) {
            console.error("Error saving content:", error);
            alert(
                error instanceof Error ? error.message : "Error saving content"
            );
        }
    };

    const handlePageDelete = async () => {
        if (!selectedPage) return;

        const confirmDelete = window.confirm(
            "Are you sure you want to delete this page?"
        );
        if (!confirmDelete) return;

        try {
            setLoading(true);

            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/admin/pages/${selectedPage}`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete the page");
            }

            alert("Page deleted successfully!");
            setPages(pages.filter((page) => page.id !== selectedPage));
            setSelectedPage("");
            setContent("");
        } catch (error) {
            console.error("Error deleting page:", error);
            alert("Error deleting page");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold mb-4">Edit Page</h2>
                <select
                    className="w-full p-2 border rounded mb-4"
                    value={isCreatingNew ? "new" : selectedPage}
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
                                required
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
                                required
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
                        onEditorChange={(content: string) =>
                            setContent(content)
                        }
                        init={{
                            height: 500,
                            menubar: false,
                            plugins: [
                                "advlist",
                                "autolink",
                                "lists",
                                "link",
                                "image",
                                "charmap",
                                "preview",
                                "anchor",
                                "searchreplace",
                                "visualblocks",
                                "code",
                                "fullscreen",
                                "insertdatetime",
                                "media",
                                "table",
                                "code",
                                "help",
                                "wordcount",
                            ],
                            toolbar:
                                "undo redo | blocks | " +
                                "bold italic forecolor  | alignleft aligncenter " +
                                "alignright alignjustify | bullist numlist outdent indent | " +
                                "removeformat | image media table | help",
                            content_style:
                                "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
                        }}
                    />
                    <div className="flex">
                        <button
                            onClick={handleContentSave}
                            disabled={loading}
                            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed mr-2"
                        >
                            {isCreatingNew ? "Create Page" : "Save Changes"}
                        </button>
                        {/* Delete button */}
                        {selectedPage && (
                            <div>
                                <button
                                    onClick={handlePageDelete}
                                    disabled={loading}
                                    className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
                                >
                                    Delete Page
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PageDashboard;
