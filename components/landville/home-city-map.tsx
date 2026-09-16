'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  CircleDollarSign,
  Flag,
  MessageCircle,
  Pause,
  Play,
  UserRound,
  Vote,
} from 'lucide-react';

type Destination = {
  id: string;
  number: string;
  title: string;
  href: string;
  description: string;
  district: string;
};
const icons = [
  Building2,
  MessageCircle,
  Vote,
  CircleDollarSign,
  UserRound,
  BookOpen,
];
const positions = [
  [23, 23],
  [15, 51],
  [28, 80],
  [77, 23],
  [85, 51],
  [72, 80],
];
const routes = [
  'M500 275 L400 275 L400 126 L230 126',
  'M500 275 L150 275',
  'M500 275 L410 275 L410 440 L280 440',
  'M500 275 L600 275 L600 126 L770 126',
  'M500 275 L850 275',
  'M500 275 L590 275 L590 440 L720 440',
];

function DistrictBuilding({ index }: { index: number }) {
  const Icon = icons[index];
  const roof = index === 0 || index === 3;
  return (
    <svg className="lv-building" viewBox="0 0 180 140" aria-hidden="true">
      <path className="lv-building-shadow" d="M10 115 86 75 172 112 94 139Z" />
      <path fill="#303326" stroke="#727947" d="m20 103 70-34 70 34-70 34Z" />
      <path fill="#151b16" stroke="#777d4b" d="M39 56 90 80v47l-51-24Z" />
      <path fill="#272e20" stroke="#949866" d="m90 80 51-24v47l-51 24Z" />
      <path
        fill={roof ? '#525b32' : '#424836'}
        stroke="#c2c395"
        d={roof ? 'M31 56 89 17l61 39-60 28Z' : 'M31 56 88 28l62 28-60 28Z'}
      />
      <path
        fill="none"
        stroke="#879253"
        d={roof ? 'm89 17 1 67 60-28M31 56l59 28' : 'm42 55 46-21 49 22-47 22Z'}
      />
      <path fill="#101510" stroke="#a0ab69" d="m103 88 16-8v32l-16 8Z" />
      <path
        className="lv-window"
        d="m48 71 9 4v12l-9-4Zm18 8 9 4v12l-9-4Zm60-3 8-4v11l-8 4Z"
      />
      <path
        fill="none"
        stroke="#b9ff34"
        strokeWidth="2"
        d="m34 109 54 26 68-32"
      />
      <path stroke="#8a9160" d="M143 39V11" />
      <path className="lv-signal" fill="#d0ff00" d="M141 8h5v5h-5Z" />
      <path fill="#c98851" d="m23 105 10-5 7 3-10 6Z" />
      <g transform="translate(75 41)">
        <rect
          x="-4"
          y="-4"
          width="38"
          height="34"
          fill="#11170f"
          stroke="#95a544"
        />
        <Icon
          x={2}
          y={0}
          width={25}
          height={25}
          stroke="#d0ff00"
          strokeWidth={1.5}
        />
      </g>
    </svg>
  );
}

