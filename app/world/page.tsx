'use client';
import './yard-map.css';
import './world-explorer.css';
import './world-art.css';
import './city-world.css';

import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bot,
  Building2,
  CalendarDays,
  Heart,
  User,
  Vote,
  X,
  Check,
  Compass,
  Crown,
  Home,
  Map,
  Minus,
  Plus,
  RadioTower,
  RefreshCw,
  Search,
  Trophy,
} from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { useWallet } from '@/components/landville/wallet-provider';
import { AgentHouseArt } from '@/components/landville/agent-house-art';
import {
  WorldCityScenery,
  WorldSquareGround,
} from '@/components/landville/world-city-scenery';
import type { PublicYard } from '@/lib/personal-agent';
import {
  WORLD_DISTRICTS,
  objectDistrict,
  type WorldDistrictId,
} from '@/lib/world-districts';
import { readJsonResponse } from '@/lib/http-response';
import { WorldWelcome } from '@/components/landville/world-welcome';
import { WorldLife } from '@/components/landville/world-life';
import { WorldMission } from '@/components/landville/world-mission';
import { ScrapyBot } from '@/components/landville/scrapy-bot';
import { openCityChat } from '@/components/landville/mayor-presence';

const CITIZEN_SLOTS = [
  { x: 49, y: 59, mobileX: 49, mobileY: 42 },
  { x: 42, y: 46, mobileX: 48, mobileY: 72 },
  { x: 59, y: 48, mobileX: 49, mobileY: 101 },
  { x: 53, y: 74, mobileX: 49, mobileY: 130 },
  { x: 20, y: 63, mobileX: 49, mobileY: 145 },
  { x: 81, y: 56, mobileX: 49, mobileY: 160 },
];

function citizenPlacement(
  index: number,
): CSSProperties & Record<string, string> {
  const slot = CITIZEN_SLOTS[index % CITIZEN_SLOTS.length];
  const row = Math.floor(index / CITIZEN_SLOTS.length);

  return {
    '--citizen-x': `${slot.x}%`,
    '--citizen-y': `${slot.y + row * 4}%`,
    '--citizen-mobile-x': `${slot.mobileX}%`,
    '--citizen-mobile-y': `${slot.mobileY + row * 14}%`,
  };
}

