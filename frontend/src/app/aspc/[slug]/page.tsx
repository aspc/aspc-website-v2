'use client';

import React, { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import Loading from '@/components/Loading';
import { PageContent, PageProps } from '@/types';


const Page: React.FC<PageProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const [page, setPage] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/admin/pages/${resolvedParams.slug}`);
        if (!res.ok) throw new Error('Failed to fetch page');
        const data: PageContent = await res.json();
        setPage(data);
      } catch (error) {
        console.error('Error loading page:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [resolvedParams.slug]);

  if (loading) {
    return <Loading />;
  }

  if (!page) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className=" px-12">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-blue-400 p-6">
            <h1 className="text-3xl font-bold text-gray-90 text-center">{page.name}</h1>
          </div>
          <div className="p-6">
            <div 
              className="prose prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-strong:font-bold prose-ol:list-decimal prose-li:mt-2 prose-p:text-gray-600 prose-p:mb-4 max-w-none"
              dangerouslySetInnerHTML={{ __html: page.content }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;