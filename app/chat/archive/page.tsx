'use client';
import Link from 'next/link';
import { ProductShell } from '@/components/landville/product-shell';
import { useCitizenChat } from '@/components/landville/use-citizen-chat';
import { useWallet } from '@/components/landville/wallet-provider';

export default function ChatArchivePage() {
  const wallet = useWallet();
  const chat = useCitizenChat('WORKSHOP');
  return <ProductShell title="PRIVATE ARCHIVE" eyebrow="OLD WORKSHOP / READ ONLY">
    <section className="lv-panel chat-sidebar-body"><p>New discussions happen in public Town Chat. Your old Workshop messages stay private and have not been copied there.</p><Link className="lv-button" href="/chat">BACK TO TOWN CHAT</Link>
      {!wallet.address ? <Link className="lv-button primary" href="/citizens">SIGN IN TO READ YOUR ARCHIVE</Link> : <>
        {chat.hasMore && <button className="lv-button" disabled={chat.loading} onClick={() => void chat.older()}>LOAD EARLIER MESSAGES</button>}
        {chat.error && <p role="alert">{chat.error}</p>}
        {!chat.messages.length && !chat.error && <p>No archived messages loaded.</p>}
        {chat.messages.map((message) => <article key={message.id}><h3>{message.author}</h3><p>{message.body}</p><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time></article>)}
      </>}
    </section>
  </ProductShell>;
}
