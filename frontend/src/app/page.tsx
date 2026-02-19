'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Event, IElectionFrontend } from '@/types';
import HomepageEvents from '@/components/ui/HomepageEvents';
import Loading from '@/components/Loading';
import { useAuth } from '@/hooks/useAuth';
import BallotCountdown from '@/components/vote/BallotCountdown';

export default function HomePage() {
    const [loading, setLoading] = useState(true);
    const { user, loading: authLoading } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [election, setElection] = useState<IElectionFrontend | null>(null);
    const [showElection, setShowElection] = useState(false);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/events/day`
                );
                const data = await response.json();
                setEvents(data);
            } catch (error) {
                console.error('Error fetching events:', error);
            }
        };

        fetchEvents();
        setEvents((prevEvents) =>
            [...prevEvents].sort(
                (a, b) =>
                    new Date(a.start).getTime() - new Date(b.start).getTime()
            )
        );
    }, []);

    useEffect(() => {
        const fetchElection = async () => {
            try {
                const backendLink =
                    process.env.NEXT_PUBLIC_BACKEND_LINK ||
                    process.env.BACKEND_LINK;
                const electionRes = await fetch(
                    `${backendLink}/api/voting/election`,
                    {
                        credentials: 'include',
                    }
                );

                if (!electionRes.ok) {
                    setShowElection(false);
                    return;
                }

                const data = await electionRes.json();
                const now = new Date();
                const endDate = new Date(data.endDate);

                if (endDate > now) {
                    setElection(data);
                    setShowElection(true);
                } else {
                    setShowElection(false);
                }
            } catch (error) {
                console.error('Error fetching election:', error);
                setShowElection(false);
            }
        };

        fetchElection();
    }, []);

    if (authLoading) {
        return <Loading />;
    }
    return (
        <div className="min-h-screen bg-white font-[Lora]">
            {loading && <Loading />}

            {/* Election Section - When there is active election */}
            {showElection && election && (
                <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0f1d]">
                    {/* Animated Background Mesh */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/30 rounded-full blur-[120px] animate-pulse" />
                        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/20 rounded-full blur-[120px]" />
                    </div>

                    <div className="container mx-auto px-6 z-10">
                        <div className="max-w-4xl mx-auto flex flex-col items-center">
                            {/* Your BallotCountdown Component Integration */}
                            <div className="mb-5 flex flex-col items-center gap-3">
                                <span className="text-indigo-400 text-xl font-bold uppercase tracking-[0.2em]">
                                    Polls Close In
                                </span>
                                <BallotCountdown endDate={election.endDate} />
                            </div>

                            <div className="text-center">
                                {/* Status Badge */}
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-[0.15em] mb-8">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                    </span>
                                    Live Election
                                </div>

                                <h2 className="text-6xl md:text-8xl font-bold mb-6 tracking-tight text-white font-[Playfair Display] drop-shadow-sm">
                                    {election.name}
                                </h2>

                                <p className="text-lg md:text-xl mb-12 text-slate-400 max-w-xl mx-auto leading-relaxed font-light">
                                    {election.description}
                                </p>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                                    <Link href="/vote">
                                        <button className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-lg transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-95">
                                            Cast Your Vote
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subtle Decorative Grid/Line */}
                    <div className="absolute bottom-12 left-0 w-full flex justify-center opacity-20">
                        <div className="w-px h-24 bg-gradient-to-b from-indigo-500 to-transparent"></div>
                    </div>
                </section>
            )}

            <div className="relative h-screen flex items-center justify-center text-center text-white">
                <Image
                    src="/sccSunset.jpg"
                    alt="Smith Campus Center"
                    fill
                    className="object-cover"
                    priority
                    quality={100}
                    onLoadingComplete={() => {
                        setTimeout(() => setLoading(false), 400);
                    }}
                />
                <div className="absolute inset-0 bg-orange-500/30 mix-blend-multiply" />

                <div className="relative z-10 px-6">
                    <h1 className="text-6xl font-extrabold tracking-wider leading-snug font-[Playfair Display]">
                        Associated Students <br /> of Pomona College
                    </h1>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12">
                <div className="grid md:grid-cols-2 gap-12">
                    <section>
                        <h2 className="text-2xl font-bold mb-6">
                            Today&apos;s Events
                        </h2>
                        <div className="bg-white rounded-lg shadow p-6">
                            <HomepageEvents events={events} />

                            <div className=" space-x-4 border-t-2 border-gray-200 pt-4">
                                <Link
                                    href="/events"
                                    className="text-blue-500 hover:underline"
                                >
                                    See more events
                                </Link>
                                <Link
                                    href="https://pomona.campuslabs.com/engage/"
                                    className="text-blue-500 hover:underline"
                                >
                                    Submit an event
                                </Link>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-6">
                            Latest From ASPC
                        </h2>
                        <div className="space-y-6">
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="font-medium mb-2">
                                    Fall 2025 Funding Request Forms
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    Request funds allocated for conferences,
                                    alcohol, and club events from ASPC.
                                </p>
                                <Link
                                    href="https://engage.claremont.edu/engage/submitter/form/start/698483"
                                    className="text-blue-500 hover:underline mt-2"
                                    target="_blank"
                                >
                                    Click Here
                                </Link>
                            </div>
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="font-medium mb-2">
                                    The Chirp Guide: ASPC Resource Guide
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    All your questions about ASPC answered here
                                </p>
                                <Link
                                    href="https://docs.google.com/document/d/1usryOaKsIwZ6kABFcaYK5ub0TJSku4WBuoKj70OpNw4/edit?tab=t.0"
                                    className="text-blue-500 hover:underline mt-2"
                                    target="_blank"
                                >
                                    Click Here
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
