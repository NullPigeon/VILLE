import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAddress } from 'viem';
import { CitizenProfile } from '@/components/landville/citizen-profile';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  if (!isAddress(username)) return { title: 'Your Citizen File — LANDVILLE' };
  const label = `${username.slice(0, 6)}…${username.slice(-4)}`;
  return { title: `${label} — LANDVILLE Wallet`, description: 'Wallet-linked activity in LANDVILLE.' };
}

export default async function CitizenPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  if (!isAddress(username)) redirect('/citizens');
  return <CitizenProfile identity={username} />;
}
