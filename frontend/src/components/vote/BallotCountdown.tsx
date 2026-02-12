import React, { useState, useEffect } from 'react';

export default function BallotCountdown({ endDate }: { endDate: string }) {
    const [timeLeft, setTimeLeft] = useState<{
        d: number;
        h: number;
        m: number;
        s: number;
    } | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            const distance = new Date(endDate).getTime() - new Date().getTime();
            if (distance < 0) {
                clearInterval(timer);
                setTimeLeft(null);
            } else {
                setTimeLeft({
                    d: Math.floor(distance / (1000 * 60 * 60 * 24)),
                    h: Math.floor(
                        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
                    ),
                    m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                    s: Math.floor((distance % (1000 * 60)) / 1000),
                });
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [endDate]);

    if (!timeLeft) return <div className="text-red-600 font-bold">CLOSED</div>;

    return (
        <div className="flex gap-1.5">
            {Object.entries(timeLeft).map(([label, val]: [string, number]) => (
                <div
                    key={label}
                    className="bg-[#001f3f] text-white w-8 h-8 flex items-center justify-center font-bold rounded-md text-[10px]"
                >
                    {val}
                    {label.toUpperCase()}
                </div>
            ))}
        </div>
    );
}
