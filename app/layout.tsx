import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

export const metadata: Metadata = {
  title: 'RS Repairs - Professional Appliance Repair Services',
  description: 'Book expert appliance repairs with RS Repairs. Same-day service available.',
  // Add noindex to prevent search engine indexing
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Additional noindex meta tag for extra safety */}
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
