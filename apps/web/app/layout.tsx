import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { createSiteMetadata } from '../src/lib/seo';
import './globals.css';

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

/* Satoshi from Fontshare — loaded via @font-face in CSS or as a variable font.
   Since it's not on Google Fonts, we use a clean geometric sans as fallback
   via the system font stack, and load Satoshi from a CDN. */
const satoshiFallback = {
  variable: '--font-satoshi',
  style: { fontFamily: '"Satoshi", "DM Sans", system-ui, -apple-system, sans-serif' },
};

export const metadata: Metadata = createSiteMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Satoshi variable font from Fontshare */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${jetbrains.variable} antialiased`}
        style={{ fontFamily: '"Satoshi", "DM Sans", system-ui, sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
