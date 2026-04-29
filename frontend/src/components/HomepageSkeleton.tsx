export default function HomepageSkeleton() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="relative h-screen flex items-center justify-center bg-gradient-to-b from-orange-300 to-orange-600">
                <div className="relative z-10 px-6 text-center">
                    <div className="h-12 w-80 md:w-[28rem] bg-white/40 rounded mx-auto mb-4" />
                    <div className="h-12 w-64 md:w-96 bg-white/40 rounded mx-auto" />
                </div>
            </div>

            <div className="container mx-auto px-4 py-12">
                <div className="grid md:grid-cols-2 gap-12">
                    <section>
                        <div className="h-7 w-48 bg-gray-200 rounded mb-6" />
                        <div className="bg-white rounded-lg shadow p-6 space-y-4">
                            <div className="h-4 w-full bg-gray-200 rounded" />
                            <div className="h-4 w-5/6 bg-gray-200 rounded" />
                            <div className="h-4 w-2/3 bg-gray-200 rounded" />
                        </div>
                    </section>
                    <section>
                        <div className="h-7 w-48 bg-gray-200 rounded mb-6" />
                        <div className="space-y-6">
                            <div className="bg-white rounded-lg shadow p-6 space-y-3">
                                <div className="h-5 w-2/3 bg-gray-200 rounded" />
                                <div className="h-3 w-full bg-gray-200 rounded" />
                                <div className="h-3 w-4/5 bg-gray-200 rounded" />
                            </div>
                            <div className="bg-white rounded-lg shadow p-6 space-y-3">
                                <div className="h-5 w-2/3 bg-gray-200 rounded" />
                                <div className="h-3 w-full bg-gray-200 rounded" />
                                <div className="h-3 w-4/5 bg-gray-200 rounded" />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
