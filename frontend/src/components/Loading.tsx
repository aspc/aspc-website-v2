export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <video
                src="/cecil-run.mp4"
                autoPlay
                loop
                muted
                playsInline
                aria-label="Loading"
                className="w-48 h-auto"
            />
        </div>
    );
}
