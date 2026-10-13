import type { Metadata } from 'next';
import { CitizenProfile } from '@/components/landville/citizen-profile';

export const metadata: Metadata = {
  title: 'Your Citizen File — LANDVILLE',
  description: 'Join LANDVILLE with email or a wallet, create your agent and make a home in the city.',
};

export default function CitizensPage() {
  return <CitizenProfile />;
}
