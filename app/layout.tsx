import type { Metadata } from 'next';
import './globals.css';
import './vertical.css';
import './product.css';
import './junkyard.css';
import { LandvilleProvider } from '@/components/landville/provider';
import { WalletProvider } from '@/components/landville/wallet-provider';
import { MayorPresence } from '@/components/landville/mayor-presence';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'LANDVILLE — A Digital Town Built by the Internet',
  description: 'You imagine. We vote. Landville builds.',
  openGraph: {
    title: 'LANDVILLE — Built by the Internet',
    description: 'Imagine a thing. Make the citizens vote. If it passes, it joins the town.',
    images: ['/landville-reference.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LANDVILLE — Built by the Internet',
    description: 'You imagine. We vote. Landville builds.',
    images: ['/landville-reference.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><WalletProvider><LandvilleProvider>{children}<MayorPresence /></LandvilleProvider></WalletProvider></body>
    </html>
  );
}
