"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import { useAuth } from "@/hooks/useAuth";
import { PageContent } from "@/types";
import Image from "next/image";

const groups: string[] = [
    "Senate",
    "Finance",
    "StudentAffairs",
    "AcademicAffairs",
    "Software",
];

const Header = () => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [pages, setPages] = useState<PageContent[]>([]);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [loadingPages, setLoadingPages] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const fetchPages = async () => {
            try {
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/admin/pages`
                );
                const data: PageContent[] = await response.json();
                setPages(data);
            } catch (error) {
                console.error("Error fetching pages:", error);
            } finally {
                setLoadingPages(false);
            }
        };

        fetchPages();
    }, []);

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
                            <Link href="/" className="flex items-center space-x-2 group">
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

                            {/* ASPC */}    
                            <div className="relative dropdown-container">
                                <button
                                    className="flex items-center space-x-1 hover:text-blue-500"
                                    onClick={() => handleDropdownClick("About")}
                                >
                                    <span>About</span>
                                </button>

                                {/* ASPC Static Pages Dropdown */}
                                {openDropdown === "About" && (
                                    <div className="absolute top-full mt-2 w-44 bg-white rounded-md shadow-lg py-1 z-50">
                                        <Link
                                            href="https://docs.google.com/document/d/1usryOaKsIwZ6kABFcaYK5ub0TJSku4WBuoKj70OpNw4/edit?tab=t.0"
                                            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                                        >
                                            Chirp Guide
                                        </Link>
                                        {loadingPages ? (
                                            <div className="px-4 py-2 text-gray-700">
                                                Loading pages...
                                            </div>
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

                            {/* Members */}
                            <div className="relative dropdown-container">
                                <button
                                    className="flex items-center space-x-1 hover:text-blue-500"
                                    onClick={() => handleDropdownClick("staff")}
                                >
                                    <span>Members</span>
                                </button>

                                {/* ASPC Goups Dropdown */}
                                {openDropdown === "staff" && (
                                    <div className="absolute top-full mt-2 w-44 bg-white rounded-md shadow-lg py-1 z-50">
                                        {groups.map((group, index) => (
                                            <Link
                                                key={index}
                                                href={`/staff/${group}`}
                                                className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                                            >
                                                {group.replace(
                                                    /([a-z])([A-Z])/g,
                                                    "$1 $2"
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Campus */}
                            <Link
                                href="/campus"
                                className="hover:text-blue-500"
                            >
                                Campus
                            </Link>

                            {/* courses */}
                            <div className="relative dropdown-container">
                                <button
                                    className="flex items-center space-x-1 hover:text-blue-500"
                                    onClick={() => handleDropdownClick("courses")}
                                >
                                    <span>Courses</span>
                                </button>

                                {/* courses Dropdown */}
                                {openDropdown === "courses" && (
                                    <div className="absolute top-full mt-2 w-44 bg-white rounded-md shadow-lg py-1 z-50">
                                        <Link
                                            href="https://hyperschedule.io" target="_blank"
                                            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                                        >
                                            Course Planner
                                        </Link>
                                        <Link
                                            href="/campus/course-reviews"
                                            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                                        >
                                            Course Reviews
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
                                        onClick={() => window.location.href = `${process.env.BACKEND_LINK}/api/auth/logout/saml`}
                                        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => window.location.href = `${process.env.BACKEND_LINK}/api/auth/login/saml`}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                                >
                                    Login
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
                        {/* Mobile Menu Header */}
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center">
                                <Image
                                    src="/logo4.png"
                                    alt="ASPC Logo"
                                    width={50}
                                    height={50}
                                    className="ml-2"
                                />
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-white p-2"
                            >
                                <h1 className="text-2xl">X</h1>
                            </button>
                        </div>

                        {/* Mobile Menu Links */}
                        <nav className="flex flex-col p-4 space-y-6 text-white">
                            
                            {/* ASPC dropdown */}
                            <div className="relative dropdown-container">
                                <button
                                    className="text-lg flex items-center space-x-1"
                                    onClick={() => handleDropdownClick("About")}
                                >
                                    <span>About</span>
                                </button>

                                {openDropdown === "About" && (
                                    <div className="ml-2 mt-2">
                                        <Link
                                            href="https://docs.google.com/document/d/1usryOaKsIwZ6kABFcaYK5ub0TJSku4WBuoKj70OpNw4/edit?tab=t.0"
                                            className="block px-4 py-2 hover:text-yellow-400"
                                        >
                                            Chirp Guide
                                        </Link>
                                        {loadingPages ? (
                                            <div className="px-4 py-2">
                                                Loading pages...
                                            </div>
                                        ) : (
                                            pages.map((page: PageContent) => (
                                                <Link
                                                    key={page.id}
                                                    href={`/aspc/${page.id}`}
                                                    className="block px-4 py-2 hover:text-yellow-400"
                                                    onClick={() =>
                                                        setIsMobileMenuOpen(
                                                            false
                                                        )
                                                    }
                                                >
                                                    {page.name}
                                                </Link>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Members dropdown */}
                            <div className="relative dropdown-container">
                                <button
                                    className="text-lg flex items-center space-x-1"
                                    onClick={() => handleDropdownClick("staff")}
                                >
                                    <span>Members</span>
                                </button>

                                {openDropdown === "staff" && (
                                    <div className="ml-2 mt-2">
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
                                    </div>
                                )}
                            </div>
                            <Link
                                href="/campus"
                                className="text-lg"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Campus
                            </Link>
                            <Link
                                href="/courses"
                                className="text-lg"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Courses
                            </Link>
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
