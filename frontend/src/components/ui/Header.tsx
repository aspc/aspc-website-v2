'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Loading from '@/components/Loading';
import { useAuth } from '@/hooks/useAuth';
import { PageContent } from '@/types';
import Image from 'next/image';
import { Button } from './Button';

const groups: string[] = ['Senate', 'Staff', 'CollegeStaff', 'Software'];

type NavLink = { label: string; href: string };

type NavSubmenu = {
    label: string;
    links: NavLink[];
    pagesKey?: keyof typeof EMPTY_PAGES_MAP;
};

type NavSectionConfig = {
    label: string;
    key: string;
    pagesKey?: keyof typeof EMPTY_PAGES_MAP;
    extraLinks?: NavLink[];
    submenu?: NavSubmenu;
};

const EMPTY_PAGES_MAP = {
    about: [] as PageContent[],
    members: [] as PageContent[],
    resources: [] as PageContent[],
    press: [] as PageContent[],
};

const NAV_SECTIONS: NavSectionConfig[] = [
    {
        label: 'About',
        key: 'about',
        pagesKey: 'about',
        extraLinks: [
            { label: 'SCS Internship', href: '/pages/about/scsabout' },
        ],
        submenu: {
            label: 'Officers',
            links: groups.map((g) => ({
                label: g.replace(/([a-z])([A-Z])/g, '$1 $2'),
                href: `/staff/${g}`,
            })),
            pagesKey: 'members',
        },
    },
    {
        label: 'Reviews',
        key: 'reviews',
        extraLinks: [
            { label: 'Course Reviews', href: '/campus/courses' },
            { label: 'Instructor Reviews', href: '/campus/instructors' },
            { label: 'Housing Reviews', href: '/campus/housing' },
            { label: 'Event Reviews', href: '/open-forum' },
        ],
    },
    {
        label: 'Resources',
        key: 'resources',
        pagesKey: 'resources',
    },
    {
        label: 'Press Room',
        key: 'press',
        pagesKey: 'press',
    },
];

type NavSectionProps = {
    section: NavSectionConfig;
    mode: 'desktop' | 'mobile';
    pagesMap: Record<string, PageContent[]>;
    loadingPages: boolean;
    openDropdown: string | null;
    openSubmenu: string | null;
    onToggleDropdown: (key: string) => void;
    onSetSubmenu: (key: string | null) => void;
    onClose: () => void;
};

const dropdownIdFor = (sectionKey: string, mode: 'desktop' | 'mobile') =>
    mode === 'desktop' ? sectionKey : `${sectionKey}-mobile`;

const submenuIdFor = (sectionKey: string, mode: 'desktop' | 'mobile') =>
    mode === 'desktop'
        ? `${sectionKey}-submenu`
        : `${sectionKey}-submenu-mobile`;

const PageLink = ({
    page,
    section,
    mode,
    onClick,
}: {
    page: PageContent;
    section: string;
    mode: 'desktop' | 'mobile';
    onClick: () => void;
}) => (
    <Link
        href={
            page.link ? page.link : `/pages/${section.toLowerCase()}/${page.id}`
        }
        target={page.link && page.link.startsWith('http') ? '_blank' : '_self'}
        className={
            mode === 'desktop'
                ? 'block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0'
                : 'block px-4 py-2 hover:text-yellow-400'
        }
        onClick={onClick}
    >
        {page.name}
    </Link>
);

