import { notFound } from 'next/navigation';
import { validProposalId } from '@/lib/build-contract';
import { ProductShell } from '@/components/landville/product-shell';
import { CityModuleFrame } from '@/components/landville/city-module-frame';

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validProposalId(id)) notFound();
  return <ProductShell title={id} eyebrow="BUILT BY THE CITIZENS"><CityModuleFrame id={id} /></ProductShell>;
}
