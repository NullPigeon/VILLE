import type { ReactNode } from 'react';
import Image from 'next/image';
import { blogVideo, safeBlogImage, type BlogBlock } from '@/lib/blog';

function inline(text: string): ReactNode[] {
  const pieces: ReactNode[] = [];
  const pattern = /\[([^\]]{1,160})\]\((https:\/\/[^\s)]+|\/(?!\/)[^\s)]*)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let position = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > position) pieces.push(text.slice(position, index));
    if (match[1]) pieces.push(<a key={index} href={match[2]} target={match[2].startsWith('https://') ? '_blank' : undefined} rel={match[2].startsWith('https://') ? 'noopener noreferrer' : undefined}>{match[1]}</a>);
    else if (match[3]) pieces.push(<strong key={index}>{match[3]}</strong>);
    else pieces.push(<em key={index}>{match[4]}</em>);
    position = index + match[0].length;
  }
  if (position < text.length) pieces.push(text.slice(position));
  return pieces;
}

export function BlogContent({ blocks }: { blocks: BlogBlock[] }) {
  return <div className="blog-article-body">{blocks.map((block, index) => {
    switch (block.type) {
      case 'heading': return block.text && <h2 key={block.id}>{inline(block.text)}</h2>;
      case 'subheading': return block.text && <h3 key={block.id}>{inline(block.text)}</h3>;
      case 'quote': return block.text && <blockquote key={block.id}>{inline(block.text)}</blockquote>;
      case 'list': return block.text && <ul key={block.id}>{block.text.split('\n').map((line, index) => line.trim() && <li key={index}>{inline(line.replace(/^[-•]\s*/, '').trim())}</li>)}</ul>;
      case 'image': return block.url && safeBlogImage(block.url) && <figure key={block.id}><Image unoptimized src={block.url} width={1200} height={800} alt={block.text || block.caption || ''} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
      case 'panel': {
        const art = block.url && safeBlogImage(block.url) ? block.url : null;
        return <section key={block.id} className={`blog-comic-panel ${block.layout === 'half' ? 'blog-comic-panel-half' : 'blog-comic-panel-wide'} ${art ? '' : 'blog-comic-panel-empty'}`} aria-label={`Comic panel ${index + 1}`}>
          {art && <Image unoptimized src={art} width={1400} height={850} alt={block.caption || block.text || `LANDVILLE scene ${index + 1}`} />}
          <span className="blog-comic-frame-number">FRAME {String(index + 1).padStart(2, '0')}</span>
          {block.caption && <span className="blog-comic-scene">{block.caption}</span>}
          {block.text && <div className="blog-comic-narration">{inline(block.text)}</div>}
          {block.speech && <div className="blog-comic-speech">{block.speaker && <strong>{block.speaker}</strong>}<span>{inline(block.speech)}</span></div>}
          {!art && <span className="blog-comic-empty-message">ADD PANEL ART</span>}
        </section>;
      }
      case 'video': {
        const video = block.url ? blogVideo(block.url) : null;
        // oxlint-disable-next-line jsx-a11y/media-has-caption -- Uploaded files may not include a timed caption track; the editor supports a visible caption below.
        return video && <figure key={block.id} className="blog-video">{video.kind === 'embed' ? <iframe src={video.src} title={block.text || 'LANDVILLE video'} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <video src={video.src} controls preload="metadata" playsInline />}{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
      }
      case 'divider': return <hr key={block.id} />;
      default: return block.text && <p key={block.id}>{inline(block.text)}</p>;
    }
  })}</div>;
}
