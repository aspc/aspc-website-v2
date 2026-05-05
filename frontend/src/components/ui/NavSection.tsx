'use client';

import React from 'react';
import Link from 'next/link';
import { NavSectionConfig, PageContent } from '@/types';

type NavMode = 'desktop' | 'mobile';

type NavSectionProps = {
    section: NavSectionConfig;
    mode: NavMode;
    pagesMap: Record<string, PageContent[]>;
    loadingPages: boolean;
    openDropdown: string | null;
    openSubmenu: string | null;
    onToggleDropdown: (key: string) => void;
    onSetSubmenu: (key: string | null) => void;
    onClose: () => void;
};

const dropdownIdFor = (sectionKey: string, mode: NavMode) =>
    mode === 'desktop' ? sectionKey : `${sectionKey}-mobile`;

const submenuIdFor = (sectionKey: string, mode: NavMode) =>
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
    mode: NavMode;
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

export default NavSection;
