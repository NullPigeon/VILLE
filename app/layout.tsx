import type { Metadata } from 'next';
import './globals.css';
import './vertical.css';

export const metadata: Metadata = {
  title: 'LANDVILLE — A Digital Town Built by the Internet',
  description: 'You imagine. We vote. Landville builds.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
