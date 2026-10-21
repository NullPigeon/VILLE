'use client';
import './yard-map.css';
import './world-explorer.css';
import './world-art.css';
import './city-world.css';

import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
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
  ClipboardList,
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
  Shirt,
} from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { useWallet } from '@/components/landville/wallet-provider';
import { AgentHouseArt } from '@/components/landville/agent-house-art';
import type { PublicYard } from '@/lib/personal-agent';
import {
  WORLD_DISTRICTS,
  objectDistrict,
  type WorldDistrictId,
} from '@/lib/world-districts';
import { readJsonResponse } from '@/lib/http-response';
import { GameHero, HERO_SKINS, HERO_SKIN_LABELS, type HeroSkin } from '@/components/landville/game-hero';
import { PersonalRobot, ROBOT_SKINS, ROBOT_SKIN_LABELS, type RobotSkin } from '@/components/landville/personal-robot';
import { WorldAgentChat } from '@/components/landville/world-agent-chat';
import { WorldMission } from '@/components/landville/world-mission';
import { WorldBuildingArt } from '@/components/landville/world-building-art';
import { WorldFeatureArt } from '@/components/landville/world-feature-art';
import { worldFeatureKindFromBrief, worldFeaturePlacement } from '@/lib/world-change';
import './frontier-art.css';
import './world-actors.css';
import './world-game-map.css';
import './world-ink.css';
import './world-overview.css';
import './world-painted-map.css';
import './world-living-map.css';
import './world-revision.css';
import { ScrapyBot } from '@/components/landville/scrapy-bot';
import { openCityChat } from '@/components/landville/mayor-presence';
import { residentSpawn, type WorldPresence, type WorldResident } from '@/lib/world-presence';
import { agentWorldMotion } from '@/lib/agent-world-motion';
import { buildingPosition, walkingPosition, worldCamera, worldMinimumZoom, type MapFootprint } from '@/lib/world-map-layout';

const CITIZEN_SLOTS = [
  { x: 31, y: 37, mobileX: 49, mobileY: 42 },
  { x: 69, y: 37, mobileX: 48, mobileY: 72 },
  { x: 31, y: 63, mobileX: 49, mobileY: 101 },
  { x: 69, y: 63, mobileX: 49, mobileY: 130 },
  { x: 46, y: 33, mobileX: 49, mobileY: 145 },
  { x: 54, y: 67, mobileX: 49, mobileY: 160 },
];

function citizenPlacement(
  index: number,
): CSSProperties & Record<string, string> {
  const slot = CITIZEN_SLOTS[index % CITIZEN_SLOTS.length];
  const row = Math.floor(index / CITIZEN_SLOTS.length);

  return {
    '--citizen-x': `${slot.x}%`,
    '--citizen-y': `${Math.min(94, slot.y + row * 3)}%`,
    '--citizen-mobile-x': `${slot.mobileX}%`,
    '--citizen-mobile-y': `${slot.mobileY + row * 14}%`,
  };
}

type SavedHero = { skin?: string; robotSkin?: string; x?: number; y?: number; mapVersion?: number };
type WorldEncounter = { id: string; occurredAt: string; jobId: string; jobTitle: string;
  jobStatus: string; winnerOwner: string | null; robots: Array<{ owner: string; name: string }> };

function restoredHeroPosition(saved: SavedHero, width: number, height: number, fallback: { x: number; y: number }) {
  const legacy = saved.mapVersion !== 2;
  return {
    x: typeof saved.x === 'number' && Number.isFinite(saved.x)
      ? legacy ? width * (.35 + Math.max(0, Math.min(1, saved.x / 2000)) * .3) : Math.max(70, Math.min(width - 70, saved.x))
      : fallback.x,
    y: typeof saved.y === 'number' && Number.isFinite(saved.y)
      ? legacy ? height * (.32 + Math.max(0, Math.min(1, saved.y / 2600)) * .36) : Math.max(90, Math.min(height - 80, saved.y))
      : fallback.y,
  };
}

