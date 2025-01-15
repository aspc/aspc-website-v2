import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center px-4">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo4.png"
            alt="ASPC Logo"
            width={100}
            height={100}
            className="opacity-80"
          />
        </div>
        <h1 className="text-6xl font-bold text-blue-900 mb-4">404</h1>
        <h2 className="text-2xl text-blue-900 mb-8">Page Not Found</h2>
        <p className="text-blue-600 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or still hasn't been fully released by the Sofware Development Team. Thank you for your paitence.
        </p>
        <Link 
          href="/"
          className="inline-block text-white px-6 py-3 rounded-lg font-medium bg-blue-900 hover:bg-blue-500 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}