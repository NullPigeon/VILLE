'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Bot, Send, Sparkles } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { localScrapyReply } from '@/lib/mayor-prompt';

type Message = { who: 'YOU' | 'SCRAPY'; text: string };

function extractConcept(text: string) {
  const normalized = text.toLowerCase();
  const title = normalized.includes('leaderboard')
    ? 'THE BUILDER BILLBOARD'
    : normalized.includes('token')
      ? 'PHYSICAL TOKEN SWAP'
      : text.toUpperCase().slice(0, 48);

  return {
    title,
    summary: `A LANDVILLE-native version of “${text}” built as a physical town object with visible citizen attribution.`,
  };
}

export default function MayorPage() {
  const { createProposal } = useLandville();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { who: 'SCRAPY', text: 'Resident detected. What are we irresponsibly building today?' },
  ]);
  const [concept, setConcept] = useState<{ title: string; summary: string } | null>(null);
  const [created, setCreated] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replySource, setReplySource] = useState<'openai' | 'local'>('local');
  const [proposalMessage, setProposalMessage] = useState('');

  async function send(event: { preventDefault(): void }) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isReplying) return;

    const nextMessages = [...messages, { who: 'YOU' as const, text }];
    setMessages(nextMessages);
    setInput('');
    setIsReplying(true);
    setConcept(extractConcept(text));

    try {
      const response = await fetch('/api/mayor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.who === 'YOU' ? 'user' : 'assistant',
            content: message.text,
          })),
        }),
      });
      if (!response.ok) throw new Error('Mayor request failed');

      const result = (await response.json()) as {
        reply?: string;
        source?: 'openai' | 'local';
      };
      setMessages((current) => [
        ...current,
        { who: 'SCRAPY', text: result.reply || localScrapyReply(text) },
      ]);
      setReplySource(result.source || 'local');
    } catch {
      setMessages((current) => [
        ...current,
        { who: 'SCRAPY', text: localScrapyReply(text) },
      ]);
      setReplySource('local');
    } finally {
      setIsReplying(false);
    }
  }

  async function publishConcept() {
    if (!concept) return;
    setProposalMessage('CHECKING YOUR SCRAPY TOKEN HOLD…');
    try {
      const proposal = await createProposal({
        title: concept.title,
        summary: concept.summary,
        category: 'UTILITY',
        district: 'THE DUMP',
      });
      setCreated(proposal.id);
      setProposalMessage(`ELIGIBLE · ×${proposal.eligibilitySnapshot?.weight || 0} POWER`);
    } catch (error) {
      setProposalMessage(error instanceof Error ? error.message.toUpperCase() : 'WALLET CHECK FAILED');
    }
  }

  return (
    <ProductShell
      title="MAYOR SCRAPY"
      eyebrow="ONLINE / DOCKED / JUDGMENTAL"
      actions={
        created ? (
          <Link className="lv-button primary" href="/proposals">
            VIEW {created} <ArrowUpRight />
          </Link>
        ) : undefined
      }
    >
      <div className="mayor-workspace">
        <section className="lv-panel mayor-terminal">
          <header className="lv-panel-head">
            <h2>
              <Bot /> MAYOR CHANNEL
            </h2>
            <span>{replySource === 'openai' ? 'AI PERSONA ONLINE' : 'LOCAL PERSONA / ADD API KEY'}</span>
          </header>
          <div className="chat-log">
            {messages.map((message, index) => (
              <div
                className={message.who === 'YOU' ? 'terminal-message you' : 'terminal-message'}
                key={`${message.who}-${index}`}
              >
                <small>{message.who}</small>
                <p>{message.text}</p>
              </div>
            ))}
            {isReplying && (
              <div className="terminal-message thinking">
                <small>SCRAPY</small>
                <p>Grinding municipal gears…</p>
              </div>
            )}
            {concept && (
              <div className="concept-card">
                <small>
                  <Sparkles /> CONCEPT EXTRACTED
                </small>
                <h3>{concept.title}</h3>
                <p>{concept.summary}</p>
                {proposalMessage && <small className="snapshot-line">{proposalMessage}</small>}
                {created ? (
                  <span className="status-tag LIVE">{created} LIVE</span>
                ) : (
                  <button className="lv-button primary" onClick={publishConcept}>
                    PUT IT TO A VOTE <ArrowUpRight />
                  </button>
                )}
              </div>
            )}
          </div>
          <form className="mayor-composer" onSubmit={send}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isReplying}
              placeholder="Tell Mayor what Landville needs…"
              aria-label="Message Mayor Scrapy"
            />
            <button aria-label="Send message" disabled={isReplying}>
              <Send />
            </button>
          </form>
        </section>
        <aside className="lv-panel mayor-face">
          <Image
            src="/scrapy-sheet.png"
            alt="Mayor Scrapy character sheet"
            width={1536}
            height={1024}
          />
          <h2>RESIDENT #0001</h2>
          <p>
            Mayor. Builder. Town clerk. Junkyard caretaker. Scrapy talks through a server-only AI
            route and has zero access to wallet keys, treasury signing, or deployment.
          </p>
          <div className="object-facts">
            <div>
              <dt>SARCASM</dt>
              <dd>MAX</dd>
            </div>
            <div>
              <dt>CARE</dt>
              <dd>HIGH</dd>
            </div>
            <div>
              <dt>DEPLOY ACCESS</dt>
              <dd>NONE</dd>
            </div>
          </div>
        </aside>
      </div>
    </ProductShell>
  );
}
