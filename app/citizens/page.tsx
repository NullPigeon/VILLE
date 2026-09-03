import type { Metadata } from 'next';
import { CitizenProfile } from '@/components/landville/citizen-profile';

export const metadata: Metadata = {
  title: 'Your Citizen File — LANDVILLE',
  description: 'Bring a wallet. Become a citizen. Give the town something worth building.',
};

export default function CitizensPage() {
  return <CitizenProfile />;
}
