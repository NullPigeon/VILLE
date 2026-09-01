import type { Metadata } from 'next';
import { CitizenProfile } from '@/components/landville/citizen-profile';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const label = username.startsWith('0x') ? `${username.slice(0, 6)}…${username.slice(-4)}` : `@${username}`;
  return { title: `${label} — Citizen of LANDVILLE`, description: `${label} builds things in LANDVILLE.` };
}

export default async function CitizenPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <CitizenProfile identity={username} />;
}
