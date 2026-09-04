'use client';
import Link from 'next/link';
import { useWallet } from '@/components/landville/wallet-provider';

export function CityModuleFrame({ id }: { id: string }) {
  const { address } = useWallet();
  if (!address) return <section className="lv-panel chat-sidebar-body"><h2>BECOME A CITIZEN</h2><p>Explore the world freely. Sign in to interact with its objects.</p><Link href="/citizens" className="lv-button primary">CREATE ACCOUNT / SIGN IN</Link></section>;
  return <><p className="admin-warning">Independent city module. No wallet access or shared data storage. Progress inside this module resets when you leave.</p><iframe key={`${id}:${address}`} title={`City module ${id}`} src={`/api/modules/${id}`} sandbox="allow-scripts" referrerPolicy="no-referrer" style={{ width: '100%', height: '75vh', border: '1px solid #626d26', background: '#10110d' }} /></>;
}
