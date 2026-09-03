'use client';

import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';

function useFadeIn(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(el);
                }
            },
            { threshold }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold]);

    return { ref, isVisible };
}

function fadeClass(isVisible: boolean) {
    return `transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`;
}

const DEADLINE_ISO = '2026-05-08T23:59:59-07:00';
const DEADLINE_LABEL = 'May 8, 2026';

function daysUntil(iso: string): number {
    const deadline = new Date(iso).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)));
}

const PROJECT_AREAS = [
    'Public Policy',
    'Finance',
    'Marketing',
    'Communications',
    'Education',
    'Youth Programming',
    'Senior Programming',
    'Community Outreach',
];

const STATS = [
    { label: 'Launched', value: 'Fall 2024' },
    { label: 'Open to', value: 'All Majors' },
    { label: 'Class Year', value: 'All Years' },
    { label: 'Duration', value: '1 Semester' },
    { label: 'Mentors', value: 'City Hall Staff' },
];

const GALLERY_PHOTOS = [
    {
        src: '/scs/scholars-faculty-group-photo-outdoor.jpg',
        caption: 'Scholars & Faculty',
    },
    {
        src: '/scs/sagehen-civic-scholars-cohort-group-photo.jpg',
        caption: 'SCS Cohort Group Photo',
    },
    {
        src: '/scs/alumni-panel-discussion.jpg',
        caption: 'Alumni Panel Discussion',
    },
    {
        src: '/scs/internship-reflection-civic-engagement.JPG',
        caption: 'Civic Engagement Reflection',
    },
    {
        src: '/scs/internship-reflection-pride-activity.JPG',
        caption: 'Community Pride Activity',
    },
    { src: '/scs/alumni-panel-discussion-copy.jpg', caption: 'Alumni Panel' },
    {
        src: '/scs/city-of-claremont-recognition-ceremony.JPG',
        caption: 'Claremont Recognition Ceremony',
    },
    {
        src: '/scs/kickoff-dinner-keynote-speaker.jpg',
        caption: 'Welcome speech by former mayor Calaycay',
    },
    {
        src: '/scs/kickoff-2026-intern-panel.jpg',
        caption: 'Spring 2026 Kickoff Panel',
    },
];

const STEPS = [
    {
        step: '01',
        title: 'Written Application',
        date: 'Apr 17 – May 8, 2026',
        desc: 'Submit your written application. Open to all Pomona students regardless of major or class year.',
    },
    {
        step: '02',
        title: 'City Hall Interview',
        date: 'After May 8',
        desc: 'Top candidates interview with City Hall staff — a chance to connect with your future mentors.',
    },
    {
        step: '03',
        title: 'Join the Cohort',
        date: 'Fall 2026',
        desc: 'Selected interns join the new SCS cohort and begin their semester-long civic journey.',
    },
];

