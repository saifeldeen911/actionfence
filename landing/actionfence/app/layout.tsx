import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import {
  canonicalPath,
  canonicalUrl,
  clarityProjectId,
  isProduction,
  metadataBase,
  siteDescription,
  siteKeywords,
  siteName,
  siteRepoUrl,
  siteTitle,
} from "@/lib/site-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: siteKeywords,
  category: "developer tools",
  authors: [{ name: "Saifeldeen", url: siteRepoUrl }],
  creator: "Saifeldeen",
  publisher: siteName,
  alternates: {
    canonical: canonicalPath("/"),
  },
  openGraph: {
    type: "website",
    url: canonicalUrl("/"),
    title: siteTitle,
    description: siteDescription,
    siteName,
    locale: "en_US",
    images: [
      {
        url: canonicalUrl("/feature-assets/receipt-chain.png"),
        alt: "ActionFence cryptographic receipt chain visualization",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [canonicalUrl("/feature-assets/receipt-chain.png")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loadClarity = isProduction();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-dvh flex flex-col font-sans selection:bg-accent selection:text-white bg-background text-foreground overflow-x-hidden">
        {children}
        {loadClarity ? (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityProjectId}");`}
          </Script>
        ) : null}
      </body>
    </html>
  );
}
