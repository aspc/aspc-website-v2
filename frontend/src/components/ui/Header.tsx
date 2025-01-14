'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading';
import { useAuth } from '@/hooks/useAuth';
import { PageContent } from '@/types';
import Image from 'next/image';

interface HeaderProps {}

const Header: React.FC<HeaderProps> = () => {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [pages, setPages] = useState<PageContent[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/admin/pages');
        const data: PageContent[] = await response.json();
        setPages(data);
      } catch (error) {
        console.error('Error fetching pages:', error);
      } finally {
        setLoadingPages(false);
      }
    };

    fetchPages();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <header className="bg-blue-900 shadow text-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold">ASPC</span>
              <Image src="/logo4.png" alt="ASPC Logo" width={50} height={50} className="ml-2" />
            </Link>
          </div>

          <nav className="flex items-center space-x-6">
            <div className="relative">
              <button
                className="flex items-center space-x-1 hover:text-blue-500"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span>ASPC</span> 
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <Link href="/aspc/senate" className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"> About ASPC </Link>
                  {loadingPages ? (
                    <div className="px-4 py-2 text-gray-700">Loading pages...</div>
                  ) : (
                    pages.map((page) => (
                      <Link
                        key={page.id}
                        href={`/aspc/${page.id}`}
                        className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                      >
                        {page.name}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            <Link href="/campus" className="hover:text-blue-500">
              Campus
            </Link>
            <Link href="/courses" className="hover:text-blue-500">
              Courses
            </Link>
            <Link href="/events" className="hover:text-blue-500">
              Events
            </Link>

            {user ? (
              <>
                {user.isAdmin && (
                  <Link href="/dashboard" className="text-yellow-400 hover:text-blue-500">
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Sign In
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;