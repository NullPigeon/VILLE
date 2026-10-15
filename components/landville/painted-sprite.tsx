import { useId } from 'react';

/** A viewport onto a painted atlas. SVG supplies cropping only, never the artwork. */
export function PaintedSprite({ src, sheet, crop, label, className = '' }: {
  src: string; sheet: readonly [number, number]; crop: readonly [number, number, number, number];
  label?: string; className?: string;
}) {
  const clip = `sprite-${useId().replace(/:/g, '')}`;
  return <svg className={className} viewBox={crop.join(' ')}
    preserveAspectRatio="xMidYMax meet" style={{ overflow: 'hidden' }}
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <defs><clipPath id={clip}><rect x={crop[0]} y={crop[1]} width={crop[2]} height={crop[3]} /></clipPath></defs>
    <image href={src} width={sheet[0]} height={sheet[1]} clipPath={`url(#${clip})`} />
  </svg>;
}
