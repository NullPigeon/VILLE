export type BlogBlock = {
  id: string;
  type: 'paragraph' | 'heading' | 'subheading' | 'quote' | 'list' | 'image' | 'video' | 'panel' | 'divider';
  text: string;
  url?: string;
  caption?: string;
  speaker?: string;
  speech?: string;
  layout?: 'wide' | 'half';
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover_url: string | null;
  cover_alt: string;
  blocks: BlogBlock[];
  status: 'DRAFT' | 'PUBLISHED';
  author_wallet: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export const BLOG_BLOCK_TYPES: { type: BlogBlock['type']; label: string }[] = [
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'heading', label: 'Heading' },
  { type: 'subheading', label: 'Subheading' },
  { type: 'quote', label: 'Quote' },
  { type: 'list', label: 'List' },
  { type: 'image', label: 'Image' },
  { type: 'video', label: 'Video' },
  { type: 'panel', label: 'Comic panel' },
  { type: 'divider', label: 'Divider' },
];

export function newBlogBlock(type: BlogBlock['type'] = 'paragraph'): BlogBlock {
  return { id: crypto.randomUUID(), type, text: '' };
}

export function blogSlug(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}

export function blogVideo(url: string): { kind: 'file' | 'embed'; src: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    const host = parsed.hostname.toLowerCase();
    if (host === 'www.youtube.com' || host === 'youtube.com' || host === 'm.youtube.com') {
      const id = parsed.pathname.startsWith('/shorts/') ? parsed.pathname.split('/')[2] : parsed.searchParams.get('v');
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (host === 'vimeo.com' || host === 'www.vimeo.com') {
      const id = parsed.pathname.slice(1);
      if (/^\d{5,12}$/.test(id)) return { kind: 'embed', src: `https://player.vimeo.com/video/${id}` };
    }
    if (/\.(mp4|webm)$/i.test(parsed.pathname)) return { kind: 'file', src: parsed.toString() };
  } catch { /* Invalid URL. */ }
  return null;
}

export function safeBlogImage(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port;
  } catch { return url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') && !url.includes('\n'); }
}
