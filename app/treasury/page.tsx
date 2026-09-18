import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Construction,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import './reconstruction.css';

export const metadata: Metadata = {
  title: 'Treasury under reconstruction — LANDVILLE',
  description:
    'The LANDVILLE Treasury interface is temporarily unavailable while its governance and reward systems are rebuilt.',
  alternates: { canonical: '/treasury' },
};

export default function TreasuryPage() {
  return (
    <ProductShell title="TREASURY" eyebrow="CIVIC VAULT / UNDER RECONSTRUCTION">
      <section
        className="treasury-reconstruction"
        aria-labelledby="treasury-reconstruction-title"
      >
        <div className="treasury-reconstruction-grid" aria-hidden="true" />
        <div className="treasury-reconstruction-mark" aria-hidden="true">
          <Landmark />
          <Construction />
        </div>
        <div className="treasury-reconstruction-copy">
          <p className="treasury-reconstruction-status">
            <i /> SYSTEM STATUS / IN DEVELOPMENT
          </p>
          <h2 id="treasury-reconstruction-title">
            THE VAULT IS BEING REBUILT.
          </h2>
          <p>
            The Treasury dashboard, holder governance and creator-reward
            interface are temporarily unavailable while the system is under
            reconstruction.
          </p>
          <p>
            No Treasury proposals, votes or reward actions can be submitted from
            this page during development. Existing public blockchain records
            remain on Robinhood Chain.
          </p>
          <div className="treasury-reconstruction-actions">
            <Link className="lv-button primary" href="/world">
              <ArrowLeft /> RETURN TO WORLD
            </Link>
            <Link className="lv-button" href="/docs/treasury">
              READ DEVELOPMENT STATUS <BookOpen />
            </Link>
          </div>
        </div>
        <footer>
          <ShieldCheck /> TREASURY OPERATIONS ARE NOT AVAILABLE FROM THIS
          INTERFACE
        </footer>
      </section>
      <aside className="treasury-reconstruction-note">
        <span>WHAT IS BEING PREPARED</span>
        <div>
          <b>PUBLIC LEDGER</b>
          <small>Transparent balances and chain records</small>
        </div>
        <div>
          <b>HOLDER GOVERNANCE</b>
          <small>Reviewed proposals and voting</small>
        </div>
        <div>
          <b>CREATOR REWARDS</b>
          <small>Clear eligibility and payment status</small>
        </div>
        <Link href="/docs/roadmap">
          VIEW ROADMAP <ArrowUpRight />
        </Link>
      </aside>
    </ProductShell>
  );
}
