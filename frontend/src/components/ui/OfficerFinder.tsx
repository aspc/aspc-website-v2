'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, MessageCircle, X } from 'lucide-react';

const officerGroups = [
    { label: 'Student Senate', href: '/staff/Senate' },
    { label: 'ASPC Staff', href: '/staff/Staff' },
    { label: 'College Staff', href: '/staff/CollegeStaff' },
    { label: 'Software Team', href: '/staff/Software' },
];

export default function OfficerFinder() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end sm:bottom-8 sm:right-8">
            {isOpen && (
                <div
                    id="officer-finder-panel"
                    className="mb-3 w-[min(calc(100vw-2.5rem),20rem)] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-blue-900/10"
                >
                    <div className="bg-blue-900 px-5 py-4 text-white">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold">
                                    Hi, I&apos;m Cecil!
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-blue-100">
                                    Who are you Looking for?
                                </p>
                            </div>
                            <button
                                type="button"
                                aria-label="Close officer finder"
                                onClick={() => setIsOpen(false)}
                                className="rounded-full p-1 text-blue-100 hover:bg-white/10 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <nav aria-label="Officer groups" className="p-2">
                        {officerGroups.map((group) => (
                            <Link
                                key={group.href}
                                href={group.href}
                                onClick={() => setIsOpen(false)}
                                className="group flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-800"
                            >
                                {group.label}
                                <ArrowRight
                                    size={16}
                                    className="text-blue-400 transition-transform group-hover:translate-x-1"
                                />
                            </Link>
                        ))}
                    </nav>
                </div>
            )}

            <button
                type="button"
                aria-expanded={isOpen}
                aria-controls="officer-finder-panel"
                onClick={() => setIsOpen((open) => !open)}
                className="group flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-4 text-left shadow-xl ring-1 ring-blue-900/10 transition hover:-translate-y-0.5 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 ring-2 ring-white">
                    <Image
                        src="/cecil.jpg"
                        alt="Cecil"
                        fill
                        sizes="44px"
                    />
                </span>
                <span className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                    Find an officer
                    <MessageCircle
                        size={20}
                        className="text-blue-500 transition-transform group-hover:scale-110"
                    />
                </span>
            </button>
        </div>
    );
}
