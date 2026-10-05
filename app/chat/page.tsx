import type { Metadata } from 'next';
import { ProductShell } from '@/components/landville/product-shell';
import { CityChatWorkspace } from '@/components/landville/city-chat-workspace';

export const metadata: Metadata = { title: 'Build & Talk — LANDVILLE', description: 'Shape an idea with Scrapy or meet your neighbours in Town Square.' };

export default function ChatPage() {
  return <ProductShell title="Build. Talk. Belong." eyebrow="SCRAPY & THE NEIGHBOURS"><CityChatWorkspace /></ProductShell>;
}
