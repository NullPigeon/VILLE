import { YardScene } from '@/components/landville/yard-scene';

export default async function YardPage({ params }: { params: Promise<{ owner: string }> }) {
  const { owner } = await params;
  return <YardScene key={owner} owner={owner} />;
}
