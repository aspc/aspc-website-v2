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
    const { user, loading, logout } = useAuth();
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
            <header className="bg-blue-900 shadow text-white">
                <div className="px-4 lg:px-16">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center">
                                <Image
                                    src="/logo4.png"
                                    alt="ASPC Logo"
                                    width={50}
                                    height={50}
                                    className="ml-2"
                                />
                            </Link>
                        </div>

                        {/* Desktop Navigation */}

                        {/* ASPC*/}
                        <nav className="hidden md:flex items-center space-x-6">
                            <div className="relative dropdown-container">
                                <button
                                    className="flex items-center space-x-1 hover:text-blue-500"
                                    onClick={() => handleDropdownClick("aspc")}
                                >
                                    <span>ASPC</span>
                                </button>

                                {/* ASPC Static Pages Dropdown */}
                                {openDropdown === "aspc" && (
                                    <div className="absolute top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
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
                                    <div className="absolute top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
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

                            {/* Courses */}
                            <Link
                                href="/courses"
                                className="hover:text-blue-500"
                            >
                                Courses
                            </Link>

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
                                        onClick={logout}
                                        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => router.push("/login")}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                                >
                                    Sign In
                                </button>
                            )}
                        </nav>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2"
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
                <div className="fixed inset-0 bg-blue-900 z-50 md:hidden">
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
                                    onClick={() => handleDropdownClick("aspc")}
                                >
                                    <span>ASPC</span>
                                </button>

                                {openDropdown === "aspc" && (
                                    <div className="ml-2 mt-2">
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
                                        logout();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 w-fit"
                                >
                                    Logout
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        router.push("/login");
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 w-fit"
                                >
                                    Sign In
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
