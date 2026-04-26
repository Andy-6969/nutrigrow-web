import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/shared/context/AuthContext';
import PWAInit from '@/shared/components/PWAInit';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#22c55e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "NutriGrow — Smart Fertigation Dashboard",
  description: "Sistem pemantau lahan pertanian dan smart fertigation terintegrasi dengan IoT, Fuzzy Logic, dan prediksi cuaca untuk pertanian presisi Indonesia.",
  keywords: ["NutriGrow", "smart fertigation", "IoT", "pertanian", "irigasi", "dashboard"],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NutriGrow',
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <PWAInit />
      </body>
    </html>
  );
}

