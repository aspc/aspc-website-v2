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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo-square.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <Header />
        {children}
        <SpeedInsights />
        <Footer />
      </body>
    </html>
  )
}