export default function WorldPage() {
  const {
    objects,
    citizens,
    likeBudget,
    likeModule,
    status: townStatus,
    refresh,
  } = useLandville();
  const wallet = useWallet();
  const [selectedId, setSelectedId] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [likeError, setLikeError] = useState('');
  const [yards, setYards] = useState<PublicYard[]>([]);
  const [yardStatus, setYardStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [yardAttempt, setYardAttempt] = useState(0);
  const [yardQuery, setYardQuery] = useState('');
  const [activeDistrict, setActiveDistrict] = useState<WorldDistrictId | ''>(
    '',
  );
  const [exploration, setExploration] = useState<{
    districts: string[];
    places: string[];
  }>({ districts: [], places: [] });
  const [signalOpen, setSignalOpen] = useState(false);
  const [discovery, setDiscovery] = useState('');
  useEffect(() => {
    if (!discovery) return;
    const timer = window.setTimeout(() => setDiscovery(''), 3500);
    return () => window.clearTimeout(timer);
  }, [discovery]);
  const [signalTheme, setSignalTheme] = useState('acid');
  const [signalBusy, setSignalBusy] = useState(false);
  const [signalError, setSignalError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const stage = useRef<HTMLElement>(null);
  const bounds = useRef({ width: 0, height: 0 });
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    cameraX: number;
    cameraY: number;
  } | null>(null);
  const progressKey = `landville-world-exploration:${wallet.address || 'visitor'}`;
  const groups = WORLD_DISTRICTS.map((district) =>
    objects
      .filter((object) => objectDistrict(object) === district.id)
      .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })),
  );
  const districtRows = Math.max(
    2,
    ...groups.map((group) => Math.ceil(group.length / 2)),
  );
  const mapWidth = 1600;
  const townwideCount = groups[4].length;
  const baseMapHeight = Math.max(
    districtRows * 190 * 2 + 360,
    townwideCount * 190 + 500,
  );
  const extraYardRows = Math.ceil(Math.max(0, yards.length - 6) / 8);
  const mapHeight = baseMapHeight + extraYardRows * 135;
  const holder = Boolean(
    wallet.linkedWallet &&
    wallet.snapshot?.source === 'chain' &&
    Number(wallet.snapshot.tokenBalance) > 0,
  );
  const district = WORLD_DISTRICTS.find((item) => item.id === activeDistrict);
  const discoveredPlaces = objects.filter((object) =>
    exploration.places.includes(object.id),
  ).length;
  const selected = objects.find((item) => item.id === selectedId);
  const selectedIsOwn = Boolean(
    selected?.creatorWallet &&
    selected.creatorWallet.toLowerCase() === wallet.address.toLowerCase(),
  );
  const ownYard = yards.find(
    (yard) => yard.ownerWallet.toLowerCase() === wallet.address.toLowerCase(),
  );
  const visibleYards = yards.filter((yard) =>
    `${yard.houseName} ${yard.ownerLabel} ${yard.name}`
      .toLowerCase()
      .includes(yardQuery.trim().toLowerCase()),
  );

  useEffect(() => {
    let active = true;
    fetch('/api/yards', { cache: 'no-store' })
      .then((response) =>
        readJsonResponse<{ yards: PublicYard[] }>(
          response,
          'Load citizen yards',
        ),
      )
      .then((result) => {
        if (active) {
          setYards(result.yards);
          setYardStatus('ready');
        }
      })
      .catch(() => {
        if (active) setYardStatus('error');
      });
    return () => {
      active = false;
    };
  }, [yardAttempt]);

  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      bounds.current = { width, height };
      const zoom =
        width < 760
          ? 0.65
          : Math.min(width / mapWidth, height / mapHeight) * 0.96;
      setCamera({
        x: (width - mapWidth * zoom) / 2,
        y: height / 2 - baseMapHeight * 0.5 * zoom,
        zoom,
      });
    });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [baseMapHeight, mapHeight]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(
          window.localStorage.getItem(progressKey) || '{}',
        ) as { districts?: unknown; places?: unknown };
        setExploration({
          districts: Array.isArray(stored.districts)
            ? stored.districts.filter((id) =>
                WORLD_DISTRICTS.some((item) => item.id === id),
              )
            : [],
          places: Array.isArray(stored.places)
            ? stored.places.filter((id) => typeof id === 'string')
            : [],
        });
        const theme = window.localStorage.getItem('landville-world-signal');
        if (theme && ['acid', 'ember', 'electric'].includes(theme))
          setSignalTheme(theme);
        if (window.location.hash === '#signal') setSignalOpen(true);
      } catch {
        /* Exploration is optional device-local progress. */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [progressKey]);

  function remember(kind: 'districts' | 'places', id: string) {
    if (!exploration[kind].includes(id)) {
      const name = kind === 'districts' ? WORLD_DISTRICTS.find((item) => item.id === id)?.name : objects.find((item) => item.id === id)?.title;
      if (name) setDiscovery(name);
    }
    const next = {
      ...exploration,
      [kind]: [...new Set([...exploration[kind], id])],
    };
    setExploration(next);
    try {
      window.localStorage.setItem(progressKey, JSON.stringify(next));
    } catch {
      /* Keep playing when browser storage is unavailable. */
    }
  }

  function moveCamera(x: number, y: number, zoom: number) {
    const { width, height } = bounds.current;
    setCamera({ x: width / 2 - x * zoom, y: height / 2 - y * zoom, zoom });
  }

  function exploreDistrict(id: WorldDistrictId | '') {
    setActiveDistrict(id);
    const item = WORLD_DISTRICTS.find((entry) => entry.id === id);
    if (item && id !== 'townwide') {
      remember('districts', id);
      moveCamera(
        (mapWidth * item.x) / 100,
        (baseMapHeight * item.y) / 100,
        bounds.current.width < 760 ? 0.8 : 1.05,
      );
    } else {
      if (item) remember('districts', id);
      const zoom =
        Math.min(
          bounds.current.width / mapWidth,
          bounds.current.height / mapHeight,
        ) * 0.96;
      moveCamera(mapWidth / 2, mapHeight / 2, zoom);
    }
  }

  function zoomMap(delta: number) {
    const zoom = Math.max(0.2, Math.min(1.8, camera.zoom + delta));
    moveCamera(
      (bounds.current.width / 2 - camera.x) / camera.zoom,
      (bounds.current.height / 2 - camera.y) / camera.zoom,
      zoom,
    );
  }

  function beginDrag(event: PointerEvent<HTMLElement>) {
    if (
      event.button !== 0 ||
      (event.target as Element).closest('button,a,input,aside')
    )
      return;
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      cameraX: camera.x,
      cameraY: camera.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const gesture = drag.current;
    setCamera((previous) => ({
      ...previous,
      x: Math.max(
        120 - mapWidth * previous.zoom,
        Math.min(
          bounds.current.width - 120,
          gesture.cameraX + event.clientX - gesture.x,
        ),
      ),
      y: Math.max(
        120 - mapHeight * previous.zoom,
        Math.min(
          bounds.current.height - 120,
          gesture.cameraY + event.clientY - gesture.y,
        ),
      ),
    }));
  }

  function mapObjectPlacement(id: string): CSSProperties {
    const groupIndex = groups.findIndex((group) =>
      group.some((object) => object.id === id),
    );
    const item = WORLD_DISTRICTS[groupIndex];
    const index = groups[groupIndex].findIndex((object) => object.id === id);
    const rows = Math.ceil(groups[groupIndex].length / 2);
    let x =
      (mapWidth * item.x) / 100 +
      (groups[groupIndex].length === 1 ? 0 : index % 2 === 0 ? -112 : 112);
    let y =
      (baseMapHeight * item.y) / 100 +
      (Math.floor(index / 2) - (rows - 1) / 2) * 190;
    if (item.id === 'townwide') {
      x = mapWidth / 2;
      y = (baseMapHeight - townwideCount * 190 - 340) / 2 + index * 190;
      if (y >= baseMapHeight / 2 - 170) y += 340;
    }
    return {
      '--world-x': `${x}px`,
      '--world-y': `${y}px`,
      '--world-scale': '1',
      '--world-hover-scale': '1.07',
      '--world-tilt': `${index % 2 ? 1 : -1}deg`,
      '--world-depth': '5',
    } as CSSProperties;
  }

  function yardPosition(index: number) {
    if (index < 6)
      return {
        x: ([8, 92, 8, 92, 36, 65][index] / 100) * mapWidth,
        y: ([30, 30, 77, 77, 7, 93][index] / 100) * baseMapHeight,
      };
    return {
      x: 200 + ((index - 6) % 8) * 170,
      y: baseMapHeight + 65 + Math.floor((index - 6) / 8) * 135,
    };
  }

  async function refreshSignal() {
    setSignalBusy(true);
    setSignalError('');
    try {
      await wallet.refreshVotingPower();
    } catch (error) {
      setSignalError(
        error instanceof Error ? error.message : 'Balance check unavailable.',
      );
    } finally {
      setSignalBusy(false);
    }
  }

  function inspectObject(id: string) {
    remember('places', id);
    setSelectedId(id);
    setLikeError('');
    setDrawerOpen(true);
  }

  async function submitLike() {
    if (!selected || likeBusy) return;
    setLikeBusy(true);
    setLikeError('');
    try {
      await likeModule(selected.id);
    } catch (caught) {
      setLikeError(
        caught instanceof Error
          ? caught.message
          : 'The like could not be recorded.',
      );
    } finally {
      setLikeBusy(false);
    }
  }

  return (
    <ProductShell
      title="THE WORLD"
      eyebrow="LIVING CITY / BUILT BY CITIZENS"
      immersive
    >
      <section
        ref={stage}
        className={`world-canvas world-stage world-blank-canvas world-explorer signal-${holder ? signalTheme : 'acid'}${dragging ? ' is-dragging' : ''}`}
        aria-label="Interactive LANDVILLE city map"
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={() => {
          drag.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
      >
        {discovery && <output key={discovery} className="city-discovery-toast"><Compass /><span>NEW DISCOVERY<b>{discovery}</b></span><Check /></output>}
        <header className="world-city-status">
          <span>
            <i /> LANDVILLE / CHAPTER 01
          </span>
          <b>Your city. Still a little wild.</b>
          <small>Drag to explore · Tap a building to enter</small>
          {townStatus === 'unavailable' && (
            <button onClick={() => void refresh()}>
              CITY DATA UNAVAILABLE · RETRY <RefreshCw />
            </button>
          )}
        </header>
        <nav
          className="world-district-travel"
          aria-label="Travel around the city"
        >
          <button
            className={!activeDistrict ? 'active' : ''}
            onClick={() => exploreDistrict('')}
          >
            <Map /> CITY MAP
          </button>
          {WORLD_DISTRICTS.map((item) => (
            <button
              key={item.id}
              className={activeDistrict === item.id ? 'active' : ''}
              onClick={() => exploreDistrict(item.id)}
            >
              <b>{item.number}</b>
              {item.name}
              {exploration.districts.includes(item.id) && <Check />}
            </button>
          ))}
        </nav>
        <div className="world-like-meter" aria-label="Weekly module likes">
          <Heart />
          {wallet.address ? (
            <>
              <b>
                {likeBudget.remaining} / {likeBudget.allowance}
              </b>
              <small>LIKES LEFT THIS WEEK</small>
            </>
          ) : (
            <>
              <b>5 + SCRAPY</b>
              <small>SIGN IN TO LIKE MODULES</small>
            </>
          )}
        </div>
        <div
          className="world-map-scene"
          style={{
            width: mapWidth,
            height: mapHeight,
            transform: `translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`,
          }}
        >
          <svg
            className="world-district-land"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ height: baseMapHeight }}
            aria-hidden="true"
          >
            <path
              className={activeDistrict === 'dump' ? 'active dump' : 'dump'}
              d="M 7 10 L 44 8 L 45 40 L 10 44 Z"
            />
            <path
              className={activeDistrict === 'token' ? 'active token' : 'token'}
              d="M 58 9 L 94 11 L 90 43 L 57 40 Z"
            />
            <path
              className={activeDistrict === 'meme' ? 'active meme' : 'meme'}
              d="M 9 57 L 43 59 L 43 91 L 8 88 Z"
            />
            <path
              className={
                activeDistrict === 'market' ? 'active market' : 'market'
              }
              d="M 57 60 L 93 56 L 94 88 L 59 93 Z"
            />
          </svg>
          <WorldCityScenery height={baseMapHeight} />
          <svg
            className="world-road-map"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ height: baseMapHeight }}
            aria-hidden="true"
          >
            <g className="world-road-curbs">
              <path d="M 2 51 C 20 45 34 49 50 50 S 79 56 98 44" />
              <path d="M 50 1 C 47 20 55 34 50 50 S 45 78 54 99" />
              <path d="M 8 7 C 25 25 37 40 50 50 S 73 70 93 93" />
              <path d="M 92 7 C 76 24 62 40 50 50 S 29 72 8 92" />
            </g>
            <g className="world-road-beds">
              <path d="M 2 51 C 20 45 34 49 50 50 S 79 56 98 44" />
              <path d="M 50 1 C 47 20 55 34 50 50 S 45 78 54 99" />
              <path d="M 8 7 C 25 25 37 40 50 50 S 73 70 93 93" />
              <path d="M 92 7 C 76 24 62 40 50 50 S 29 72 8 92" />
            </g>
            <g className="world-road-marks">
              <path d="M 2 51 C 20 45 34 49 50 50 S 79 56 98 44" />
              <path d="M 50 1 C 47 20 55 34 50 50 S 45 78 54 99" />
              <path d="M 8 7 C 25 25 37 40 50 50 S 73 70 93 93" />
              <path d="M 92 7 C 76 24 62 40 50 50 S 29 72 8 92" />
            </g>
            <g className="world-road-signals">
              <path d="M 2 51 C 20 45 34 49 50 50 S 79 56 98 44" />
              <path d="M 50 1 C 47 20 55 34 50 50 S 45 78 54 99" />
            </g>
          </svg>

          <WorldSquareGround height={baseMapHeight} />
          <StreetProps height={baseMapHeight} />

          <button
            onClick={() => openCityChat({ room: 'TOWN' })}
            className="world-plaza"
            style={{ top: baseMapHeight / 2 }}
            aria-label="Visit Mayor Scrapy in Town Chat"
          >
            <ScrapyBot portrait />
            <span>SCRAPY SQUARE</span>
            <small>MEET THE MAYOR / BUILD OUTWARD</small>
          </button>

          {WORLD_DISTRICTS.map((item, index) => (
            <button
              key={item.id}
              className={`world-district-tag ${item.id}${activeDistrict === item.id ? ' active' : ''}`}
              style={
                {
                  left: (mapWidth * item.x) / 100,
                  top:
                    item.id === 'townwide'
                      ? baseMapHeight / 2 - 115
                      : (baseMapHeight * item.y) / 100 -
                        (Math.max(1, Math.ceil(groups[index].length / 2)) - 1) *
                          95 -
                        140,
                  '--district-color': item.color,
                } as CSSProperties
              }
              onClick={() => exploreDistrict(item.id)}
            >
              <b>{item.number}</b>
              {item.name.toUpperCase()} <Compass />
              {exploration.districts.includes(item.id) && <Check />}
            </button>
          ))}

          <button className="world-vacant-lot vacant-west" onClick={() => openCityChat({ room: 'BUILD', district: 'THE DUMP' })} aria-label="Suggest a building in The Dump">
            <b>+</b>
            <small>BUILD SOMETHING</small>
          </button>
          <button className="world-vacant-lot vacant-east" onClick={() => openCityChat({ room: 'BUILD', district: 'MARKET' })} aria-label="Suggest a building in Market">
            <b>+</b>
            <small>YOUR IDEA HERE</small>
          </button>
          <WorldLife height={baseMapHeight} />

          {objects.map((object) => (
            <article
              key={object.id}
              className={
                selectedId === object.id
                  ? 'world-object-card selected'
                  : 'world-object-card'
              }
              style={mapObjectPlacement(object.id)}
              data-discovered={exploration.places.includes(object.id)}
            >
              <div className="world-object-preview" aria-hidden="true">
                <Building2 />
                <iframe
                  title={`${object.title} static preview`}
                  src={`/api/modules/${encodeURIComponent(object.id)}/preview`}
                  sandbox=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  tabIndex={-1}
                />
              </div>
              <div className="world-object-label">
                <strong>{object.title}</strong>
                <small>{object.creator}</small>
                <span
                  className={
                    object.likedByViewer
                      ? 'world-object-likes liked'
                      : 'world-object-likes'
                  }
                >
                  <Heart /> {object.likes}
                </span>
              </div>
              {exploration.places.includes(object.id) && (
                <span
                  className="world-discovered-mark"
                  title="You have explored this place"
                >
                  <Check />
                </span>
              )}
              <button
                onClick={() => inspectObject(object.id)}
                aria-label={`Inspect ${object.title}`}
              />
            </article>
          ))}

          {citizens.map((citizen, index) => (
            <Link
              key={citizen.wallet}
              className="world-citizen-card"
              style={citizenPlacement(index)}
              href={`/citizens/${citizen.wallet}`}
              aria-label={`Open ${citizen.creator} citizen profile`}
            >
              {/* Public image endpoint streams bytes; town state carries no base64 artwork. */}
              <Image
                src={citizen.imagePath}
                alt={`${citizen.creator} LANDVILLE resident`}
                width={88}
                height={108}
                unoptimized
              />
              <small>{citizen.creator}</small>
            </Link>
          ))}

          {yards.map((yard, index) => (
            <Link
              key={yard.ownerWallet}
              className={`world-yard-house${yard.ownerWallet === ownYard?.ownerWallet ? ' own-yard' : ''}${holder && yard.ownerWallet === ownYard?.ownerWallet ? ' holder-yard' : ''}`}
              style={
                {
                  '--yard-x': `${yardPosition(index).x}px`,
                  '--yard-y': `${yardPosition(index).y}px`,
                } as CSSProperties
              }
              href={`/yard/${yard.ownerWallet}`}
              aria-label={`Visit ${yard.houseName}, ${yard.ownerLabel}'s yard`}
            >
              <AgentHouseArt style={yard.houseStyle} />
              {holder && yard.ownerWallet === ownYard?.ownerWallet && (
                <Crown className="world-house-signal" />
              )}
              <span>
                {yard.ownerWallet === ownYard?.ownerWallet
                  ? 'YOUR HOME · '
                  : ''}
                {yard.houseName}
              </span>
            </Link>
          ))}
        </div>

        <aside
          className="world-exploration-hud"
          aria-label="Your exploration progress"
        >
          <div>
            <Compass />
            <span>
              <small>
                {exploration.districts.length === WORLD_DISTRICTS.length
                  ? 'CITY SCOUT / CHAPTER 01'
                  : 'CITY EXPLORER / CHAPTER 01'}
              </small>
              <b>
                {exploration.districts.length} / {WORLD_DISTRICTS.length}{' '}
                DISTRICTS EXPLORED
              </b>
            </span>
            {exploration.districts.length === WORLD_DISTRICTS.length && (
              <Trophy />
            )}
          </div>
          <div className="world-exploration-track">
            {WORLD_DISTRICTS.map((item) => (
              <i
                key={item.id}
                className={
                  exploration.districts.includes(item.id) ? 'done' : ''
                }
              />
            ))}
          </div>
          <small>
            {discoveredPlaces} / {objects.length} PLACES DISCOVERED · ON THIS
            DEVICE
          </small>
          <WorldMission
            explored={exploration.districts.length > 0}
            discovered={discoveredPlaces > 0}
            hasPlaces={objects.length > 0}
            hasYard={Boolean(ownYard)}
            profileHref={wallet.address ? `/citizens/${wallet.address}#your-agent` : '/citizens'}
            onExplore={() => exploreDistrict(WORLD_DISTRICTS[groups.findIndex((group) => group.length) >= 0 ? groups.findIndex((group) => group.length) : 0].id)}
            onDiscover={() => {
              const target = objects.find((item) => !exploration.places.includes(item.id)) || objects[0];
              if (!target) return;
              const place = WORLD_DISTRICTS.find((item) => item.id === objectDistrict(target))!;
              setActiveDistrict(place.id);
              moveCamera(mapWidth * place.x / 100, baseMapHeight * place.y / 100, bounds.current.width < 760 ? .8 : 1.05);
              inspectObject(target.id);
            }}
          />
          <details className="city-minimap-disclosure"><summary>District shortcuts</summary><div className="world-minimap" aria-label="District shortcuts">
            {WORLD_DISTRICTS.map((item) => (
              <button
                key={item.id}
                onClick={() => exploreDistrict(item.id)}
                className={activeDistrict === item.id ? 'active' : ''}
                aria-label={`Travel to ${item.name}`}
              >
                <b>{item.number}</b>
                <small>{item.name}</small>
              </button>
            ))}
            <span className="world-minimap-square" aria-hidden="true" />
          </div></details>
        </aside>
        <div className="world-camera-tools" aria-label="Map controls">
          <button onClick={() => zoomMap(0.15)} aria-label="Zoom in">
            <Plus />
          </button>
          <output>{Math.round(camera.zoom * 100)}%</output>
          <button onClick={() => zoomMap(-0.15)} aria-label="Zoom out">
            <Minus />
          </button>
          <button
            onClick={() => exploreDistrict('')}
            aria-label="Show whole city"
          >
            <Map />
          </button>
          {ownYard && (
            <button
              onClick={() => {
                const point = yardPosition(yards.indexOf(ownYard));
                moveCamera(point.x, point.y, 1.2);
                setActiveDistrict('');
              }}
              aria-label="Find my yard"
            >
              <Home />
            </button>
          )}
        </div>
        {district && (
          <aside className="world-district-visit" aria-live="polite">
            <small>DISTRICT {district.number} / YOU ARE HERE</small>
            <h2>{district.name}</h2>
            <p>{district.description}</p>
            <span>
              {groups[WORLD_DISTRICTS.indexOf(district)].length} PUBLISHED
              PLACES
            </span>
            <button className="city-district-build" onClick={() => openCityChat({ room: 'BUILD', district: district.proposalLabel })}><Bot /> BUILD HERE</button>
            <button onClick={() => exploreDistrict('')}>
              <Map /> BACK TO CITY
            </button>
          </aside>
        )}
        <button
          className={`world-signal-trigger${holder ? ' verified' : ''}`}
          aria-expanded={signalOpen}
          onClick={() => setSignalOpen((value) => !value)}
        >
          <RadioTower />
          {holder ? 'SCRAPY SIGNAL ACTIVE' : 'YOUR SCRAPY SIGNAL'}
        </button>
        {signalOpen && (
          <aside id="world-signal-panel" className="world-signal-panel">
            <header>
              <span>
                <RadioTower /> CITY SIGNAL
              </span>
              <button
                onClick={() => setSignalOpen(false)}
                aria-label="Close token signal"
              >
                <X />
              </button>
            </header>
            <h2>{holder ? 'YOUR BEACON IS ON.' : 'BRING YOUR SIGNAL.'}</h2>
            <p>
              {holder
                ? `${wallet.snapshot?.tokenBalanceFormatted} SCRAPY · VERIFIED AT BLOCK ${wallet.snapshot?.blockNumber}`
                : 'A positive SCRAPY balance lights up your own home beacon and unlocks personal city light palettes.'}
            </p>
            <div className="world-signal-stats">
              <div>
                <b>{wallet.snapshot?.weight ?? '—'}</b>
                <small>VOTE POWER</small>
              </div>
              <div>
                <b>{wallet.address ? likeBudget.allowance : '—'}</b>
                <small>WEEKLY LIKES</small>
              </div>
            </div>
            <small className="world-signal-rule">
              1 BASE VOTE + 1 PER FULL 250K SCRAPY · 5 BASE WEEKLY LIKES + THE
              SAME BONUS
            </small>
            <div className="world-signal-palettes">
              {[
                { id: 'acid', name: 'SCRAPY GREEN' },
                { id: 'ember', name: 'FOUNDRY AMBER' },
                { id: 'electric', name: 'SIGNAL BLUE' },
              ].map((theme) => (
                <button
                  key={theme.id}
                  className={signalTheme === theme.id && holder ? 'active' : ''}
                  disabled={!holder}
                  onClick={() => {
                    setSignalTheme(theme.id);
                    try {
                      window.localStorage.setItem(
                        'landville-world-signal',
                        theme.id,
                      );
                    } catch {
                      /* Optional preference. */
                    }
                  }}
                >
                  <i className={theme.id} />
                  {theme.name}
                </button>
              ))}
            </div>
            <p className="world-signal-note">
              Your beacon and palette personalize your view of the city.
            </p>
            {wallet.linkedWallet ? (
              <button
                className="lv-button"
                disabled={signalBusy}
                onClick={() => void refreshSignal()}
              >
                <RefreshCw />
                {signalBusy ? 'CHECKING…' : 'REFRESH SIGNAL'}
              </button>
            ) : (
              <Link className="lv-button" href="/citizens">
                LINK A WALLET
              </Link>
            )}
            {signalError && <p role="alert">{signalError}</p>}
          </aside>
        )}

        {drawerOpen && (
          <button
            className="world-drawer-scrim"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close object menu"
          />
        )}
        {selected && (
          <aside
            id="world-object-drawer"
            className={drawerOpen ? 'world-drawer open' : 'world-drawer'}
            aria-hidden={!drawerOpen}
          >
            <header className="world-drawer-head">
              <div>
                <small>BUILT OBJECT</small>
                <h2>{selected.title}</h2>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close object menu"
              >
                <X />
              </button>
            </header>

            <div className="object-detail world-object-detail">
              <div className="object-art">
                <Building2 />
              </div>
              <small>
                {selected.kind.toUpperCase()} / {selected.district}
              </small>
              <p>{selected.description}</p>
              <dl className="object-facts">
                <div>
                  <dt>
                    <User /> BUILT BY
                  </dt>
                  <dd>{selected.creator}</dd>
                </div>
                <div>
                  <dt>
                    <Vote /> FINAL POWER
                  </dt>
                  <dd>{selected.yesPercent}% YES</dd>
                </div>
                <div>
                  <dt>
                    <CalendarDays /> BUILT
                  </dt>
                  <dd>{selected.builtAt}</dd>
                </div>
              </dl>
              <section className="world-like-control" aria-label="Module likes">
                <div>
                  <Heart className={selected.likedByViewer ? 'liked' : ''} />
                  <span>
                    <b>{selected.likes} LIKES</b>
                    <small>
                      {likeBudget.remaining} OF {likeBudget.allowance} LEFT THIS
                      UTC WEEK
                    </small>
                  </span>
                </div>
                <p>
                  Every citizen gets 5 weekly likes, plus 1 for each complete
                  250K SCRAPY. Likes do not accumulate.
                </p>
                <button
                  className="lv-button primary"
                  onClick={() => void submitLike()}
                  disabled={
                    !wallet.address ||
                    selectedIsOwn ||
                    selected.likedByViewer ||
                    likeBudget.remaining < 1 ||
                    likeBusy
                  }
                >
                  <Heart />{' '}
                  {likeBusy
                    ? 'STAMPING...'
                    : selectedIsOwn
                      ? 'YOUR OWN MODULE'
                      : selected.likedByViewer
                        ? 'LIKED'
                        : likeBudget.remaining < 1
                          ? 'NO LIKES LEFT'
                          : 'LIKE THIS MODULE'}
                </button>
                {likeError && (
                  <span className="world-like-error">{likeError}</span>
                )}
              </section>
              <button className="lv-button" onClick={() => { setDrawerOpen(false); openCityChat({ room: 'BUILD', district: selected.district, idea: `I have an idea inspired by ${selected.title}. Help me design a new building.` }); }}>
                BUILD SOMETHING LIKE THIS <Bot />
              </button>
              {selected.modulePath && (
                <Link className="lv-button primary" href={selected.modulePath}>
                  OPEN {selected.title}
                </Link>
              )}
            </div>
          </aside>
        )}
        <WorldWelcome />
      </section>
      <section
        id="yards"
        className="world-yard-district"
        aria-label="Citizen yards"
      >
        <div>
          <small>EXPANDING DISTRICT / PERSONAL LOTS</small>
          <h2>Citizen yards</h2>
          <p>
            Every home on the map belongs to a citizen and their personal robot.
            Visit a lot, or build yours from your profile.
          </p>
          <Link className="lv-button" href="/citizens">
            BUILD MY YARD
          </Link>
          <label className="world-yard-directory-tools">
            <Search />
            <span className="sr-only">Search citizen yards</span>
            <input
              value={yardQuery}
              onChange={(event) => setYardQuery(event.target.value)}
              placeholder="Find a home, owner, or robot"
            />
          </label>
        </div>
        <div className="world-yard-list">
          {yardStatus === 'loading' ? (
            <p>Finding citizen yards…</p>
          ) : yardStatus === 'error' ? (
            <div className="world-yard-error" role="alert">
              <span>
                Yards are temporarily unavailable. Your saved homes have not
                been removed.
              </span>
              <button
                className="lv-button"
                onClick={() => {
                  setYardStatus('loading');
                  setYardAttempt((attempt) => attempt + 1);
                }}
              >
                <RefreshCw /> TRY AGAIN
              </button>
            </div>
          ) : visibleYards.length ? (
            [...visibleYards]
              .sort(
                (a, b) =>
                  Number(b.ownerWallet === ownYard?.ownerWallet) -
                  Number(a.ownerWallet === ownYard?.ownerWallet),
              )
              .map((yard) => (
                <Link href={`/yard/${yard.ownerWallet}`} key={yard.ownerWallet}>
                  <AgentHouseArt style={yard.houseStyle} />
                  <span>
                    <b>{yard.houseName}</b>
                    <small>
                      {yard.ownerLabel} · {yard.name}
                    </small>
                  </span>
                </Link>
              ))
          ) : (
            <p>
              {yardQuery
                ? 'No yards match that search.'
                : 'No citizen yards built yet. Be first on the map.'}
            </p>
          )}
        </div>
      </section>
    </ProductShell>
  );
}

function StreetProps({ height }: { height: number }) {
  return (
    <div className="world-street-props" style={{ height }} aria-hidden="true">
      {[
        [19, 48],
        [37, 48],
        [61, 52],
        [81, 52],
        [48, 18],
        [51, 35],
        [48, 66],
        [53, 84],
      ].map(([x, y], index) => (
        <svg
          key={index}
          className="world-street-lamp"
          style={{ left: `${x}%`, top: `${y}%` }}
          viewBox="0 0 30 65"
        >
          <path
            d="M 6 63 H 25 M 16 61 V 14 L 22 7 H 5"
            stroke="#77794a"
            strokeWidth="3"
            fill="none"
          />
          <path d="M 4 6 H 13 V 11 H 4 Z" className="lamp-glow" />
          <path d="M 12 61 H 20 V 64 H 12 Z" fill="#353d25" />
        </svg>
      ))}
      {[
        [13, 14],
        [35, 89],
        [84, 17],
        [86, 86],
        [10, 61],
        [89, 63],
      ].map(([x, y], index) => (
        <i
          key={index}
          className="world-scrap-stack"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      ))}
    </div>
  );
}
