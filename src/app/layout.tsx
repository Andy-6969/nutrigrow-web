import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/shared/context/AuthContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NutriGrow — Smart Fertigation Dashboard",
  description: "Sistem pemantau lahan pertanian dan smart fertigation terintegrasi dengan IoT, Fuzzy Logic, dan prediksi cuaca untuk pertanian presisi Indonesia.",
  keywords: ["NutriGrow", "smart fertigation", "IoT", "pertanian", "irigasi", "dashboard"],
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
      </body>
    </html>
  );
}
