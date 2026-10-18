import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MUVE QR — SCAN • TRACK • MOVE FORWARD",
  description: "Enterprise QR-code-based activity, attendance, and location tracking platform.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MUVE QR",
  },
  icons: {
    icon: [
      { url: '/muve-logo.jpg', type: 'image/jpeg' },
    ],
    apple: '/muve-logo.jpg',
    shortcut: '/muve-logo.jpg',
  },
};

export const viewport = {
  themeColor: "#050d1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/muve-logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/muve-logo.jpg" />
        <link rel="shortcut icon" href="/muve-logo.jpg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MUVE QR" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
