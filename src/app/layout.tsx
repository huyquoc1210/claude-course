import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { getCurrentUser } from '@/lib/session';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: { default: 'NextNotes', template: '%s · NextNotes' },
  description: 'Take notes and share them with a link.',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Display only: route protection stays per page (requireSession). Re-evaluated after sign-in
  // (router.refresh) and sign-out (cookie change in a server action re-renders layouts).
  const user = await getCurrentUser();

  return (
    <html lang='en' className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className='min-h-full flex flex-col'>
        <SiteHeader user={user} />
        {children}
      </body>
    </html>
  );
}
