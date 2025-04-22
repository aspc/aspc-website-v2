'use client';

import React from 'react';

export default function PagesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow p-6">{children}</div>
            </div>
        </div>
    );
}
