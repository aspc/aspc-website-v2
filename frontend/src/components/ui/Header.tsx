"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Loading from "@/components/Loading";
import { useAuth } from "@/hooks/useAuth";
import { PageContent } from "@/types";
import Image from "next/image";

const groups: string[] = ["Senate", "Staff", "CollegeStaff", "Software"];

const Header = () => {
    const { user, loading } = useAuth();
    const [pagesMap, setPagesMap] = useState<Record<string, PageContent[]>>({
        about: [],
        members: [],
        resources: [],
        pressroom: [],
        elections: [], // DELETE AFTER ELECTIONS
    });
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [loadingPages, setLoadingPages] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const fetchPages = async () => {
            try {
                setLoadingPages(true);
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/admin/pages`
                );
                let data: PageContent[] = await response.json();
                if(!user){
                    data = data.filter(page => page.name !== "Budget");
                }

                // Organize pages by header/section
                const pagesByHeader: Record<string, PageContent[]> = {
                    about: [],
                    members: [],
                    resources: [],
                    pressroom: [],
                    elections: [], // DELETE AFTER ELECTIONS
                };

                data.forEach((page) => {
                    // Convert header to lowercase to match our section keys
                    const headerKey = page.header.toLowerCase();

                    // Check if this header exists in our map, if not create it
                    if (!pagesByHeader[headerKey]) {
                        pagesByHeader[headerKey] = [];
                    }
                    pagesByHeader[headerKey].push(page);
                });

                setPagesMap(pagesByHeader);
            } catch (error) {
                console.error("Error fetching pages:", error);
            } finally {
                setLoadingPages(false);
            }
        };

        fetchPages();
    }, [user]);

    const handleDropdownClick = (dropdownName: string) => {
        setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                openDropdown &&
                !(event.target as Element).closest(".dropdown-container")
            ) {
                setOpenDropdown(null);
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [openDropdown]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isMobileMenuOpen]);

    // Helper function to render links for a section
    const renderSectionLinks = (section: string, closeMenuOnClick = false) => {
        const pages = pagesMap[section.toLowerCase()] || [];

        return (
            <>
                {loadingPages ? (
                    <div className="px-4 py-2 text-gray-700">
                        Loading pages...
                    </div>
                ) : (
                    pages.map((page) => (
                        // If page has a link property, use that URL, otherwise use /pages/section/pageId
                        <Link
                            key={page.id}
                            href={
                                page.link
                                    ? page.link
                                    : `/pages/${section.toLowerCase()}/${
                                          page.id
                                      }`
                            }
                            target={
                                page.link && page.link.startsWith("http")
                                    ? "_blank"
                                    : "_self"
                            }
                            className={`block px-4 py-2 ${
                                closeMenuOnClick
                                    ? "hover:text-yellow-400"
                                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                            }`}
                            onClick={
                                closeMenuOnClick
                                    ? () => setIsMobileMenuOpen(false)
                                    : undefined
                            }
                        >
                            {page.name}
                        </Link>
                    ))
                )}
            </>
        );
    };

    if (loading) {
        return <Loading />;
    }

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
                            {/* About Section */}
                            <div className="relative dropdown-container">
                                <button
                                    className="flex items-center space-x-1 hover:text-blue-500"
                                    onClick={() => handleDropdownClick("About")}
                                >
                                    <span>About</span>
                                </button>

                                {/* About Pages Dropdown */}
                                {openDropdown === "About" && (
                                    <div className="absolute top-full mt-2 w-44 bg-white rounded-md shadow-lg py-1 z-50">
                                        {renderSectionLinks("about")}
                                    </div>
                                )}
                            </div>

                            {/* Members Section */}
                            <div className="relative dropdown-container">
                                <button
                                    className="flex items-center space-x-1 hover:text-blue-500"
                                    onClick={() =>
                                        handleDropdownClick("Members")
                                    }
                                >
                                    <span>Officers</span>
                                </button>

                                {/* Members Dropdown with ASPC Groups and Pages */}
                                {openDropdown === "Members" && (
                                    <div className="absolute top-full mt-2 w-44 bg-white rounded-md shadow-lg py-1 z-50">
                                        {/* Senate Groups */}
                                        {groups.map((group, index) => (
                                            <Link
                                                key={`group-${index}`}
                                                href={`/staff/${group}`}
                                                className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                                            >
                                                {group.replace(
                                                    /([a-z])([A-Z])/g,
                                                    "$1 $2"
                                                )}
                                            </Link>
                                        ))}

                                        {/* Member Pages */}
                                        {renderSectionLinks("members")}
                                    </div>
                                )}
                            </div>

                            {/* Elections Section DELETE AFTER ELECTIONS*/}
                            <div className="relative dropdown-container">
                                <button
                                    className="flex items-center space-x-1 hover:text-blue-500"
                                    onClick={() =>
                                        handleDropdownClick("Elections")
                                    }
                                >
                                    <span>Elections</span>
                                </button>

                                {/* Elections Pages Dropdown DELETE AFTER ELECTIONS */}
                                {openDropdown === "Elections" && (
                                    <div className="absolute top-full mt-2 w-44 bg-white rounded-md shadow-lg py-1 z-50">
                                        {/* Dynamic Election Pages */}
                                        {renderSectionLinks("elections")}
                                    </div>
                                )}
                            </div>

                            {/* Resources Section */}
                            <div className="relative dropdown-container">
                                <button
                                    className="flex items-center space-x-1 hover:text-blue-500"
                                    onClick={() =>
                                        handleDropdownClick("Resources")
                                    }
                                >
                                    <span>Resources</span>
                                </button>

                                {/* Resources Pages Dropdown */}
                                {openDropdown === "Resources" && (
                                    <div className="absolute top-full mt-2 w-44 bg-white rounded-md shadow-lg py-1 z-50">
                                        {renderSectionLinks("resources")}

                                        <Link
                                            href="/campus/course-reviews"
                                            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                                        >
                                            Course Reviews
                                        </Link>

                                        <Link
                                            href="/campus/housing"
                                            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                                        >
                                            Housing Reviews
                                        </Link>

                                        <Link
                                            href="/campus/instructor-reviews"
                                            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                                        >
                                            Instructor Reviews
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Press Room Section */}
                            <div className="relative dropdown-container">
                                <button
                                    className="flex items-center space-x-1 hover:text-blue-500"
                                    onClick={() =>
                                        handleDropdownClick("PressRoom")
                                    }
                                >
                                    <span>Press Room</span>
                                </button>

                                {/* Press Room Pages Dropdown */}
                                {openDropdown === "PressRoom" && (
                                    <div className="absolute top-full mt-2 w-44 bg-white rounded-md shadow-lg py-1 z-50">
                                        {renderSectionLinks("pressroom")}
                                    </div>
                                )}
                            </div>

                            {/* Events */}
                            <Link
                                href="/events"
                                className="hover:text-blue-500"
                            >
                                Events
                            </Link>

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
                                        onClick={() =>
                                            (window.location.href = `${process.env.BACKEND_LINK}/api/auth/logout/saml`)
                                        }
                                        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                                    >
                                        Logout SSO
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() =>
                                            (window.location.href = `${process.env.BACKEND_LINK}/api/auth/login/saml`)
                                        }
                                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                                    >
                                        Login SSO
                                    </button>
                                </>
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
                        {/* Mobile Menu Header */}
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

                        {/* Mobile Menu Links */}
                        <nav className="flex flex-col p-4 space-y-6 text-white overflow-y-auto">
                            {/* About dropdown */}
                            <div className="relative dropdown-container">
                                <button
                                    className="text-lg flex items-center space-x-1"
                                    onClick={() =>
                                        handleDropdownClick("AboutMobile")
                                    }
                                >
                                    <span>About</span>
                                </button>

                                {openDropdown === "AboutMobile" && (
                                    <div className="ml-2 mt-2">
                                        {renderSectionLinks("about", true)}
                                    </div>
                                )}
                            </div>

                            {/* Members dropdown */}
                            <div className="relative dropdown-container">
                                <button
                                    className="text-lg flex items-center space-x-1"
                                    onClick={() =>
                                        handleDropdownClick("MembersMobile")
                                    }
                                >
                                    <span>Officers</span>
                                </button>

                                {openDropdown === "MembersMobile" && (
                                    <div className="ml-2 mt-2">
                                        {/* Senate Groups */}
                                        {groups.map(
                                            (group: string, index: number) => (
                                                <Link
                                                    key={index}
                                                    href={`/staff/${group}`}
                                                    className="block px-4 py-2 hover:text-yellow-400"
                                                    onClick={() =>
                                                        setIsMobileMenuOpen(
                                                            false
                                                        )
                                                    }
                                                >
                                                    {group.replace(
                                                        /([a-z])([A-Z])/g,
                                                        "$1 $2"
                                                    )}
                                                </Link>
                                            )
                                        )}

                                        {/* Member Pages */}
                                        {renderSectionLinks("members", true)}
                                    </div>
                                )}
                            </div>

                            {/* Elections - Dynamic in Mobile View */}
                            <div className="relative dropdown-container">
                                <button
                                    className="text-lg flex items-center space-x-1"
                                    onClick={() =>
                                        handleDropdownClick("ElectionsMobile")
                                    }
                                >
                                    <span>Elections</span>
                                </button>

                                {openDropdown === "ElectionsMobile" && (
                                    <div className="ml-2 mt-2">
                                        {/* Elections links DELETE AFTER ELECTIONS */}
                                        {renderSectionLinks("elections", true)}
                                    </div>
                                )}
                            </div>

                            {/* Resources dropdown */}
                            <div className="relative dropdown-container">
                                <button
                                    className="text-lg flex items-center space-x-1"
                                    onClick={() =>
                                        handleDropdownClick("ResourcesMobile")
                                    }
                                >
                                    <span>Resources</span>
                                </button>

                                {openDropdown === "ResourcesMobile" && (
                                    <div className="ml-2 mt-2">
                                        {renderSectionLinks("resources", true)}

                                        <Link
                                            href="/campus/course-reviews"
                                            className="block px-4 py-2 hover:text-yellow-400"
                                            onClick={() =>
                                                setIsMobileMenuOpen(false)
                                            }
                                        >
                                            Course Reviews
                                        </Link>
                                        <Link
                                            href="/campus/housing"
                                            className="block px-4 py-2 hover:text-yellow-400"
                                            onClick={() =>
                                                setIsMobileMenuOpen(false)
                                            }
                                        >
                                            Housing Reviews
                                        </Link>
                                        <Link
                                            href="/campus/instructor-reviews"
                                            className="block px-4 py-2 hover:text-yellow-400"
                                            onClick={() =>
                                                setIsMobileMenuOpen(false)
                                            }
                                        >
                                            Instructor Reviews
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Press Room dropdown */}
                            <div className="relative dropdown-container">
                                <button
                                    className="text-lg flex items-center space-x-1"
                                    onClick={() =>
                                        handleDropdownClick("PressRoomMobile")
                                    }
                                >
                                    <span>Press Room</span>
                                </button>

                                {openDropdown === "PressRoomMobile" && (
                                    <div className="ml-2 mt-2">
                                        {renderSectionLinks("pressroom", true)}
                                    </div>
                                )}
                            </div>

                            <Link
                                href="/events"
                                className="text-lg"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Events
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
                                    onClick={() => {
                                        // Redirect to backend SAML logout route
                                        window.location.href = `${process.env.BACKEND_LINK}/api/auth/logout/saml`;
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 w-fit"
                                >
                                    Logout
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        // Redirect to backend SAML login route
                                        window.location.href = `${process.env.BACKEND_LINK}/api/auth/login/saml`;
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
