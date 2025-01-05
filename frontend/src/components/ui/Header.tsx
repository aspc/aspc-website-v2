'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading'
import { useAuth } from '@/hooks/useAuth';


const Header = () => {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) {
    return <Loading />;
  }

  return (
    <header className="bg-blue-800 shadow text-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold">ASPC</span>
            </Link>
          </div>

          <nav className="flex items-center space-x-6">
            <Link href="/aspc" className="hover:text-blue-500">ASPC</Link>
            <Link href="/campus" className="hover:text-blue-500">Campus</Link>
            <Link href="/courses" className="hover:text-blue-500">Courses</Link>
            <Link href="/events" className="hover:text-blue-500">Events</Link>
            {user ? (
              <>{user.isAdmin && <Link href="/dashboard" className="text-yellow-400 hover:text-blue-500">Dashboard</Link>}
              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
              >
                Logout
              </button></>
            ) : (
              <button 
                onClick={() => router.push('/login')}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Sign In
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;