export function HomeCityMap({
  destinations,
}: {
  destinations: readonly Destination[];
}) {
  const [activeId, setActiveId] = useState('world');
  const [paused, setPaused] = useState(false);
  const [mayorHelp, setMayorHelp] = useState(false);
  const active =
    destinations.find((destination) => destination.id === activeId) ??
    destinations[0];

  return (
    <section
      id="town-map"
      className={`lv-map-section${paused ? ' lv-motion-paused' : ''}`}
      aria-labelledby="map-title"
    >
      <div className="lv-map-toolbar">
        <div>
          <span className="lv-map-marker" />
          <h2 id="map-title">TOWN DIRECTORY</h2>
          <span className="lv-map-instruction">CHOOSE A DISTRICT TO ENTER</span>
        </div>
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
          aria-label={paused ? 'Resume map animation' : 'Pause map animation'}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          <span>{paused ? 'RESUME MOTION' : 'PAUSE MOTION'}</span>
        </button>
      </div>
      <div className="lv-city-scene">
        <span
          className="lv-map-coordinate lv-map-coordinate-top"
          aria-hidden="true"
        >
          LV / MUNICIPAL DISTRICTS
          <br />
          ROBINHOOD CHAIN
        </span>
        <span
          className="lv-map-coordinate lv-map-coordinate-bottom"
          aria-hidden="true"
        >
          EST. BY CITIZENS
          <br />
          ROOM FOR YOUR NEXT IDEA
        </span>
        <svg
          className="lv-roads"
          viewBox="0 0 1000 550"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="lv-map-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M40 0H0V40"
                fill="none"
                stroke="#73814a"
                strokeOpacity=".12"
              />
            </pattern>
          </defs>
          <rect width="1000" height="550" fill="url(#lv-map-grid)" />
          <path
            className="lv-ring-road"
            d="M100 275 260 60h480l160 215-160 215H260Z"
          />
          {routes.map((route, index) => (
            <g
              key={route}
              className={
                destinations[index]?.id === activeId
                  ? 'lv-road-active'
                  : undefined
              }
            >
              <path className="lv-road-base" d={route} />
              <path className="lv-road-line" d={route} />
              <path className="lv-road-current" d={route} />
            </g>
          ))}
          <path className="lv-town-square" d="m500 190 120 85-120 85-120-85Z" />
        </svg>
        <div className="lv-mayor">
          <div className="lv-mayor-tag">
            <Flag size={11} /> MAYOR’S OFFICE
          </div>
          <button
            className="lv-mayor-button"
            type="button"
            aria-expanded={mayorHelp}
            aria-controls="lv-mayor-help"
            onClick={() => setMayorHelp((value) => !value)}
          >
            <span className="lv-mayor-portrait">
              <Image
                src="/scrapy-sheet.png"
                width={1536}
                height={1024}
                sizes="720px"
                alt="Scrapy, LANDVILLE’s scrap-metal robot mayor"
                preload
              />
            </span>
            <span className="lv-mayor-name">
              SCRAPY <span>AI MAYOR</span>
            </span>
            <span className="lv-mayor-hint">
              {mayorHelp ? 'CLOSE INTRODUCTION −' : 'MEET THE MAYOR +'}
            </span>
          </button>
          {mayorHelp && (
            <div id="lv-mayor-help" className="lv-mayor-help">
              <b>Got an idea for this town?</b>
              <p>
                I help turn it into a module. Tell me what it should do; you and
                the citizens decide what gets built.
              </p>
              <Link href="/chat">
                ASK SCRAPY <ArrowUpRight size={15} />
              </Link>
              <Link href="/docs/builder">
                HOW BUILDING WORKS <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
        </div>
        <nav className="lv-districts" aria-label="Interactive town map">
          {destinations.map((destination, index) => (
            <Link
              key={destination.id}
              href={destination.href}
              className={`lv-district lv-district-${destination.id}${activeId === destination.id ? ' lv-district-active' : ''}`}
              style={
                {
                  '--district-x': `${positions[index][0]}%`,
                  '--district-y': `${positions[index][1]}%`,
                  '--district-delay': `${index * -1.3}s`,
                } as CSSProperties
              }
              onMouseEnter={() => setActiveId(destination.id)}
              onFocus={() => setActiveId(destination.id)}
            >
              <DistrictBuilding index={index} />
              <span className="lv-district-title">
                <small>{destination.number}</small>
                {destination.title}
                <ArrowUpRight size={15} />
              </span>
              <span className="lv-district-subtitle">
                {destination.district}
              </span>
              <span className="lv-district-mobile-copy">
                {destination.description}
              </span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="lv-map-inspector">
        <span className="lv-inspector-number">{active.number}</span>
        <div aria-live="polite" aria-atomic="true">
          <strong>{active.title}</strong>
          <p>{active.description}</p>
        </div>
        <Link href={active.href} aria-label={`Open ${active.title}`}>
          ENTER <ArrowUpRight size={18} />
        </Link>
      </div>
    </section>
  );
}