export default function WorldPage() {
  const {
    objects,
    citizens,
    proposals,
    worldFeatures,
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
  const [encounters, setEncounters] = useState<WorldEncounter[]>([]);
  const [yardStatus, setYardStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [yardAttempt, setYardAttempt] = useState(0);
  const [yardQuery, setYardQuery] = useState('');
  const [activeDistrict, setActiveDistrict] = useState<WorldDistrictId | ''>(
    '',
  );
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [hudOpen, setHudOpen] = useState(false);
  const [previewId, setPreviewId] = useState('');
  const previewFocused = useRef('');
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('preview') || '';
    if (!/^LV-[1-9][0-9]{0,15}$/.test(id)) return;
    const timer = window.setTimeout(() => setPreviewId(id), 0);
    return () => window.clearTimeout(timer);
  }, []);
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
  const [heroPosition, setHeroPosition] = useState({ x: 870, y: 620 });
  const [heroSkin, setHeroSkin] = useState<HeroSkin | 'MODULE'>('SCAVENGER');
  const [robotSkin, setRobotSkin] = useState<RobotSkin>('RUST');
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [agentChatOpen, setAgentChatOpen] = useState(false);
  const [heroWalking, setHeroWalking] = useState(false);
  const [worldClock, setWorldClock] = useState(0);
  const [residents, setResidents] = useState<WorldResident[]>([]);
  const [positions, setPositions] = useState<WorldPresence[]>([]);
  const [presenceStatus, setPresenceStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const presenceInitialized = useRef('');
  const deviceInitialized = useRef('');
  const presenceSave = useRef<number | null>(null);
  const localEdit = useRef(false);
  const cameraTouched = useRef(false);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const stage = useRef<HTMLElement>(null);
  useEffect(() => {
    const showOverview = () => setOverviewOpen(true);
    window.addEventListener('landville:open-welcome', showOverview);
    return () => window.removeEventListener('landville:open-welcome', showOverview);
  }, []);
  const bounds = useRef({ width: 0, height: 0 });
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    cameraX: number;
    cameraY: number;
    moved: boolean;
    worldTarget: boolean;
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
  const mapWidth = 5200;
  const townwideCount = groups[4].length;
  const baseMapHeight = Math.max(
    2800,
    districtRows * 240 * 2 + 480,
    townwideCount * 240 + 650,
  );
  const extraYardRows = Math.ceil(Math.max(0, yards.length - 6) / 8);
  const mapHeight = baseMapHeight + extraYardRows * 190;
  const previewProposal = proposals.find((item) => item.id === previewId && item.category === 'WORLD');
  const publishedPreview = worldFeatures.find((item) => item.proposalId === previewId);
  const previewKind = previewProposal ? worldFeatureKindFromBrief(previewProposal.summary.split("SCRAPY'S PLAN:\n")[1] || '') : null;
  const previewPosition = previewProposal ? worldFeaturePlacement(previewProposal.id, previewProposal.district) : null;
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
  const ownPublishedCharacter = citizens.find((citizen) => citizen.wallet.toLowerCase() === wallet.address.toLowerCase());
  const positionsByWallet = new globalThis.Map(positions.map((position) => [position.wallet.toLowerCase(), position]));
  const residentWallets = new Set(residents.map((resident) => resident.wallet.toLowerCase()));

  const minimumZoom = useCallback(() => {
    const { width, height } = bounds.current;
    return worldMinimumZoom(width, height, mapWidth, mapHeight);
  }, [mapHeight]);

  const clampCamera = useCallback((x: number, y: number, requestedZoom: number) => {
    const { width, height } = bounds.current;
    return worldCamera(x, y, requestedZoom, width, height, mapWidth, mapHeight);
  }, [mapHeight]);

  const moveCamera = (x: number, y: number, zoom: number) => {
    const { width, height } = bounds.current;
    cameraTouched.current = true;
    setCamera(clampCamera(width / 2 - x * zoom, height / 2 - y * zoom, zoom));
  };

  useEffect(() => {
    if (!wallet.address) return;
    const owner = wallet.address.toLowerCase();
    if (deviceInitialized.current === owner) return;
    deviceInitialized.current = owner;
    localEdit.current = false;
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(`landville-hero:${wallet.address.toLowerCase()}`) || '{}') as SavedHero;
        setHeroSkin(saved.skin === 'MODULE' || HERO_SKINS.some((skin) => skin === saved.skin) ? saved.skin as HeroSkin | 'MODULE' : 'SCAVENGER');
        setRobotSkin(ROBOT_SKINS.some((skin) => skin === saved.robotSkin) ? saved.robotSkin as RobotSkin : 'RUST');
        setHeroPosition(restoredHeroPosition(saved, mapWidth, baseMapHeight, { x: mapWidth / 2, y: baseMapHeight / 2 + 140 }));
      } catch { /* Device-local appearance never blocks World. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [wallet.address, baseMapHeight]);

  useEffect(() => {
    const tick = () => setWorldClock(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadEncounters() {
      try {
        const response = await fetch('/api/world/encounters', { cache: 'no-store' });
        const result = await readJsonResponse<{ encounters: WorldEncounter[] }>(response, 'Load robot encounters');
        if (active) setEncounters(result.encounters);
      } catch { if (active) setEncounters([]); }
    }
    void loadEncounters();
    const timer = window.setInterval(() => { void loadEncounters(); }, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadPresence() {
      try {
        const response = await fetch('/api/world/presence', { cache: 'no-store' });
        const result = await readJsonResponse<{ residents: WorldResident[]; positions: WorldPresence[] }>(response, 'Load city residents');
        if (!active) return;
        setResidents(result.residents);
        setPositions(result.positions);
        setPresenceStatus('ready');
        const current = wallet.address.toLowerCase();
        if (current && presenceInitialized.current !== current && !localEdit.current) {
          const own = result.positions.find((position) => position.wallet.toLowerCase() === current);
          if (own) {
            setHeroPosition({ x: own.x / 10000 * mapWidth, y: own.y / 10000 * mapHeight });
            setHeroSkin(own.heroSkin);
            setRobotSkin(own.robotSkin);
          } else {
            const resident = result.residents.find((entry) => entry.wallet.toLowerCase() === current);
            if (resident) {
              const spawn = residentSpawn(resident.citizenNumber);
              let saved: SavedHero = {};
              try { saved = JSON.parse(window.localStorage.getItem(`landville-hero:${current}`) || '{}'); } catch { /* Use city spawn. */ }
              const { x, y } = restoredHeroPosition(saved, mapWidth, mapHeight, { x: spawn.x / 10000 * mapWidth, y: spawn.y / 10000 * mapHeight });
              const skin = saved.skin === 'MODULE' || HERO_SKINS.some((value) => value === saved.skin) ? saved.skin as HeroSkin | 'MODULE' : 'SCAVENGER';
              const robot = ROBOT_SKINS.some((value) => value === saved.robotSkin) ? saved.robotSkin as RobotSkin : 'RUST';
              setHeroPosition({ x, y });
              setHeroSkin(skin);
              setRobotSkin(robot);
              fetch('/api/world/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x: Math.round(x / mapWidth * 10000), y: Math.round(y / mapHeight * 10000), heroSkin: skin, robotSkin: robot }) })
                .then((response) => readJsonResponse<{ position: WorldPresence }>(response, 'Join the city'))
                .then((joined) => { if (active) setPositions((previous) => [...previous.filter((entry) => entry.wallet.toLowerCase() !== current), joined.position]); })
                .catch(() => { if (active) setPresenceStatus('error'); });
            }
          }
          presenceInitialized.current = current;
        }
      } catch {
        if (active) setPresenceStatus('error');
      }
    }
    const first = window.setTimeout(loadPresence, 0);
    const timer = window.setInterval(loadPresence, 5000);
    return () => { active = false; window.clearTimeout(first); window.clearInterval(timer); };
  }, [wallet.address, mapHeight]);

  useEffect(() => () => { if (presenceSave.current) window.clearTimeout(presenceSave.current); }, []);

  useEffect(() => {
    if (!heroWalking) return;
    const timer = window.setTimeout(() => setHeroWalking(false), 2400);
    return () => window.clearTimeout(timer);
  }, [heroWalking, heroPosition]);

  function saveAppearance(skin: HeroSkin | 'MODULE', robot: RobotSkin, position = heroPosition) {
    if (!wallet.address) return;
    localEdit.current = true;
    try {
      window.localStorage.setItem(`landville-hero:${wallet.address.toLowerCase()}`, JSON.stringify({ skin, robotSkin: robot, x: position.x, y: position.y, mapVersion: 2 }));
    } catch { /* Keep playing without local storage. */ }
    if (presenceSave.current) window.clearTimeout(presenceSave.current);
    const owner = wallet.address.toLowerCase();
    presenceSave.current = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/world/presence', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x: Math.round(position.x / mapWidth * 10000), y: Math.round(position.y / mapHeight * 10000), heroSkin: skin, robotSkin: robot }),
        });
        const result = await readJsonResponse<{ position: WorldPresence }>(response, 'Save city position');
        if (wallet.address.toLowerCase() !== owner) return;
        setPositions((previous) => [...previous.filter((entry) => entry.wallet.toLowerCase() !== owner), result.position]);
        setPresenceStatus('ready');
      } catch { setPresenceStatus('error'); }
    }, 450);
  }

  function chooseHeroSkin(skin: HeroSkin | 'MODULE') {
    setHeroSkin(skin);
    saveAppearance(skin, robotSkin);
    moveCamera(heroPosition.x, heroPosition.y, 1.05);
    setWardrobeOpen(false);
  }

  function walkTo(x: number, y: number) {
    if (!wallet.address) return;
    const position = { x: Math.max(70, Math.min(mapWidth - 70, x)), y: Math.max(90, Math.min(mapHeight - 80, y)) };
    setHeroPosition(position);
    setHeroWalking(true);
    saveAppearance(heroSkin, robotSkin, position);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!wallet.address || wardrobeOpen || drawerOpen || event.altKey || event.ctrlKey || event.metaKey ||
        (event.target instanceof Element && event.target.closest('input,textarea,select,button,a,[contenteditable="true"]'))) return;
      const delta: Record<string, [number, number]> = {
        ArrowUp: [0, -75], KeyW: [0, -75], ArrowDown: [0, 75], KeyS: [0, 75],
        ArrowLeft: [-75, 0], KeyA: [-75, 0], ArrowRight: [75, 0], KeyD: [75, 0],
      };
      const step = delta[event.code];
      if (!step) return;
      event.preventDefault();
      const nextX = Math.max(70, Math.min(mapWidth - 70, heroPosition.x + step[0]));
      const nextY = Math.max(90, Math.min(mapHeight - 80, heroPosition.y + step[1]));
      walkTo(nextX, nextY);
      const screenX = nextX * camera.zoom + camera.x;
      const screenY = nextY * camera.zoom + camera.y;
      if (screenX < bounds.current.width * .17 || screenX > bounds.current.width * .83 ||
        screenY < bounds.current.height * .2 || screenY > bounds.current.height * .76) {
        moveCamera(nextX, nextY, camera.zoom);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });
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
      const previousBounds = bounds.current;
      bounds.current = { width, height };
      setCamera((previous) => {
        if (cameraTouched.current && previousBounds.width) {
          const focusX = (previousBounds.width / 2 - previous.x) / previous.zoom;
          const focusY = (previousBounds.height / 2 - previous.y) / previous.zoom;
          return clampCamera(width / 2 - focusX * previous.zoom, height / 2 - focusY * previous.zoom, previous.zoom);
        }
        const zoom = Math.max(minimumZoom(), width < 760 ? 0.72 : 0.84);
        return clampCamera(width / 2 - mapWidth / 2 * zoom, height / 2 - baseMapHeight / 2 * zoom, zoom);
      });
    });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [baseMapHeight, clampCamera, minimumZoom]);

  useEffect(() => {
    if (!previewId || !previewProposal || !previewKind || previewFocused.current === previewId || !bounds.current.width) return;
    const location = publishedPreview || previewPosition;
    if (!location) return;
    previewFocused.current = previewId;
    const zoom = bounds.current.width < 760 ? .7 : .95;
    const x = mapWidth * location.x / 100;
    const y = baseMapHeight * location.y / 100;
    const timer = window.setTimeout(() => {
      setOverviewOpen(false);
      setCamera(clampCamera(bounds.current.width / 2 - x * zoom, bounds.current.height / 2 - y * zoom, zoom));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [previewId, previewProposal, previewKind, previewPosition, publishedPreview, baseMapHeight, clampCamera, camera.zoom]);

  useEffect(() => {
    const surface = stage.current;
    if (!surface) return;
    const onWheel = (event: WheelEvent) => {
      if (event.target instanceof Element && event.target.closest('.world-drawer,.world-agent-chat,.world-wardrobe-panel,.world-signal-panel,.world-exploration-hud')) return;
      event.preventDefault();
      cameraTouched.current = true;
      const rect = surface.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      setCamera((previous) => {
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
        const zoom = Math.max(minimumZoom(), Math.min(1.85, previous.zoom * Math.exp(-delta * 0.0012)));
        const worldX = (pointerX - previous.x) / previous.zoom;
        const worldY = (pointerY - previous.y) / previous.zoom;
        return clampCamera(pointerX - worldX * zoom, pointerY - worldY * zoom, zoom);
      });
    };
    surface.addEventListener('wheel', onWheel, { passive: false });
    return () => surface.removeEventListener('wheel', onWheel);
  }, [clampCamera, minimumZoom]);

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

  function exploreDistrict(id: WorldDistrictId | '') {
    setOverviewOpen(false);
    setActiveDistrict(id);
    const item = WORLD_DISTRICTS.find((entry) => entry.id === id);
    if (item && id !== 'townwide') {
      remember('districts', id);
      moveCamera(
        (mapWidth * item.x) / 100,
        (baseMapHeight * item.y) / 100,
        bounds.current.width < 760 ? 0.8 : 1.05,
      );
    } else if (item) {
      remember('districts', id);
      moveCamera(mapWidth / 2, baseMapHeight / 2, bounds.current.width < 760 ? .8 : 1.05);
    } else {
      moveCamera(mapWidth / 2, mapHeight / 2, minimumZoom());
    }
  }

  function zoomMap(delta: number) {
    const zoom = Math.max(minimumZoom(), Math.min(1.85, camera.zoom + delta));
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
    event.preventDefault();
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      cameraX: camera.x,
      cameraY: camera.y,
      moved: false,
      worldTarget: Boolean((event.target as Element).closest('.world-map-scene')),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const gesture = drag.current;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 7) gesture.moved = true;
    cameraTouched.current = true;
    setCamera((previous) => clampCamera(
      gesture.cameraX + event.clientX - gesture.x,
      gesture.cameraY + event.clientY - gesture.y,
      previous.zoom,
    ));
  }

  function finishDrag(event: PointerEvent<HTMLElement>) {
    const gesture = drag.current;
    if (gesture && !gesture.moved && gesture.worldTarget && wallet.address) {
      const rect = stage.current?.getBoundingClientRect();
      if (rect) walkTo(
        (event.clientX - rect.left - camera.x) / camera.zoom,
        (event.clientY - rect.top - camera.y) / camera.zoom,
      );
    }
    drag.current = null;
    setDragging(false);
  }

  function objectPosition(id: string) {
    const groupIndex = groups.findIndex(group => group.some(object => object.id === id));
    const index = groups[groupIndex].findIndex(object => object.id === id);
    return buildingPosition(index, groups[groupIndex].length, WORLD_DISTRICTS[groupIndex], mapWidth, baseMapHeight);
  }

  function mapObjectPlacement(id: string): CSSProperties {
    const { x, y } = objectPosition(id);
    return {
      '--world-x': `${x}px`,
      '--world-y': `${y}px`,
      '--world-scale': '1',
      '--world-hover-scale': '1.07',
      '--world-tilt': '0deg',
      '--world-depth': '5',
    } as CSSProperties;
  }

  function yardPosition(index: number) {
    if (index < 6)
      return {
        x: ([32, 68, 28, 72, 47, 53][index] / 100) * mapWidth,
        y: ([56, 56, 45, 45, 24, 76][index] / 100) * baseMapHeight,
      };
    return {
      x: mapWidth * .29 + ((index - 6) % 8) * 230,
      y: baseMapHeight + 95 + Math.floor((index - 6) / 8) * 190,
    };
  }

  const occupied: MapFootprint[] = [
    ...objects.map(object => {
      const { x, y } = objectPosition(object.id);
      return { left: x - 150, right: x + 300, top: y - 150, bottom: y + 170 };
    }),
    ...yards.map((_, index) => {
      const { x, y } = yardPosition(index);
      return { left: x - 115, right: x + 115, top: y - 125, bottom: y + 125 };
    }),
    { left: mapWidth / 2 - 130, right: mapWidth / 2 + 130, top: baseMapHeight / 2 - 110, bottom: baseMapHeight / 2 + 110 },
  ];
  const displayHero = walkingPosition(heroPosition, occupied, mapWidth, mapHeight);

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
        className={`world-canvas world-stage world-blank-canvas world-explorer signal-${holder ? signalTheme : 'acid'}${dragging ? ' is-dragging' : ''}${hudOpen ? ' hud-expanded' : ' hud-collapsed'}`}
        aria-label="Interactive LANDVILLE city map"
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
      >
        {discovery && <output key={discovery} className="city-discovery-toast"><Compass /><span>NEW DISCOVERY<b>{discovery}</b></span><Check /></output>}
        {!overviewOpen && <div className="world-map-quick-actions"><button onClick={() => setOverviewOpen(true)} aria-label="Open city overview"><Map /> OVERVIEW</button><button onClick={() => { setHudOpen((open) => !open); setWardrobeOpen(false); setSignalOpen(false); }} aria-expanded={hudOpen} aria-label={hudOpen ? 'Hide map panels' : 'Show map panels'}><Map /> {hudOpen ? 'HIDE PANELS' : 'SHOW PANELS'}</button></div>}
        <header className="world-city-status" inert={overviewOpen}>
          <span>
            <i /> LANDVILLE / CHAPTER 01
          </span>
          <b>{district ? `Now exploring ${district.name}.` : 'Pick a district. See what happens.'}</b>
          <small>{wallet.address ? 'Drag the map · Click to walk · Open a building' : 'Drag the map · Open a building'}</small>
          {townStatus === 'unavailable' && (
            <button onClick={() => void refresh()}>
              CITY DATA UNAVAILABLE · RETRY <RefreshCw />
            </button>
          )}
        </header>
        <nav
          className="world-district-travel"
          aria-label="Travel around the city"
          inert={overviewOpen}
        >
          <button
            className={!activeDistrict ? 'active' : ''}
            onClick={() => setOverviewOpen(true)}
          >
            <Map /> CITY OVERVIEW
          </button>
          {ownYard && <button className="world-nav-home" onClick={() => {
            const point = yardPosition(yards.indexOf(ownYard));
            moveCamera(point.x, point.y, .95);
            setActiveDistrict('');
          }} aria-label="Go to my yard"><Home /> MY YARD</button>}
          {wallet.address && <button onClick={() => moveCamera(heroPosition.x, heroPosition.y, .95)} aria-label="Find my character"><User /> MY HERO</button>}
          <Link className="world-nav-jobs" href="/world/jobs"><ClipboardList /> JOB BOARD</Link>
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
          className={`world-map-scene${overviewOpen ? '' : ' is-entered'}${camera.zoom < .4 ? ' map-far' : camera.zoom < .8 ? ' map-mid' : ''}`}
          inert={overviewOpen}
          style={{
            width: mapWidth,
            height: mapHeight,
            transform: `translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`,
          }}
        >
          <div className="world-map-art" style={{ height: mapHeight }} aria-hidden="true">
            <Image src="/world-art/desert.png" alt="" fill sizes="(max-width: 760px) 2200px, 5200px" quality={90} priority draggable={false} />
          </div>
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
          {camera.zoom < .4 && <button className="world-settlement-beacon" style={{ top: baseMapHeight / 2, transform: `translate(-50%,-50%) scale(${1 / camera.zoom})` }} onClick={() => moveCamera(mapWidth / 2, baseMapHeight / 2, .85)} aria-label="Zoom to the settled city"><b>LANDVILLE</b><small>{objects.length} PLACES · {yards.length} HOMES</small><Compass /></button>}

          {encounters.slice(0, 1).map((encounter) => {
            const winner = encounter.robots.find((robot) => robot.owner === encounter.winnerOwner);
            return <Link key={encounter.id} href="/world/jobs" className="world-scrap-race"
              style={{ left: mapWidth * .64 + 345, top: baseMapHeight * .66 + 15 }}
              aria-label={`Scrap Race for ${encounter.jobTitle}: ${encounter.robots.map((robot) => robot.name).join(' and ')}`}>
              <small>MARKET / LIVE ROBOT ENCOUNTER</small><strong>SCRAP RACE</strong>
              <span>{encounter.robots.map((robot) => robot.name).join('  VS  ')}</span>
              <em>{encounter.jobTitle}</em>
              <b>{winner ? `${winner.name} won the job` : encounter.jobStatus === 'open' ? 'Open job · owner approval decides each offer' : 'Job closed · see board'}</b>
            </Link>;
          })}

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
                        (Math.max(1, Math.ceil(groups[index].length / 2)) - 1) * 225 - 195,
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
              data-kind={object.kind}
            >
              <span className="world-object-foundation" aria-hidden="true" />
              <WorldBuildingArt kind={object.kind} seed={object.id} title={object.title} description={object.description} approved={object.artApproved} />
              <span className="world-object-neon" aria-hidden="true">{object.title}</span>
              {!exploration.places.includes(object.id) && <span className="world-explore-beacon" aria-hidden="true">EXPLORE <Compass /></span>}
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

          {worldFeatures.map((feature) => <Link key={feature.proposalId} className="world-feature world-feature-live" href={`/proposals#${feature.proposalId}`}
            style={{ left: mapWidth * feature.x / 100, top: baseMapHeight * feature.y / 100 }} aria-label={`Visit ${feature.title} World change`}>
            <WorldFeatureArt kind={feature.kind} /><span>{feature.title}<small>{feature.district}</small></span>
          </Link>)}
          {previewProposal && previewKind && previewPosition && !publishedPreview && <div className="world-feature world-feature-proposed"
            style={{ left: mapWidth * previewPosition.x / 100, top: baseMapHeight * previewPosition.y / 100 }} aria-label={`Preview of proposed ${previewProposal.title}`}>
            <WorldFeatureArt kind={previewKind} /><span>PROPOSAL PREVIEW<small>{previewProposal.title}</small></span>
          </div>}

          {citizens.filter((citizen) => {
            const owner = citizen.wallet.toLowerCase();
            return owner !== wallet.address.toLowerCase() && !residentWallets.has(owner);
          }).map((citizen, index) => (
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
              <span className="world-yard-foundation" aria-hidden="true" />
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
          {yards.map((yard, index) => {
            const home = yardPosition(index);
            const own = yard.ownerWallet.toLowerCase() === wallet.address.toLowerCase();
            const motion = agentWorldMotion({ wallet: yard.ownerWallet, home,
              mapWidth, mapHeight, cityHeight: baseMapHeight, roamMode: yard.worldRoamMode,
              personality: yard.personality, speechEnabled: yard.worldSpeechEnabled,
              phrases: yard.worldPhrases, now: worldClock });
            const encounter = encounters[0];
            const contender = encounter?.robots.findIndex((robot) => robot.owner.toLowerCase() === yard.ownerWallet.toLowerCase()) ?? -1;
            const onRace = contender >= 0 && encounter?.jobStatus === 'open';
            const currentMotion = onRace ? { x: mapWidth * .64 + 345 + (contender === 0 ? -115 : 115),
              y: baseMapHeight * .66 + 135, speech: '' } : motion;
            const sharedRobotSkin = positionsByWallet.get(yard.ownerWallet.toLowerCase())?.robotSkin;
            const actor = <>
              {currentMotion.speech && <span className="world-agent-speech" aria-live="off">{currentMotion.speech}</span>}
              <span className="world-actor-figure"><PersonalRobot presentation={yard.presentation} skin={own ? robotSkin : sharedRobotSkin || ROBOT_SKINS[index % ROBOT_SKINS.length]} /></span>
              <span className="world-actor-name">{yard.name}{onRace ? ' · SCRAP RACE' : own ? ' · YOUR AGENT' : ''}</span>
            </>;
            const className = `world-game-actor robot${own ? ' own' : ' neighbor'}${onRace ? ' racing' : ''}${currentMotion.speech ? ' speaking' : ''}`;
            const clear = walkingPosition(currentMotion, occupied, mapWidth, mapHeight);
            occupied.push({ left: clear.x - 28, right: clear.x + 28, top: clear.y - 64, bottom: clear.y + 5 });
            const style = { left: clear.x, top: clear.y };
            return own
              ? <button key={`robot-${yard.ownerWallet}`} className={className} style={style} onClick={() => { setWardrobeOpen(false); setAgentChatOpen(true); }} aria-label={`Talk to your agent ${yard.name}`}>{actor}</button>
              : <Link key={`robot-${yard.ownerWallet}`} href={`/yard/${yard.ownerWallet}`} className={className} style={style} aria-label={`Visit ${yard.name} at ${yard.houseName}`}>{actor}</Link>;
          })}
          {residents.filter((resident) => resident.wallet.toLowerCase() !== wallet.address.toLowerCase()).map((resident) => {
            const position = positionsByWallet.get(resident.wallet.toLowerCase());
            const spawn = residentSpawn(resident.citizenNumber);
            const clear = walkingPosition({
              x: (position?.x ?? spawn.x) / 10000 * mapWidth,
              y: (position?.y ?? spawn.y) / 10000 * mapHeight,
            }, occupied, mapWidth, mapHeight);
            occupied.push({ left: clear.x - 28, right: clear.x + 28, top: clear.y - 80, bottom: clear.y + 5 });
            const published = position?.heroSkin === 'MODULE' ? citizens.find((citizen) => citizen.wallet.toLowerCase() === resident.wallet.toLowerCase()) : undefined;
            const skin = position?.heroSkin && position.heroSkin !== 'MODULE' ? position.heroSkin : 'SCAVENGER';
            return <Link key={`resident-${resident.wallet}`} className="world-game-actor resident"
              href={`/citizens/${resident.wallet}`}
              style={{ left: clear.x, top: clear.y }}
              aria-label={`Visit ${resident.username ? `@${resident.username}` : `Citizen #${resident.citizenNumber}`}`}>
              <span className="world-actor-figure">{published
                ? <Image className="world-hero-module-art" src={published.imagePath} alt="" width={76} height={100} unoptimized />
                : <GameHero skin={skin} />}</span>
              <span className="world-actor-name">{resident.username ? `@${resident.username}` : `CITIZEN #${resident.citizenNumber}`}</span>
            </Link>;
          })}
          {wallet.address && <div className={`world-game-actor player-hero${heroWalking ? ' walking' : ''}`}
            style={{ left: displayHero.x, top: displayHero.y }} aria-label="Your hero in the city">
            <span className="world-actor-figure">{heroSkin === 'MODULE' && ownPublishedCharacter
              ? <Image className="world-hero-module-art" src={ownPublishedCharacter.imagePath} alt="" width={76} height={100} unoptimized />
              : <GameHero skin={heroSkin === 'MODULE' ? 'SCAVENGER' : heroSkin} />}</span>
            <span className="world-actor-name">YOU · {heroSkin === 'MODULE' && ownPublishedCharacter ? ownPublishedCharacter.creator : HERO_SKIN_LABELS[heroSkin === 'MODULE' ? 'SCAVENGER' : heroSkin]}</span>
          </div>}
        </div>

        {wallet.address && <div className="world-wardrobe" inert={overviewOpen}>
          <button className="world-wardrobe-trigger" aria-expanded={wardrobeOpen} onClick={() => { setAgentChatOpen(false); setWardrobeOpen((open) => !open); }}><Shirt /> HERO & AGENT</button>
          {wardrobeOpen && <aside className="world-wardrobe-panel" aria-label="City wardrobe">
            <header><div><small>CITY WARDROBE / YOUR LOOK</small><h2>Dress for the dust.</h2></div><button aria-label="Close wardrobe" onClick={() => setWardrobeOpen(false)}><X /></button></header>
            <p>Your hero moves when you tap the map. Your robot roams near home and talks with you in its yard.</p>
            <h3>YOUR HERO</h3><div className="world-skin-options">{HERO_SKINS.map((skin) => <button key={skin} className={heroSkin === skin ? 'active' : ''} onClick={() => chooseHeroSkin(skin)}><GameHero skin={skin} /><span>{HERO_SKIN_LABELS[skin]}</span></button>)}
              {ownPublishedCharacter && <button className={heroSkin === 'MODULE' ? 'active' : ''} onClick={() => chooseHeroSkin('MODULE')}><Image src={ownPublishedCharacter.imagePath} alt="" width={50} height={68} unoptimized /><span>City creation</span></button>}
            </div>
            {ownYard && <><h3>YOUR AGENT</h3><div className="world-skin-options robot-skins">{ROBOT_SKINS.map((skin) => <button key={skin} className={robotSkin === skin ? 'active' : ''} onClick={() => { setRobotSkin(skin); saveAppearance(heroSkin, skin); }}><PersonalRobot skin={skin} presentation={ownYard.presentation} /><span>{ROBOT_SKIN_LABELS[skin]}</span></button>)}</div><Link href={`/yard/${ownYard.ownerWallet}`}>Talk to {ownYard.name} in your yard ↗</Link></>}
            <small>{presenceStatus === 'ready' ? 'Your look and position are shared across the city.' : presenceStatus === 'error' ? 'City sync is unavailable. Your look is saved on this device.' : 'Connecting to the city...'}</small>
          </aside>}
        </div>}
        {agentChatOpen && !overviewOpen && ownYard && <WorldAgentChat key={ownYard.ownerWallet} name={ownYard.name} owner={ownYard.ownerWallet} onClose={() => setAgentChatOpen(false)} />}

        <aside
          className="world-exploration-hud"
          aria-label="Your exploration progress"
          inert={overviewOpen}
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
        <div className="world-camera-tools" aria-label="Map controls" inert={overviewOpen}>
          <button onClick={() => zoomMap(0.15)} aria-label="Zoom in">
            <Plus />
          </button>
          <output>{Math.round(camera.zoom * 100)}%</output>
          <button onClick={() => zoomMap(-0.15)} aria-label="Zoom out">
            <Minus />
          </button>
          <button
            onClick={() => moveCamera(mapWidth / 2, mapHeight / 2, minimumZoom())}
            aria-label="Zoom out to whole map"
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
          <aside className={`world-district-visit district-${district.id}`} style={{ '--district-color': district.color } as CSSProperties} aria-live="polite" inert={overviewOpen}>
            <div className="world-district-art" aria-hidden="true"><Image src="/world-art/desert.png" alt="" fill sizes="300px" /><span>{district.number} / {district.name}</span></div>
            <small>DISTRICT {district.number} / YOU ARE HERE</small>
            <h2>{district.name}</h2>
            <p>{district.description}</p>
            <span>{groups[WORLD_DISTRICTS.indexOf(district)].length} PUBLISHED PLACES</span>
            <div className="world-district-places">
              {groups[WORLD_DISTRICTS.indexOf(district)].length ? groups[WORLD_DISTRICTS.indexOf(district)].map((place) => <button key={place.id} onClick={() => inspectObject(place.id)}><Building2 /><span>{place.title}<small>OPEN THIS PLACE</small></span><Compass /></button>) : <p>The first place here could be yours.</p>}
            </div>
            <button className="city-district-build" onClick={() => openCityChat({ room: 'BUILD', district: district.proposalLabel })}><Bot /> BUILD HERE</button>
            <button onClick={() => setOverviewOpen(true)}>
              <Map /> ALL DISTRICTS
            </button>
          </aside>
        )}
        {overviewOpen && <section className="world-overview" aria-label="Explore LANDVILLE districts">
          <Image src="/landville-world-overview.png" fill priority sizes="100vw" alt="" />
          <div className="world-overview-shade" />
          <div className="world-overview-head"><small>LANDVILLE / WORLD MAP</small><h1>YOUR CITY.<br /><em>YOUR NEXT STOP.</em></h1><p>Pick a district to explore its places, people and ideas.</p><button onClick={() => { setOverviewOpen(false); setActiveDistrict(''); moveCamera(mapWidth / 2, baseMapHeight / 2, bounds.current.width < 760 ? .72 : .85); }}><Map /> EXPLORE THE CITY <Compass /></button></div>
          <div className="world-overview-districts" aria-label="Choose a district">{WORLD_DISTRICTS.map((item) => <button key={item.id} className={`world-overview-district district-${item.id}`} style={{ '--district-color': item.color } as CSSProperties} onClick={() => exploreDistrict(item.id)}><span>{item.number} / DISTRICT</span><b>{item.name}</b><small>{groups[WORLD_DISTRICTS.indexOf(item)].length} PLACES <Compass /></small></button>)}</div>
          <div className="world-overview-foot"><span>FIVE DISTRICTS. COUNTLESS BAD IDEAS WORTH BUILDING.</span><span>CHOOSE A DISTRICT ↗</span></div>
        </section>}
        <button
          className={`world-signal-trigger${holder ? ' verified' : ''}`}
          aria-expanded={signalOpen}
          inert={overviewOpen}
          onClick={() => setSignalOpen((value) => !value)}
        >
          <RadioTower />
          {holder ? 'SCRAPY SIGNAL ACTIVE' : 'YOUR SCRAPY SIGNAL'}
        </button>
        {signalOpen && (
          <aside id="world-signal-panel" className="world-signal-panel" inert={overviewOpen}>
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
            inert={overviewOpen}
            onClick={() => setDrawerOpen(false)}
            aria-label="Close object menu"
          />
        )}
        {selected && (
          <aside
            id="world-object-drawer"
            className={drawerOpen ? 'world-drawer open' : 'world-drawer'}
            inert={overviewOpen}
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