export default function SCSAboutPage() {
    const aboutTextFade = useFadeIn();
    const workFade = useFadeIn();
    const expHeadFade = useFadeIn();
    const mosaicHeadFade = useFadeIn();
    const timelineHeadFade = useFadeIn();
    const timelineCardsFade = useFadeIn();
    const ctaFade = useFadeIn();

    const [daysLeft, setDaysLeft] = useState<number | null>(null);
    const [showFab, setShowFab] = useState(false);

    useEffect(() => {
        const updateCountdown = () => setDaysLeft(daysUntil(DEADLINE_ISO));
        updateCountdown();

        const onScroll = () => {
            setShowFab(window.scrollY > window.innerHeight * 0.7);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        // Update countdown every minute so it always reflects current time
        const interval = setInterval(updateCountdown, 60000);

        return () => {
            clearInterval(interval);
            window.removeEventListener('scroll', onScroll);
        };
    }, []);

    const deadlineText =
        daysLeft === null
            ? `Applications close ${DEADLINE_LABEL}`
            : daysLeft === 0
              ? `Last day to apply — closes tonight!`
              : daysLeft === 1
                ? `1 day left — applications close tomorrow`
                : `Only ${daysLeft} days left to apply`;

    return (
        <>
            {/* ── STICKY DEADLINE BANNER ── */}
            <div className="sticky top-0 z-40 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500 text-white shadow-lg">
                <div className="container mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <svg
                            className="w-5 h-5 animate-pulse flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <span className="font-bold tracking-tight">
                            {deadlineText}
                        </span>
                        <span className="hidden md:inline opacity-90">
                            — closes {DEADLINE_LABEL}
                        </span>
                    </div>
                    <a
                        href="https://docs.google.com/forms/d/e/1FAIpQLSfuU36tdOUSWqpb_ZB__KosIauLr0Fvj6bBr6W97DzgugKaKA/viewform?usp=header"
                        className="bg-white text-red-600 px-5 py-1.5 rounded-full font-black text-xs hover:scale-105 transition-all shadow"
                    >
                        Apply Now &rarr;
                    </a>
                </div>
            </div>

            {/* ── FLOATING APPLY FAB ── */}
            <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSfuU36tdOUSWqpb_ZB__KosIauLr0Fvj6bBr6W97DzgugKaKA/viewform?usp=header"
                aria-label="Apply Now"
                className={`fixed bottom-6 right-6 z-50 group flex items-center gap-3 bg-gradient-to-r from-red-600 to-amber-500 text-white pl-5 pr-6 py-4 rounded-full font-bold shadow-2xl transition-all duration-300 hover:scale-105 ${
                    showFab
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
            >
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                </span>
                <span>Apply Now</span>
                {daysLeft !== null && (
                    <span className="text-xs bg-white/25 px-2 py-0.5 rounded-full font-semibold">
                        {daysLeft}d left
                    </span>
                )}
            </a>

            <main className="w-full bg-white font-sans text-slate-900 overflow-x-hidden">
                {/* ── 1. HERO ── */}
                <section className="relative min-h-screen flex items-center bg-white overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-white pointer-events-none" />

                    <div className="relative z-10 w-full container mx-auto px-6 lg:px-20 py-24 lg:py-32">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            {/* Text */}
                            <div className="space-y-6">
                                <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-blue-700 bg-blue-100 rounded-full">
                                    ASPC &times; City of Claremont
                                </span>

                                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-blue-900 leading-[0.95] tracking-tight">
                                    Work at
                                    <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
                                        City Hall.
                                    </span>
                                    <br />
                                    Build Your
                                    <br />
                                    Career.
                                </h1>

                                <p className="text-lg text-slate-600 font-light leading-relaxed max-w-md">
                                    The Sagehen Civic Scholars Internship
                                    connects Pomona students with the City of
                                    Claremont&apos;s local government — real
                                    projects, real mentors, real impact.
                                </p>

                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-sm font-semibold text-amber-700">
                                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                    Applications close May 8, 2026
                                </div>

                                <div className="flex flex-wrap gap-4 pt-2">
                                    <a
                                        href="https://docs.google.com/forms/d/e/1FAIpQLSfuU36tdOUSWqpb_ZB__KosIauLr0Fvj6bBr6W97DzgugKaKA/viewform?usp=header"
                                        className="bg-blue-900 text-white px-8 py-3.5 rounded-full font-bold text-base hover:bg-blue-700 hover:scale-105 transition-all duration-200 shadow-lg"
                                    >
                                        Apply Now &rarr;
                                    </a>
                                    <a
                                        href="https://docs.google.com/document/d/1l3HIuPcrj_mORHGwJAqyIoIefSTmL5q2La2RVLxkieI/edit?usp=sharing"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="border-2 border-blue-900 text-blue-900 px-8 py-3.5 rounded-full font-bold text-base hover:bg-blue-900 hover:text-white hover:scale-105 transition-all duration-200"
                                    >
                                        Meet Past Interns
                                    </a>
                                </div>
                            </div>

                            {/* Photo collage */}
                            <div className="relative h-[440px] md:h-[520px] mt-8 lg:mt-0">
                                {/* Top-left — tall */}
                                <div className="absolute top-0 left-0 w-[55%] h-[60%] rounded-2xl overflow-hidden shadow-xl z-10">
                                    <Image
                                        src="/scs/sagehen-civic-scholars-cohort-group-photo.jpg"
                                        alt="SCS Cohort"
                                        fill
                                        className="object-cover hover:scale-105 hover:brightness-110 transition-all duration-300"
                                        sizes="(max-width: 1024px) 55vw, 30vw"
                                    />
                                </div>
                                {/* Top-right — offset down */}
                                <div className="absolute top-6 right-0 w-[42%] h-[44%] rounded-2xl overflow-hidden shadow-xl z-20">
                                    <Image
                                        src="/scs/kickoff-2026-intern-panel.jpg"
                                        alt="Intern Panel"
                                        fill
                                        className="object-cover hover:scale-105 hover:brightness-110 transition-all duration-300"
                                        sizes="(max-width: 1024px) 42vw, 22vw"
                                    />
                                </div>
                                {/* Bottom-left */}
                                <div className="absolute bottom-0 left-[5%] w-[41%] h-[44%] rounded-2xl overflow-hidden shadow-xl z-20">
                                    <Image
                                        src="/scs/alumni-panel-discussion.jpg"
                                        alt="Alumni Panel"
                                        fill
                                        className="object-cover hover:scale-105 hover:brightness-110 transition-all duration-300"
                                        sizes="(max-width: 1024px) 41vw, 22vw"
                                    />
                                </div>
                                {/* Bottom-right — tall */}
                                <div className="absolute bottom-0 right-0 w-[54%] h-[58%] rounded-2xl overflow-hidden shadow-xl z-10">
                                    <Image
                                        src="/scs/kickoff-dinner-keynote-speaker.jpg"
                                        alt="Kickoff Dinner"
                                        fill
                                        className="object-cover hover:scale-105 hover:brightness-110 transition-all duration-300"
                                        sizes="(max-width: 1024px) 54vw, 30vw"
                                    />
                                </div>
                                {/* Decorative circles */}
                                <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-blue-100 rounded-full -z-10" />
                                <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-100 rounded-full -z-10" />
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-blue-900 to-transparent" />
                </section>

                {/* ── 2. STATS STRIP ── */}
                <section className="bg-blue-900 py-10">
                    <div className="container mx-auto px-6 lg:px-20">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 text-center">
                            {STATS.map((s) => (
                                <div key={s.label} className="space-y-1">
                                    <div className="text-blue-400 text-xs font-bold tracking-widest uppercase">
                                        {s.label}
                                    </div>
                                    <div className="text-white text-xl font-black">
                                        {s.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 3. ABOUT / PURPOSE ── */}
                <section className="py-24 md:py-32 bg-white">
                    <div className="container mx-auto px-6 lg:px-20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div
                                ref={aboutTextFade.ref}
                                className={`space-y-6 ${fadeClass(aboutTextFade.isVisible)}`}
                            >
                                <span className="text-blue-600 font-bold tracking-widest uppercase text-xs">
                                    About the Program
                                </span>
                                <h2 className="text-4xl md:text-5xl font-black text-blue-900 leading-tight tracking-tight">
                                    More than an internship.
                                </h2>
                                <div className="space-y-4 text-slate-600 text-lg font-light leading-relaxed">
                                    <p>
                                        Launched in Fall 2024, the Sagehen Civic
                                        Scholars Internship connects Pomona
                                        College students with the City of
                                        Claremont&apos;s local government — open
                                        to all class years and academic
                                        disciplines.
                                    </p>
                                    <p>
                                        Interns work on projects ranging from
                                        public policy and finance to marketing,
                                        education, and youth programming. Each
                                        student is paired with a Project Liaison
                                        directly from City Hall.
                                    </p>
                                    <p>
                                        By bridging Pomona College and the City
                                        of Claremont, the program strengthens
                                        the vital &quot;town and gown&quot;
                                        relationship — building real-world
                                        skills and connections that outlast
                                        graduation.
                                    </p>
                                </div>
                                <a
                                    href="https://docs.google.com/document/d/1l3HIuPcrj_mORHGwJAqyIoIefSTmL5q2La2RVLxkieI/edit?usp=sharing"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-800 transition-colors"
                                >
                                    View Previous Interns &rarr;
                                </a>
                            </div>

                            <div className="relative">
                                <div className="absolute -inset-4 bg-blue-50 rounded-3xl rotate-2 z-0" />
                                <div className="absolute -inset-4 bg-amber-50/60 rounded-3xl -rotate-1 z-0" />
                                <Image
                                    src="/scs/city-of-claremont-recognition-ceremony.JPG"
                                    alt="City of Claremont Recognition Ceremony"
                                    width={1600}
                                    height={1067}
                                    className="relative z-10 w-full h-auto rounded-2xl shadow-2xl object-cover hover:scale-[1.02] transition-transform duration-500"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 4. WHAT YOU'LL DO — EDITORIAL STYLE ── */}
                <section className="py-20 md:py-28 bg-slate-50">
                    <div
                        ref={workFade.ref}
                        className={`container mx-auto px-6 lg:px-20 ${fadeClass(workFade.isVisible)}`}
                    >
                        {/* Tag */}
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-red-500 text-2xl leading-none">
                                *
                            </span>
                            <span className="text-sm font-bold tracking-[0.2em] uppercase text-slate-900">
                                The Work
                            </span>
                        </div>

                        {/* Featured image with stat overlay */}
                        <div className="relative rounded-3xl overflow-hidden mb-8 group h-[320px] md:h-[460px]">
                            <Image
                                src="/scs/sagehen-civic-scholars-cohort-group-photo.jpg"
                                alt="SCS interns at work"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                sizes="100vw"
                            />
                            {/* Bottom-right stat card */}
                            <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 bg-white rounded-2xl p-5 md:p-6 shadow-2xl max-w-[260px]">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-red-500 text-3xl md:text-4xl font-black">
                                        8+
                                    </span>
                                    <span className="text-slate-900 text-sm md:text-base font-bold tracking-tight">
                                        PROJECT AREAS
                                    </span>
                                </div>
                                <div className="text-xs md:text-sm text-slate-600 mt-1">
                                    <span className="text-red-500 font-bold">
                                        1:1
                                    </span>{' '}
                                    mentorship from City Hall staff
                                </div>
                            </div>
                        </div>

                        {/* Stats bar */}
                        <div className="flex items-center gap-3 md:gap-6 mb-14 text-sm md:text-base flex-wrap">
                            <div>
                                <span className="text-red-500 font-black">
                                    8+
                                </span>{' '}
                                <span className="text-slate-600">
                                    project areas
                                </span>
                            </div>
                            <span className="text-slate-300">|</span>
                            <div>
                                <span className="text-red-500 font-black">
                                    1:1
                                </span>{' '}
                                <span className="text-slate-600">
                                    City Hall mentor
                                </span>
                            </div>
                            <span className="text-slate-300">|</span>
                            <div>
                                <span className="text-red-500 font-black">
                                    All majors
                                </span>{' '}
                                <span className="text-slate-600">welcome</span>
                            </div>
                        </div>

                        {/* Main content split */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16 items-start">
                            {/* Left 2/3 */}
                            <div className="lg:col-span-2 space-y-8">
                                <h2 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight">
                                    Real Work.
                                    <br />
                                    Real Impact.
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-600 leading-relaxed">
                                    <p>
                                        Interns work on projects spanning public
                                        policy, finance, marketing,
                                        communications, education, and youth
                                        &amp; senior programming. Every intern
                                        is paired with a Project Liaison
                                        directly from City Hall.
                                    </p>
                                    <p>
                                        Each semester-long cycle can be
                                        structured in-person, hybrid, or fully
                                        remote — designed to fit alongside your
                                        academic workload while delivering
                                        meaningful civic impact to Claremont.
                                    </p>
                                </div>

                                {/* Project pills */}
                                <div className="flex flex-wrap gap-2 pt-4">
                                    {PROJECT_AREAS.map((area) => (
                                        <span
                                            key={area}
                                            className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-full hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-200 cursor-default"
                                        >
                                            {area}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Right sidebar — sticky CTA */}
                            <div className="lg:sticky lg:top-24 space-y-5 bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
                                <div className="text-red-500 font-black text-lg tracking-[0.15em]">
                                    SCS INTERNSHIP
                                </div>
                                <div className="text-sm text-slate-500 font-medium">
                                    Fall 2026 Cohort &nbsp;|&nbsp; City of
                                    Claremont
                                </div>

                                <div className="pt-2 border-t border-slate-100" />

                                <div className="text-lg font-bold text-slate-900 leading-snug">
                                    Ready to start your civic career?
                                </div>

                                {daysLeft !== null && (
                                    <div className="flex items-center gap-2 text-sm text-red-600 font-semibold">
                                        <svg
                                            className="w-4 h-4 animate-pulse"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        {daysLeft === 0
                                            ? 'Closes today'
                                            : `${daysLeft} days left`}
                                    </div>
                                )}

                                <a
                                    href="https://docs.google.com/forms/d/e/1FAIpQLSfuU36tdOUSWqpb_ZB__KosIauLr0Fvj6bBr6W97DzgugKaKA/viewform?usp=header"
                                    className="group inline-flex w-full items-center justify-between gap-3 bg-slate-900 text-white px-6 py-3.5 rounded-full font-black text-sm tracking-wider hover:bg-red-600 hover:scale-[1.02] transition-all duration-200 shadow-md"
                                >
                                    <span>APPLY NOW</span>
                                    <span className="w-7 h-7 bg-white/15 rounded-full flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                                        &rarr;
                                    </span>
                                </a>

                                <div className="text-xs text-slate-500 pt-2">
                                    Applications close{' '}
                                    <span className="font-bold text-slate-900">
                                        {DEADLINE_LABEL}
                                    </span>
                                    . Not on a rolling basis.
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 5. THE EXPERIENCE ── */}
                <section className="py-24 md:py-32 bg-blue-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-blue-50 to-transparent" />

                    <div className="container mx-auto px-6 lg:px-20 relative z-10">
                        <div
                            ref={expHeadFade.ref}
                            className={`text-center mb-16 ${fadeClass(expHeadFade.isVisible)}`}
                        >
                            <span className="text-blue-400 font-bold tracking-widest uppercase text-xs">
                                Community
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black mt-3 tracking-tight">
                                The Experience
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="group bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:bg-white/10 transition-all duration-300">
                                <div className="aspect-video overflow-hidden relative">
                                    <Image
                                        src="/scs/kickoff-2026-intern-panel.jpg"
                                        alt="Kickoff Luncheon"
                                        fill
                                        className="object-cover group-hover:brightness-110 group-hover:scale-105 transition-all duration-300"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                    />
                                </div>
                                <div className="p-8">
                                    <h3 className="text-2xl font-bold mb-3">
                                        Kickoff Luncheon
                                    </h3>
                                    <p className="text-blue-100/80 font-light leading-relaxed">
                                        Each semester begins with a luncheon
                                        bringing together previous interns, the
                                        new cohort, City Hall staff, and ASPC
                                        leadership. Alumni share their
                                        experiences and advice — giving
                                        newcomers a running start.
                                    </p>
                                </div>
                            </div>

                            <div className="group bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:bg-white/10 transition-all duration-300">
                                <div className="aspect-video overflow-hidden relative">
                                    <Image
                                        src="/scs/fall-2025-closing-cohort-photo.JPG"
                                        alt="Closing Luncheon"
                                        fill
                                        className="object-cover group-hover:brightness-110 group-hover:scale-105 transition-all duration-300"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                    />
                                </div>
                                <div className="p-8">
                                    <h3 className="text-2xl font-bold mb-3">
                                        Closing Luncheon
                                    </h3>
                                    <p className="text-blue-100/80 font-light leading-relaxed">
                                        The closing luncheon culminates the
                                        internship with thoughtful reflection
                                        amongst interns, City Hall staff, and
                                        ASPC. Interns close their chapter
                                        knowing these professional connections
                                        will last beyond graduation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white to-transparent" />
                </section>

                {/* ── 6. PHOTO MOSAIC ── */}
                <section className="py-24 md:py-32 bg-white">
                    <div className="container mx-auto px-6 lg:px-20">
                        <div
                            ref={mosaicHeadFade.ref}
                            className={`text-center mb-12 ${fadeClass(mosaicHeadFade.isVisible)}`}
                        >
                            <span className="text-blue-600 font-bold tracking-widest uppercase text-xs">
                                Gallery
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black text-blue-900 mt-3 tracking-tight">
                                Life in SCS
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {GALLERY_PHOTOS.map((photo, i) => (
                                <div
                                    key={i}
                                    className="group relative aspect-square overflow-hidden rounded-2xl shadow-md"
                                >
                                    <Image
                                        src={photo.src}
                                        alt={photo.caption}
                                        fill
                                        className="object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-300"
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    />
                                    <div className="absolute inset-0 bg-blue-900/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                        <span className="text-white text-sm font-semibold">
                                            {photo.caption}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 7. APPLICATION PROCESS ── */}
                <section className="py-24 md:py-32 bg-blue-50">
                    <div className="container mx-auto px-6 lg:px-20">
                        <div
                            ref={timelineHeadFade.ref}
                            className={`text-center mb-16 ${fadeClass(timelineHeadFade.isVisible)}`}
                        >
                            <span className="text-blue-600 font-bold tracking-widest uppercase text-xs">
                                How to Apply
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black text-blue-900 mt-3 tracking-tight">
                                Application Process
                            </h2>
                            <p className="text-slate-600 font-light mt-4 max-w-xl mx-auto">
                                All applications are reviewed together after the
                                final deadline — not on a rolling basis.
                            </p>
                        </div>

                        <div
                            ref={timelineCardsFade.ref}
                            className={`grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto ${fadeClass(timelineCardsFade.isVisible)}`}
                        >
                            {STEPS.map((step, i) => (
                                <div
                                    key={step.step}
                                    className="relative bg-white rounded-2xl p-8 shadow-sm border border-blue-100 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                                >
                                    <div className="text-6xl font-black text-blue-100 mb-4 leading-none">
                                        {step.step}
                                    </div>
                                    <h3 className="text-xl font-bold text-blue-900 mb-1">
                                        {step.title}
                                    </h3>
                                    <div className="text-blue-500 text-sm font-semibold mb-3">
                                        {step.date}
                                    </div>
                                    <p className="text-slate-600 font-light leading-relaxed">
                                        {step.desc}
                                    </p>
                                    {i < 2 && (
                                        <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-blue-300 text-2xl font-light">
                                            &rarr;
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 8. CTA ── */}
                <section className="py-24 bg-blue-900 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(96,165,250,0.08)_0%,transparent_70%)] pointer-events-none" />

                    <div
                        ref={ctaFade.ref}
                        className={`container mx-auto px-6 lg:px-20 text-center relative z-10 ${fadeClass(ctaFade.isVisible)}`}
                    >
                        <Image
                            src="/scs/scholars-faculty-group-photo-outdoor.jpg"
                            alt="SCS Community"
                            width={96}
                            height={96}
                            className="w-24 h-24 object-cover rounded-full mx-auto mb-8 ring-4 ring-blue-400 shadow-xl"
                        />
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
                            This Could Be You.
                        </h2>
                        <p className="text-blue-200 text-xl font-light mb-4 max-w-xl mx-auto">
                            Work alongside City Hall. Build lasting skills.
                            Shape Claremont&apos;s future.
                        </p>
                        <div className="inline-flex items-center gap-2 px-5 py-2 bg-amber-400/20 border border-amber-400/40 rounded-full text-amber-300 text-sm font-semibold mb-10">
                            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                            Applications close May 8, 2026
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a
                                href="https://docs.google.com/forms/d/e/1FAIpQLSfuU36tdOUSWqpb_ZB__KosIauLr0Fvj6bBr6W97DzgugKaKA/viewform?usp=header"
                                className="bg-white text-blue-900 px-10 py-4 rounded-full font-black text-lg hover:bg-blue-50 hover:scale-105 transition-all duration-200 shadow-xl"
                            >
                                Apply Now &rarr;
                            </a>
                            <a
                                href="https://docs.google.com/forms/d/e/1FAIpQLSfuU36tdOUSWqpb_ZB__KosIauLr0Fvj6bBr6W97DzgugKaKA/viewform?usp=header"
                                className="border-2 border-white/30 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white/10 hover:scale-105 transition-all duration-200"
                            >
                                Contact Us
                            </a>
                        </div>

                        <p className="text-blue-400 text-sm mt-6">
                            Questions? Email{' '}
                            <a
                                href="https://docs.google.com/forms/d/e/1FAIpQLSfuU36tdOUSWqpb_ZB__KosIauLr0Fvj6bBr6W97DzgugKaKA/viewform?usp=header"
                                className="underline hover:text-white transition-colors"
                            >
                                communitypartnerships@aspc.pomona.edu
                            </a>
                        </p>
                    </div>
                </section>
            </main>
        </>
    );
}
