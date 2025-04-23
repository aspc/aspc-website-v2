'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Loading from '@/components/Loading';
import { PageContent } from '@/types';

export default function DynamicPage() {
  const params = useParams();
  const { header, pageid } = params;

  const [pageData, setPageData] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.BACKEND_LINK}/api/admin/pages/${pageid}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch page: ${response.status}`);
        }

        const data = await response.json();
        setPageData(data);
      } catch (error) {
        console.error("Error fetching page data:", error);
        setError("Failed to load page content. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (pageid) {
      fetchPageData();
    }
  }, [pageid]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
        <p>The requested page could not be found.</p>
      </div>
    );
  }

  if (!pageData.content) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">{pageData.name}</h1>
        <p>This page is a placeholder. Please check back later for updates.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{pageData.name}</h1>

      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: pageData.content }}
      />
    </div>
  );
}
