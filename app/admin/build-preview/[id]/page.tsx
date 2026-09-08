import { notFound } from 'next/navigation';
import { ProductShell } from '@/components/landville/product-shell';
import { CityModuleFrame } from '@/components/landville/city-module-frame';
import { validProposalId } from '@/lib/build-contract';

export default async function BuildPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validProposalId(id)) notFound();
  return <ProductShell title={`${id} PREVIEW`} eyebrow="REVIEWED ARTIFACT / TEMPORARY DATA">
    <CityModuleFrame id={id} preview />
  </ProductShell>;
}
