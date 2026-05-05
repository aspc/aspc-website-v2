'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Loading from '@/components/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useElection } from '@/hooks/useElection';
import { PageContent } from '@/types';
import Image from 'next/image';
import { Button } from './Button';
import NavSection from './NavSection';
import { EMPTY_PAGES_MAP, NAV_SECTIONS } from './navSections';

const Header = () => {
    const { user, loading } = useAuth();
    const [pagesMap, setPagesMap] =
        useState<Record<string, PageContent[]>>(EMPTY_PAGES_MAP);

    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
    const [loadingPages, setLoadingPages] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { showElection: showElectionButton } = useElection();

    useEffect(() => {
        const fetchPages = async () => {
            try {
                setLoadingPages(true);
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/admin/pages`
                );
                let data: PageContent[] = await response.json();
                if (!user) {
                    data = data.filter((page) => page.content !== null);
                }

                const pagesByHeader: Record<string, PageContent[]> = {
                    about: [],
                    members: [],
                    resources: [],
                    press: [],
                };

                data.forEach((page) => {
                    const headerKey = page.header.toLowerCase();
                    if (!pagesByHeader[headerKey]) {
                        pagesByHeader[headerKey] = [];
                    }
                    pagesByHeader[headerKey].push(page);
                });

                setPagesMap(pagesByHeader);
            } catch (error) {
                console.error('Error fetching pages:', error);
            } finally {
                setLoadingPages(false);
            }
        };

        fetchPages();
    }, [user]);

    const handleToggleDropdown = (dropdownId: string) => {
        setOpenDropdown((prev) => (prev === dropdownId ? null : dropdownId));
        setOpenSubmenu(null);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                openDropdown &&
                !(event.target as Element).closest('.dropdown-container')
            ) {
                setOpenDropdown(null);
                setOpenSubmenu(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [openDropdown]);

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    const handleLogout = () => {
        document.cookie = 'connect.sid=; max-age=0; path=/;';
        if (window.location.hostname.includes('pomonastudents.org')) {
            document.cookie =
                'connect.sid=; max-age=0; path=/; domain=.pomonastudents.org;';
        }
        window.location.href = `${process.env.BACKEND_LINK}/api/auth/logout/saml`;
    };

    const handleLogin = () => {
        window.location.href = `${process.env.BACKEND_LINK}/api/auth/login/saml`;
    };

    if (loading) {
        return <Loading />;
    }

    const navSectionProps = {
        pagesMap,
        loadingPages,
        openDropdown,
        openSubmenu,
        onToggleDropdown: handleToggleDropdown,
        onSetSubmenu: setOpenSubmenu,
    };

    return (
        <>
            {/* Desktop Header */}
            <header className="bg-blue-900 backdrop-blur-sm shadow text-white sticky top-0 left-0 w-full z-50">
                <div className="px-4 lg:px-16">
                    <div className="flex items-wrap justify-between h-16">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <Link
                                href="/"
                                className="flex items-center space-x-2 group"
                            >
                                <Image
                                    src="/logo4.png"
                                    alt="ASPC Logo"
                                    width={50}
                                    height={50}
                                    className="ml-2 transition duration-200 group-hover:opacity-80"
                                />
                                <div className="flex flex-col leading-tight text-white text-lg font-semibold whitespace-nowrap">
                                    <span className="text-white group-hover:text-blue-400 transition duration-200">
                                        Associated Students
                                    </span>
                                    <span className="text-white group-hover:text-blue-400 transition duration-200">
                                        of Pomona College
                                    </span>
                                </div>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center space-x-6">
                            {NAV_SECTIONS.map((section) => (
                                <NavSection
                                    key={section.key}
                                    section={section}
                                    mode="desktop"
                                    onClose={() => setOpenDropdown(null)}
                                    {...navSectionProps}
                                />
                            ))}

                            <Link
                                href="/events"
                                className="flex items-center space-x-1 hover:text-blue-500"
                            >
                                <span>Events</span>
                            </Link>

                            {showElectionButton && (
                                <Link href="/vote">
                                    <Button variant="ghost">VOTE HERE</Button>
                                </Link>
                            )}

                            {user ? (
                                <>
                                    {user.isAdmin && (
                                        <Link
                                            href="/dashboard"
                                            className="text-yellow-400 hover:text-blue-500"
                                        >
                                            Dashboard
                                        </Link>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleLogin}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                                >
                                    Login SSO
                                </button>
                            )}
                        </nav>

                        {/* Mobile Menu Button */}
                        <button
                            className="lg:hidden p-2"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <div className="space-y-1.5">
                                <div className="w-6 h-0.5 bg-white"></div>
                                <div className="w-6 h-0.5 bg-white"></div>
                                <div className="w-6 h-0.5 bg-white"></div>
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-blue-900 z-50 lg:hidden">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center">
                                <Link
                                    href="/"
                                    className="flex items-center space-x-2 group"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <Image
                                        src="/logo4.png"
                                        alt="ASPC Logo"
                                        width={50}
                                        height={50}
                                        className="ml-2"
                                    />
                                </Link>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-white p-2"
                            >
                                <h1 className="text-2xl">X</h1>
                            </button>
                        </div>

                        <nav className="flex flex-col p-4 space-y-6 text-white overflow-y-auto">
                            {showElectionButton && (
                                <Link
                                    href="/vote"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <Button variant="ghost" className="w-full">
                                        Vote Now
                                    </Button>
                                </Link>
                            )}

                            {NAV_SECTIONS.map((section) => (
                                <NavSection
                                    key={section.key}
                                    section={section}
                                    mode="mobile"
                                    onClose={() => setIsMobileMenuOpen(false)}
                                    {...navSectionProps}
                                />
                            ))}

                            <Link
                                href="/events"
                                className="text-lg flex items-center space-x-1 hover:text-yellow-400"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span>Events</span>
                            </Link>

                            {user?.isAdmin && (
                                <Link
                                    href="/dashboard"
                                    className="text-lg text-yellow-400"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Dashboard
                                </Link>
                            )}

                            {user ? (
                                <button
                                    onClick={handleLogout}
                                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                                >
                                    Logout
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        handleLogin();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 w-fit"
                                >
                                    Log in
                                </button>
                            )}
                        </nav>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;
