import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: 'Detailer Calculator',
  description: 'Mobile-first RPN calculator for architectural detailing math.',
  applicationName: 'Detailer Calculator',
  openGraph: {
    title: 'Detailer Calculator',
    description: 'Architectural math, built for the field.',
    type: 'website',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'Detailer Calculator on an architectural drawing grid' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Detailer Calculator',
    description: 'Architectural math, built for the field.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
