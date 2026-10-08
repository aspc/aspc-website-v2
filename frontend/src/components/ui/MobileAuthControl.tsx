'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { User as UserIcon } from 'lucide-react';
import { User } from '@/types';

type MobileAuthControlProps = {
    user: User | null;
    /** Closes the account menu whenever the nav sidebar takes over the screen. */
    sidebarOpen: boolean;
    onLogin: () => void;
    onLogout: () => void;
};

/**
 * Login entry point and login status for small screens, living in the header
 * bar itself so neither one is buried behind the hamburger menu. The header
 * decides when to render it; the desktop nav shows both on its own.
 */
const MobileAuthControl = ({
    user,
    sidebarOpen,
    onLogin,
    onLogout,
}: MobileAuthControlProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (sidebarOpen) {
            setIsMenuOpen(false);
        }
    }, [sidebarOpen]);

    useEffect(() => {
        if (!isMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMenuOpen]);

    if (!user) {
        return (
            <button
                onClick={onLogin}
                className="shrink-0 h-9 px-3 rounded-md bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600"
            >
                Log in
            </button>
        );
    }

    const menuItemClasses =
        'block w-full text-left px-4 py-3 text-sm hover:bg-slate-50';

    return (
        <div ref={containerRef} className="shrink-0 relative">
            <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                aria-label="Account menu, logged in"
            >
                <span className="relative block">
                    <UserIcon className="h-6 w-6" aria-hidden="true" />
                    {/* Anchored to the icon, not the button, so it reads as a
                        badge on the figure rather than a dot floating in the
                        corner of the tap target. */}
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 ring-2 ring-blue-900" />
                </span>
            </button>

            {isMenuOpen && (
                <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-lg bg-white text-slate-900 shadow-lg ring-1 ring-black/5"
                >
                    <div className="px-4 py-3">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                            <span className="truncate">
                                {user.firstName} {user.lastName}
                            </span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                            {user.email}
                        </p>
                    </div>

                    <div className="h-px bg-slate-200" />

                    {user.isAdmin && (
                        <Link
                            href="/dashboard"
                            role="menuitem"
                            className={menuItemClasses}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Dashboard
                        </Link>
                    )}

                    <button
                        role="menuitem"
                        onClick={() => {
                            setIsMenuOpen(false);
                            onLogout();
                        }}
                        className={`${menuItemClasses} text-red-600 hover:bg-red-50`}
                    >
                        Log out
                    </button>
                </div>
            )}
        </div>
    );
};

export default MobileAuthControl;
