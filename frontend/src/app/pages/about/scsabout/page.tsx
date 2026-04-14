import React from 'react';

export default function SCSAboutPage() {
    return (
        <main className="w-full bg-white font-sans text-slate-900 overflow-x-hidden">
            {/* 1. Hero Section */}
            <section className="relative w-full h-screen flex items-center bg-blue-900 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://picsum.photos/1920/1080?business"
                        alt="SCS Internship Hero"
                        className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-950 via-blue-900/80 to-transparent" />
                </div>

                <div className="relative z-10 container mx-auto px-6 lg:px-20">
                    <div className="max-w-4xl">
                        <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wider text-blue-400 uppercase bg-blue-400/10 border border-blue-400/20 rounded-full">
                            ASPC Leadership Program
                        </div>
                        <h1 className="text-6xl md:text-9xl font-black text-white leading-[0.9] mb-8 tracking-tighter">
                            SCS <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                                Internship
                            </span>
                        </h1>
                        <p className="text-xl md:text-2xl text-blue-50/80 font-light leading-relaxed max-w-2xl mb-10">
                            Fostering professional growth and civic
                            responsibility through dedicated student-led
                            community service initiatives.
                        </p>
                        <div className="flex animate-bounce">
                            <svg
                                className="w-8 h-8 text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                ></path>
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent z-10" />
            </section>

            {/* 2. Purpose Section */}
            <section className="py-24 md:py-32 bg-white">
                <div className="container mx-auto px-6 lg:px-20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h2 className="text-blue-700 font-bold tracking-widest uppercase text-sm">
                                    Our Mission
                                </h2>
                                <h3 className="text-4xl md:text-5xl font-extrabold text-blue-900 tracking-tight leading-tight">
                                    Driving Change Through <br /> Student
                                    Leadership
                                </h3>
                            </div>
                            <div className="space-y-6 text-lg text-slate-600 leading-relaxed font-light">
                                <p>
                                    Lorem ipsum dolor sit amet, consectetur
                                    adipiscing elit. Sed do eiusmod tempor
                                    incididunt ut labore et dolore magna aliqua.
                                    Ut enim ad minim veniam, quis nostrud
                                    exercitation ullamco laboris nisi ut aliquip
                                    ex ea commodo consequat.
                                </p>
                                <p>
                                    Duis aute irure dolor in reprehenderit in
                                    voluptate velit esse cillum dolore eu fugiat
                                    nulla pariatur. Excepteur sint occaecat
                                    cupidatat non proident, sunt in culpa qui
                                    officia deserunt mollit anim id est laborum.
                                </p>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute -inset-4 bg-blue-50 rounded-2xl -rotate-2 z-0" />
                            <img
                                src="https://picsum.photos/800/600?education"
                                alt="Purpose"
                                className="relative z-10 w-full h-auto rounded-xl shadow-2xl object-cover transform transition-transform hover:scale-[1.02] duration-500"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. What You'll Do Section - DARK THEME */}
            <section className="py-32 md:py-48 bg-blue-900 text-white relative overflow-hidden">
                {/* Top Fade Effect */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white to-transparent z-10" />

                {/* Subtle background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.05)_0%,transparent_70%)] pointer-events-none"></div>

                <div className="container mx-auto px-6 lg:px-20 text-center mb-20 relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">
                        What You&apos;ll Do
                    </h2>
                    <div className="w-24 h-1.5 bg-blue-400 mx-auto rounded-full shadow-[0_0_15px_rgba(96,165,250,0.5)]"></div>
                </div>

                <div className="container mx-auto px-6 lg:px-20 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="group bg-white/5 backdrop-blur-sm p-10 rounded-3xl border border-white/10 transition-all hover:bg-white/10 hover:-translate-y-2"
                            >
                                <div className="w-16 h-16 bg-blue-400 text-blue-900 flex items-center justify-center rounded-2xl mb-8 mx-auto shadow-lg group-hover:scale-110 transition-transform">
                                    <svg
                                        className="w-8 h-8"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M13 10V3L4 14h7v7l9-11h-7z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-center">
                                    Impact Area {item}
                                </h3>
                                <p className="text-blue-100/70 font-light leading-relaxed text-center text-lg">
                                    Lorem ipsum dolor sit amet, consectetur
                                    adipiscing elit. Phasellus imperdiet, nulla
                                    et dictum interdum, nisi lorem egestas vitae
                                    scelerisque.
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Fade Effect */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent z-10" />
            </section>

            {/* 4. Who Should Apply Section - SIMPLIFIED */}
            <section className="py-24 md:py-32 bg-white">
                <div className="container mx-auto px-6 lg:px-20">
                    <div className="max-w-4xl mx-auto text-center space-y-16">
                        <div className="space-y-6">
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-blue-900">
                                Who Should Apply
                            </h2>
                            <p className="text-xl text-slate-600 font-light leading-relaxed max-w-2xl mx-auto">
                                We are looking for passionate, driven students
                                who want to make a tangible difference in the
                                Pomona community while developing professional
                                leadership skills.
                            </p>
                        </div>

                        {/* Simple Horizontal Stats - No Boxes */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 py-12 border-y border-blue-50">
                            {[
                                {
                                    label: 'Class Year',
                                    value: 'Sophomores & Juniors',
                                },
                                { label: 'Major', value: 'All Disciplines' },
                                {
                                    label: 'Commitment',
                                    value: '5-8 hrs / week',
                                },
                            ].map((stat, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="text-sm font-bold text-blue-500 uppercase tracking-widest">
                                        {stat.label}
                                    </div>
                                    <div className="text-2xl font-black text-blue-900">
                                        {stat.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-8">
                            <p className="text-slate-500 italic font-light">
                                * No prior community service experience is
                                required — passion and empathy are our primary
                                criteria.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. CTA Strip */}
            <section className="py-24 bg-blue-900 relative overflow-hidden border-t border-white/5">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-950/50 to-transparent"></div>
                <div className="container mx-auto px-6 lg:px-20 relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="text-white text-center md:text-left">
                            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
                                Interested in{' '}
                                <span className="text-blue-400">applying?</span>
                            </h2>
                            <p className="text-blue-100 text-xl font-light">
                                Contact the ASPC Community Liaison for more
                                information.
                            </p>
                        </div>
                        <a
                            href="mailto:liaison@aspc.pomona.edu"
                            className="bg-blue-400 text-blue-900 px-12 py-5 rounded-full font-black text-xl shadow-[0_0_30px_rgba(96,165,250,0.3)] hover:bg-blue-300 hover:scale-105 transition-all"
                        >
                            Email Liaison
                        </a>
                    </div>
                </div>
            </section>
        </main>
    );
}
