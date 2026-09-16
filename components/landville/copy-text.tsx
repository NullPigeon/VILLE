'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyText({
  text,
  label = 'Copy for X',
}: {
  text: string;
  label?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  }
  return (
    <div className="fg-copy fg-copy-wrap">
      <button
        className="fg-copy-button"
        type="button"
        onClick={() => void copy()}
      >
        {state === 'copied' ? <Check size={14} /> : <Copy size={14} />}
        {state === 'copied' ? 'Copied' : label}
      </button>
      <output>
        {state === 'failed'
          ? 'Could not copy. Select and copy the text above.'
          : state === 'copied'
            ? 'Copied to clipboard.'
            : ''}
      </output>
    </div>
  );
}