const NavSection: React.FC<NavSectionProps> = ({
    section,
    mode,
    pagesMap,
    loadingPages,
    openDropdown,
    openSubmenu,
    onToggleDropdown,
    onSetSubmenu,
    onClose,
}) => {
    const dropdownId = dropdownIdFor(section.key, mode);
    const submenuId = section.submenu ? submenuIdFor(section.key, mode) : null;
    const isOpen = openDropdown === dropdownId;
    const isSubmenuOpen = submenuId !== null && openSubmenu === submenuId;
    const pages = section.pagesKey ? pagesMap[section.pagesKey] || [] : [];
    const submenuPages =
        section.submenu?.pagesKey && pagesMap[section.submenu.pagesKey]
            ? pagesMap[section.submenu.pagesKey]
            : [];

    const desktopPanelClass =
        'absolute top-full mt-2 w-44 bg-white rounded-md shadow-lg py-1 z-50';
    const mobilePanelClass = 'ml-2 mt-2';
    const desktopLinkClass =
        'block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0';
    const mobileLinkClass = 'block px-4 py-2 hover:text-yellow-400';
    const linkClass = mode === 'desktop' ? desktopLinkClass : mobileLinkClass;

    const handleLinkClick = () => {
        if (mode === 'mobile') {
            onClose();
        } else {
            onToggleDropdown(dropdownId);
            onSetSubmenu(null);
        }
    };

    return (
        <div className="relative dropdown-container">
            <button
                className={
                    mode === 'desktop'
                        ? 'flex items-center space-x-1 hover:text-blue-500'
                        : 'text-lg flex items-center space-x-1'
                }
                onClick={() => onToggleDropdown(dropdownId)}
            >
                <span>{section.label}</span>
            </button>

            {isOpen && (
                <div
                    className={
                        mode === 'desktop'
                            ? desktopPanelClass
                            : mobilePanelClass
                    }
                >
                    {section.pagesKey &&
                        (loadingPages ? (
                            <div
                                className={
                                    mode === 'desktop'
                                        ? 'px-4 py-2 text-gray-700'
                                        : 'px-4 py-2'
                                }
                            >
                                Loading pages...
                            </div>
                        ) : (
                            pages.map((page) => (
                                <PageLink
                                    key={page.id}
                                    page={page}
                                    section={section.pagesKey as string}
                                    mode={mode}
                                    onClick={handleLinkClick}
                                />
                            ))
                        ))}

                    {section.extraLinks?.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={linkClass}
                            onClick={handleLinkClick}
                        >
                            {link.label}
                        </Link>
                    ))}

                    {section.submenu && submenuId && (
                        <div
                            className="relative"
                            onMouseEnter={
                                mode === 'desktop'
                                    ? () => onSetSubmenu(submenuId)
                                    : undefined
                            }
                            onMouseLeave={
                                mode === 'desktop'
                                    ? () => onSetSubmenu(null)
                                    : undefined
                            }
                        >
                            {mode === 'desktop' ? (
                                <div className="flex items-center justify-between px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-t border-gray-200 mt-1 pt-1">
                                    <span>{section.submenu.label}</span>
                                    <span className="text-gray-400">›</span>
                                </div>
                            ) : (
                                <button
                                    className="text-base flex items-center justify-between w-full px-4 py-2 hover:text-yellow-400"
                                    onClick={() =>
                                        onSetSubmenu(
                                            isSubmenuOpen ? null : submenuId
                                        )
                                    }
                                >
                                    <span>{section.submenu.label}</span>
                                    <span className="text-gray-400">
                                        {isSubmenuOpen ? '▼' : '▶'}
                                    </span>
                                </button>
                            )}

                            {isSubmenuOpen && (
                                <div
                                    className={
                                        mode === 'desktop'
                                            ? 'absolute left-full top-0 ml-1 w-44 bg-white rounded-md shadow-lg py-1 z-50'
                                            : 'ml-4 mt-1'
                                    }
                                >
                                    {section.submenu.links.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className={linkClass}
                                            onClick={handleLinkClick}
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                    {submenuPages.map((page) => (
                                        <PageLink
                                            key={page.id}
                                            page={page}
                                            section={
                                                section.submenu!
                                                    .pagesKey as string
                                            }
                                            mode={mode}
                                            onClick={handleLinkClick}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const Header = () => {
    const { user, loading } = useAuth();
    const [pagesMap, setPagesMap] =
        useState<Record<string, PageContent[]>>(EMPTY_PAGES_MAP);

    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
    const [loadingPages, setLoadingPages] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showElectionButton, setShowElectionButton] = useState(false);

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

    useEffect(() => {
        const fetchElection = async () => {
            try {
                const backendLink = process.env.BACKEND_LINK;
                const electionRes = await fetch(
                    `${backendLink}/api/voting/election`,
                    {
                        credentials: 'include',
                    }
                );

                if (!electionRes.ok) {
                    setShowElectionButton(false);
                    return;
                }

                const data = await electionRes.json();
                const now = new Date();
                const startDate = new Date(data.startDate);
                const endDate = new Date(data.endDate);

                if (startDate <= now && endDate > now) {
                    setShowElectionButton(true);
                } else {
                    setShowElectionButton(false);
                }
            } catch (error) {
                console.error('Error fetching election:', error);
                setShowElectionButton(false);
            }
        };

        fetchElection();
    }, []);

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
