import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: {
    template: '%s | Multi Power Warehouse',
    default: 'Multi Power Warehouse System',
  },
  description: 'Sistem manajemen gudang terintegrasi dengan Odoo — PT Multi Power Aditama',
  icons: {
    icon: [{ url: '/logo.webp', type: 'image/webp' }],
    shortcut: [{ url: '/logo.webp', type: 'image/webp' }],
    apple: [{ url: '/logo.webp', type: 'image/webp' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
