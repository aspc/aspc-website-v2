'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Footer = () => {
    return (
        <footer className="bg-blue-900 text-white py-5">
            <div className="container mx-auto px-4 lg:px-16 flex flex-col md:flex-row justify-between items-center">
                {/* Motto and Info */}
                <div className="flex items-center space-x-3">
                    <div className="leading-tight">
                        <p className="text-white font-bold text-sm md:text-base">
                            Representing the student body since 1904
                        </p>
                        <div className="flex items-center mt-1 text-gray-300 text-xs">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                            <Link
                                href="https://www.pomona.edu/map/?id=523#!m/54445"
                                target="_blank"
                                className="hover:text-white hover:underline transition duration-200"
                            >
                                Smith Campus Center, Pomona College
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Contact Us & Social Links */}
                <div className="flex flex-col items-center md:items-end space-y-2 mt-2 md:mt-0">
                    {/* Contact Us Link */}
                    <Link
                        href="https://docs.google.com/forms/u/1/d/e/1FAIpQLSfl1dBB59Davy3OXjn2TAbwZ_SU1YOk0CO5XQdXRnFBRwUuSw/viewform?usp=send_form"
                        target="_blank"
                        className="flex items-center space-x-2 text-white hover:text-blue-200 transition duration-200 bg-blue-800 px-2 py-1 rounded-lg text-sm"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                        <span>Contact Us</span>
                    </Link>

                    {/* Social Media Links */}
                    <div className="flex space-x-3">
                        <Link
                            href="https://www.instagram.com/aspc.pomona/"
                            target="_blank"
                        >
                            <div className="w-8 h-8 flex items-center justify-center bg-white rounded-md p-0 transition duration-200 hover:opacity-80 hover:scale-110">
                                <Image
                                    src="/instagram-logo.png"
                                    alt="Instagram"
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </Link>
                        <Link
                            href="https://www.facebook.com/aspc.pomona/"
                            target="_blank"
                        >
                            <div className="w-8 h-8 flex items-center justify-center bg-white rounded-md p-0.5 transition duration-200 hover:opacity-80 hover:scale-110">
                                <Image
                                    src="/facebook-logo.png"
                                    alt="Facebook"
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </Link>

                        {/* Pomona Link */}
                        <Link
                            href="https://www.pomona.edu/administration/campus-center/services-programs/aspc-office"
                            target="_blank"
                        >
                            <div className="w-8 h-8 flex items-center justify-center bg-white rounded-md p-0.5 transition duration-200 hover:opacity-80 hover:scale-110">
                                <Image
                                    src="/pomona-logo.png"
                                    alt="Pomona Logo"
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-blue-800 my-2 mx-4 lg:mx-16"></div>

            {/* Copyright */}
            <div className="text-center text-xs text-gray-400">
                &copy; {new Date().getFullYear()} ASPC. All Rights Reserved.
            </div>
        </footer>
    );
};

export default Footer;
