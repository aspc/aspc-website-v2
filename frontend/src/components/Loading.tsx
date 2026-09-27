import Image from 'next/image';

/* Geometry measured off the original cecil_loading.mp4 frames (656x668). */
const CX = 324.07;
const CY = 345.71;
const R_TRACK = 229.5; // centre line of the road, where the arc and dashes sit
const R_INNER = 208.5;
const R_OUTER = 250;
const ROAD_W = R_OUTER - R_INNER;
const INK = '#111111';

/* 36 dashes around the centre line, 52.5% duty - as drawn in the original. */
const DASH = (2 * Math.PI * R_TRACK) / 36;

export default function Loading() {
    return (
        <div
            className="min-h-screen flex items-center justify-center bg-gray-100"
            role="status"
            aria-live="polite"
        >
            <div className="relative w-48" style={{ aspectRatio: '656 / 668' }}>
                {/* The track is drawn rather than filmed: the source video's arc
                    broke into two disconnected pieces for half of its loop. */}
                <svg
                    viewBox="0 0 656 668"
                    className="absolute inset-0 h-full w-full"
                    aria-hidden="true"
                >
                    <circle
                        cx={CX}
                        cy={CY}
                        r={R_TRACK}
                        fill="none"
                        stroke="#EEEFF0"
                        strokeWidth={ROAD_W}
                    />
                    <circle
                        cx={CX}
                        cy={CY}
                        r={R_INNER}
                        fill="none"
                        stroke={INK}
                        strokeWidth={4}
                    />
                    <circle
                        cx={CX}
                        cy={CY}
                        r={R_OUTER}
                        fill="none"
                        stroke={INK}
                        strokeWidth={4}
                    />
                    <circle
                        cx={CX}
                        cy={CY}
                        r={R_TRACK}
                        fill="none"
                        stroke={INK}
                        strokeWidth={4}
                        strokeDasharray={`${DASH * 0.525} ${DASH * 0.475}`}
                    />
                    <circle
                        className="cecil-arc"
                        cx={CX}
                        cy={CY}
                        r={R_TRACK}
                        fill="none"
                        stroke="#293ECD"
                        strokeWidth={25}
                        strokeLinecap="round"
                        strokeDashoffset={0}
                    />
                </svg>

                {/* Cecil's run cycle is 8 frames; he runs in place, so it loops. */}
                <Image
                    src="/cecil_runner.webp"
                    alt=""
                    width={300}
                    height={239}
                    unoptimized
                    priority
                    className="absolute"
                    style={{
                        left: '0.3049%',
                        top: '28.8922%',
                        width: '69.2073%',
                        height: 'auto',
                    }}
                />
            </div>
            <span className="sr-only">Loading</span>
        </div>
    );
}
