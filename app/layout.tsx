import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import PraxamMark from '@/components/PraxamMark';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PraxAM — Practice Smart. Crush Exams.',
  description: 'The UCAT prep platform built for how you actually study. 2,500+ practice questions, expert explanations, and progress tracking that actually helps.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'PraxAM — Practice Smart. Crush Exams.',
    description: 'The UCAT prep platform built by people who have already done it.',
    type: 'website',
    siteName: 'PraxAM',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans">
        <PraxamMark />
        {children}
      </body>
    </html>
  );
}
