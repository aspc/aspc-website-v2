import { Inter } from 'next/font/google'
import Header from '@/components/ui/Header'
import Footer from '@/components/ui/Footer'
import './globals.css'
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: "ASPC Website",
  icons: {
    icon: "/logo-square.png"
  },
};

function MaintenancePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">Website Temporarily Unavailable</h1>
      <p>We&apos;re currently facing unexpected issues. Please check back later.</p>
    </div>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check for maintenance mode environment variable
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo-square.png" type="image/png" />
      </head>
      <body className={inter.className}>
        {isMaintenanceMode ? (
          <MaintenancePage />
        ) : (
          <>
            <Header />
            {children}
            <SpeedInsights />
            <Footer />
          </>
        )}
      </body>
    </html>
  )
}