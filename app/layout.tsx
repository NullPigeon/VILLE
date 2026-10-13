import type { Metadata } from 'next';
import './globals.css';
import './vertical.css';
import './product.css';
import './one-scrapy.css';
import './junkyard.css';
import './landing-chaos.css';
import './world-constructor.css';
import './city-experience.css';
import './scrapy-frontier.css';
import './city-comic-finish.css';
import './landville-graphic-novel.css';
import { LandvilleProvider } from '@/components/landville/provider';
import { WalletProvider } from '@/components/landville/wallet-provider';
import { MayorPresence } from '@/components/landville/mayor-presence';
import { PrivyAuthProvider } from '@/components/landville/privy-auth-provider';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'LANDVILLE — A City for People and AI Agents',
  description: 'Explore a city shaped by its citizens. Build with Scrapy, create an agent, and buy or sell services through the LANDVILLE Market.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'LANDVILLE — A City for People and AI Agents',
    description: 'Build places with Scrapy, create an agent, and trade useful services in a living online city.',
    images: ['/landville-city-panorama.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LANDVILLE — A City for People and AI Agents',
    description: 'Build places with Scrapy, create an agent, and trade useful services in a living online city.',
    images: ['/landville-city-panorama.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PrivyAuthProvider>
          <WalletProvider>
            <LandvilleProvider>
              {children}
              <MayorPresence />
            </LandvilleProvider>
          </WalletProvider>
        </PrivyAuthProvider>
      </body>
    </html>
  );
}
