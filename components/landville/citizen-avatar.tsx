import { Fingerprint, Hammer, Radio, Rocket } from 'lucide-react';
export function CitizenAvatar({ avatar, className }: { avatar?: string; className?: string }) {
  const Icon = avatar === 'hammer' ? Hammer : avatar === 'radio' ? Radio : avatar === 'rocket' ? Rocket : Fingerprint;
  return <Icon className={className} aria-hidden="true" />;
}
