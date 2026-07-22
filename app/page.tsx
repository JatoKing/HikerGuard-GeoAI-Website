'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * HeroSection — HikerGuard GeoAI landing page, section 1 of 1 (starter).
 * Real interactive Earth (MapLibre GL JS globe projection — open source,
 * no account or API key required) with idle spin, atmosphere styling,
 * and a click-to-fly transition into Peninsular Malaysia.
 *
 * Setup:
 *   npm install maplibre-gl
 *
 * That's it — no signup, no token, no .env file. Tiles come from Esri's
 * free World Imagery service (satellite basemap, no key required for
 * reasonable non-commercial use — the same provider countless open
 * source Leaflet/MapLibre demos use). If you outgrow the free usage
 * limits later, Esri has paid tiers, or you can swap the `tiles` URL
 * for any other XYZ raster source.
 *
 * IMPORTANT — like the Mapbox version, this still needs a live internet
 * connection every time it loads (tiles stream from Esri's servers).
 * Test on the actual hackathon venue wifi beforehand if possible.
 *
 * ---- Why transform, not height, for the horizon-crop effect ----
 * The map wrapper's crop uses `transform: translateY`, not CSS
 * `height`. Animating `height` forces a layout recalculation on every
 * frame on top of MapLibre's own WebGL render and canvas resize —
 * three expensive things fighting for the main thread at once, and
 * every attempt to smooth that out (resize() every frame, a custom
 * ResizeObserver, trusting MapLibre's internal one) either stayed
 * janky or actively broke rendering. Keeping the container at a
 * CONSTANT size and moving it with `transform` instead is GPU-only —
 * physically incapable of causing resize-related jank, because no
 * resize ever happens.
 */

// All 13 states (capital/main city used as the pin location for each) —
// Sabah and Sarawak included. Federal territories (KL, Putrajaya,
// Labuan) are left out to keep this to "one pin per state".
const STATE_MARKERS: { name: string; coords: [number, number] }[] = [
  { name: 'Perlis', coords: [100.1988, 6.4414] },
  { name: 'Kedah', coords: [100.3685, 6.1184] },
  { name: 'Pulau Pinang', coords: [100.3327, 5.4141] },
  { name: 'Perak', coords: [101.0901, 4.5975] },
  { name: 'Kelantan', coords: [102.2386, 6.1254] },
  { name: 'Terengganu', coords: [103.137, 5.3302] },
  { name: 'Pahang', coords: [103.3256, 3.8168] },
  { name: 'Selangor', coords: [101.5183, 3.0733] },
  { name: 'Negeri Sembilan', coords: [101.9424, 2.7297] },
  { name: 'Melaka', coords: [102.2501, 2.1896] },
  { name: 'Johor', coords: [103.7414, 1.4927] },
  { name: 'Sabah', coords: [116.0753, 5.9749] },
  { name: 'Sarawak', coords: [110.3592, 1.5535] },
];

const GLOBAL_VIEW = {
  center: [30, 15] as [number, number],
  zoom: 2.6,
  pitch: 0,
  bearing: 0,
};

// Bounding box for the whole of Malaysia — kept for reference only, not
// used directly (see MALAYSIA_VIEW_CENTER below for why we use an
// explicit center/zoom instead of fitBounds()).
const MALAYSIA_BOUNDS: [[number, number], [number, number]] = [
  [99.5, 0.8], // southwest corner (near Perlis / southern Sarawak border)
  [119.5, 7.5], // northeast corner (eastern Sabah)
];

// Explicit center/zoom instead of relying on fitBounds() — fitBounds
// with globe projection turned out unreliable for a bounds this wide
// (~20° of longitude, close to half a hemisphere), sometimes landing
// on a completely different region. A manually chosen center (the
// midpoint between Peninsular Malaysia and Sabah/Sarawak) plus a fixed
// zoom is far more predictable, at the cost of not auto-fitting.
const MALAYSIA_VIEW_CENTER: [number, number] = [109.5, 4.1];
const MALAYSIA_VIEW_ZOOM = 4.8;

// No tilt for the whole-country view — a pitched (3D) camera distorts
// framing near the top/edges of the view via perspective compression.
const MALAYSIA_VIEW_PITCH = 0;
const MALAYSIA_VIEW_BEARING = 0;

const FLY_DURATION = 2200; // ms

// Inline style — no hosted style needed, so no account required. Esri
// World Imagery as the base layer (real satellite photography).
//
// ⚠️ KNOWN RISK: during testing this occasionally failed with CORS
// errors ("AJAXError: Load failed (0)" / "access control checks") on
// every tile request. That may have been a transient network/firewall
// issue rather than Esri permanently blocking requests — but if you
// see the map fail to render again (blank/stuck on an old view after
// flyTo), open DevTools Console first. If you see CORS errors again,
// switch back to CARTO's basemap:
//   tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png']
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Imagery © Esri',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
    },
  ],
  projection: { type: 'globe' },
  sky: {
    'sky-color': '#000000',
    'horizon-color': '#0b0f0d',
    'fog-color': '#0b0f0d',
    'sky-horizon-blend': 0.6,
    'horizon-fog-blend': 0.6,
    'atmosphere-blend': 0.9,
  },
};

export default function HeroSection() {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const spinningRef = useRef(true);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: GLOBAL_VIEW.center,
      zoom: GLOBAL_VIEW.zoom,
      pitch: GLOBAL_VIEW.pitch,
      bearing: GLOBAL_VIEW.bearing,
      attributionControl: false,
      interactive: false,
    });
    mapRef.current = map;

    map.on('error', (e) => {
      console.error('[HeroSection] MapLibre error event:', e.error);
    });

    // One marker per state (see STATE_MARKERS above) — small dot plus
    // a text label, all created upfront and only attached to the map
    // once the login transition starts (see handleOpenLogin below).
    markersRef.current = STATE_MARKERS.map(({ name, coords }) => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '6px';
      wrapper.style.whiteSpace = 'nowrap';

      const dot = document.createElement('div');
      dot.style.width = '9px';
      dot.style.height = '9px';
      dot.style.flexShrink = '0';
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = '#D9A441';
      dot.style.boxShadow = '0 0 0 3px rgba(217,164,65,0.25)';

      const label = document.createElement('span');
      label.textContent = name;
      label.style.fontFamily = "'JetBrains Mono', monospace";
      label.style.fontSize = '11px';
      label.style.letterSpacing = '0.02em';
      label.style.color = '#F5F6F3';
      label.style.textShadow = '0 1px 3px rgba(0,0,0,0.8)';

      wrapper.appendChild(dot);
      wrapper.appendChild(label);

      return new maplibregl.Marker({ element: wrapper, anchor: 'left' }).setLngLat(
        coords
      );
    });

    // ---- Idle auto-rotate (same technique as Mapbox's official
    // "spinning globe" example, which MapLibre's API mirrors) — nudges
    // longitude a little on every render frame, slowing down as you
    // zoom in. No user-interaction pause needed since the map is fully
    // decorative (interactive: false above) — nothing can drag/zoom it
    // except our own flyTo() calls.
    const SECONDS_PER_REVOLUTION = 240;
    const MAX_SPIN_ZOOM = 5;
    const SLOW_SPIN_ZOOM = 3;

    function spinGlobe() {
      if (!spinningRef.current) return;
      // Defensive: never fight an in-flight flyTo animation with the
      // spin's direct setCenter() jump — that race is what was
      // producing a random-looking final position instead of landing
      // cleanly on Malaysia.
      if (map.isEasing() || map.isMoving()) return;
      const zoom = map.getZoom();
      if (zoom >= MAX_SPIN_ZOOM) return;

      let distancePerSecond = 360 / SECONDS_PER_REVOLUTION;
      if (zoom > SLOW_SPIN_ZOOM) {
        const zoomDif = (MAX_SPIN_ZOOM - zoom) / (MAX_SPIN_ZOOM - SLOW_SPIN_ZOOM);
        distancePerSecond *= zoomDif;
      }
      const center = map.getCenter();
      center.lng -= distancePerSecond / 60; // ~60fps via the 'render' event
      map.setCenter(center);
    }

    map.on('render', spinGlobe);

    const onWindowResize = () => map.resize();
    window.addEventListener('resize', onWindowResize);

    return () => {
      window.removeEventListener('resize', onWindowResize);
      markersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleOpenLogin = () => {
    setLoginOpen(true);
    spinningRef.current = false;

    const map = mapRef.current;
    if (!map) return;

    // Cancel any residual spin/animation before starting a clean
    // transition — otherwise a straggling frame could still be mid-jump
    // from the idle spin right as flyTo kicks off.
    map.stop();

    // No resize() call anywhere here — the map container's actual size
    // never changes (see the transform-based wrapper in the JSX below),
    // so there's nothing to resize.

    // Padding shifts the framed bounds' effective visual center
    // toward the right (for the login panel on the left) — note
    // that more left padding also zooms out further, since fitBounds
    // needs to fit the same geographic area into a smaller usable
    // width. The two effects (zoom level and rightward shift) are
    // linked, not independent knobs.
    const leftPadding = window.innerWidth * 0.34;
    const rightPadding = window.innerWidth * 0.05;
    // Bottom padding reserves space at the BOTTOM edge, which pushes
    // the framed content UP to fit within the remaining (higher) area.
    const topPadding = window.innerHeight * 0.04;
    const bottomPadding = window.innerHeight * 0.1;

    map.flyTo({
      center: MALAYSIA_VIEW_CENTER,
      zoom: MALAYSIA_VIEW_ZOOM,
      pitch: MALAYSIA_VIEW_PITCH,
      bearing: MALAYSIA_VIEW_BEARING,
      padding: {
        left: leftPadding,
        top: topPadding,
        right: rightPadding,
        bottom: bottomPadding,
      },
      duration: FLY_DURATION,
      essential: true,
    });

    markersRef.current.forEach((marker) => marker.addTo(map));
  };

  const handleBack = () => {
    setLoginOpen(false);

    const map = mapRef.current;
    if (!map) return;

    map.stop();
    markersRef.current.forEach((marker) => marker.remove());

    map.flyTo({
      center: GLOBAL_VIEW.center,
      zoom: GLOBAL_VIEW.zoom,
      pitch: GLOBAL_VIEW.pitch,
      bearing: GLOBAL_VIEW.bearing,
      padding: { left: 0, top: 0, right: 0, bottom: 0 },
      duration: FLY_DURATION,
      essential: true,
    });

    map.once('moveend', () => {
      spinningRef.current = true;
    });
  };

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      {/* Fixed-size wrapper — always exactly the viewport size. The
          canvas's actual pixel dimensions NEVER change, so MapLibre
          never resizes/reallocates its WebGL framebuffer. The "horizon
          crop" hero look and the transition to the centered login view
          are both purely a CSS transform: translateY, which is
          GPU-composited and never touches layout or the canvas. */}
      <div
        className={`absolute inset-0 h-full w-full transition-transform duration-2200 ease-in-out ${
          loginOpen ? 'translate-y-0' : 'translate-y-[42%]'
        }`}
      >
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>

      {/* Hero text — fades up and out when the login transition starts */}
      <div
        className={`pointer-events-none absolute left-1/2 top-[17%] z-10 flex w-full -translate-x-1/2 flex-col items-center px-6 text-center transition-all duration-700 ease-out ${
          loginOpen ? '-translate-y-10 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <span className="mb-4.5 text-xs tracking-wide" style={{ color: '#9497A0' }}>
          Off-grid tracking for private search &amp; rescue.
        </span>

        <h1
          className="text-[1.9rem] font-medium leading-[1.35] sm:text-[2.6rem]"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#F5F6F3' }}
        >
          Search &amp; Rescue Missions:
          <br />
          From Signal Loss to Safe Return
        </h1>

        <button
          type="button"
          onClick={handleOpenLogin}
          disabled={loginOpen}
          className={`group relative mt-5.5 overflow-hidden rounded-full p-px ${
            loginOpen ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'
          }`}
        >
          {/* Beam light travelling around the border — a rotating conic
              gradient clipped down to a hairline ring by the parent's
              1px padding + the solid inner pill sitting on top of it. */}
          <span
            className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] opacity-100 transition-opacity duration-300 ease-out group-hover:opacity-0"
            style={{
              background:
                'conic-gradient(from 90deg at 50% 50%, transparent 0%, #D9A441 10%, transparent 24%)',
            }}
          />

          <span className="relative flex items-center gap-2.5 overflow-hidden rounded-full bg-black px-4 py-2">
            {/* Fill sweep — scales in from the left origin on hover */}
            <span
              className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
              style={{ backgroundColor: '#D9A441' }}
            />

            <span className="relative z-10 font-mono text-xs tracking-wide text-[#F5F6F3] transition-colors duration-300 group-hover:text-[#201604]">
              Login
            </span>

            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="relative z-10 shrink-0 text-[#D9A441] transition-colors duration-300 group-hover:text-[#201604]"
            >
              <path
                d="M3 8H13M13 8L9 4M13 8L9 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </div>

      {/* Login panel — left half, vertically centered, slides up from
          the bottom. Outer wrapper carries the rotating beam-light
          ring (same technique as the hero "Login" button) so the
          whole card reads as one cohesive HUD element. */}
      <div className="pointer-events-none absolute left-0 top-1/2 z-10 w-full -translate-y-1/2 px-6 sm:w-1/2 sm:px-12">
        <div
          className={`relative mx-auto w-full max-w-[320px] overflow-hidden rounded-lg p-px transition-all duration-700 ease-out ${
            loginOpen
              ? 'pointer-events-auto translate-y-0 opacity-100 delay-300'
              : 'pointer-events-none translate-y-16 opacity-0'
          }`}
        >
          {/* Beam light travelling around the card border */}
          <span
            className="absolute inset-[-1000%] animate-[spin_5s_linear_infinite]"
            style={{
              background:
                'conic-gradient(from 90deg at 50% 50%, transparent 0%, #39FF88 6%, transparent 14%)',
            }}
          />

          <div
            className="relative overflow-hidden rounded-lg p-8"
            style={{
              backgroundColor: 'rgba(11,15,13,0.72)',
              backdropFilter: 'blur(6px)',
            }}
          >
            {/* Topographic contour lines — decorative, clipped by the
                card's own overflow-hidden + rounded corners, centered
                on the card itself so it reads as one balanced element.
                Irregular/organic paths (not perfect circles) to read
                as elevation contours rather than sonar rings. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-15">
              <svg viewBox="0 0 200 200" className="h-105 w-105 shrink-0">
                <path
                  d="M96,8 C130,6 158,20 176,48 C194,76 196,118 180,150 C164,182 128,196 92,190 C56,184 26,160 14,126 C2,92 8,54 34,32 C50,18 72,10 96,8 Z"
                  stroke="#39FF88"
                  strokeWidth="1.25"
                  fill="none"
                />
                <path
                  d="M100,34 C126,30 148,44 160,66 C172,88 170,116 154,136 C138,156 110,166 84,158 C58,150 40,130 36,104 C32,78 44,54 66,42 C77,36 88,36 100,34 Z"
                  stroke="#39FF88"
                  strokeWidth="1.25"
                  fill="none"
                />
                <path
                  d="M102,62 C118,60 132,70 138,84 C144,98 140,114 128,124 C116,134 98,136 84,128 C70,120 62,106 64,90 C66,74 78,66 90,64 C94,63 98,63 102,62 Z"
                  stroke="#39FF88"
                  strokeWidth="1.25"
                  fill="none"
                />
                <path
                  d="M98,86 C108,85 116,92 118,100 C120,110 114,118 104,120 C94,122 84,118 80,108 C76,98 82,90 90,87 C93,86 96,86 98,86 Z"
                  stroke="#39FF88"
                  strokeWidth="1.25"
                  fill="none"
                />
              </svg>
            </div>

            {/* Detected-person blip */}
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 opacity-60"
              style={{ top: '38%', left: '64%' }}
            >
              <span
                className="absolute -inset-1.5 animate-ping rounded-full"
                style={{ backgroundColor: 'rgba(239,68,68,0.55)' }}
              />
              <span
                className="relative block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: '#EF4444', boxShadow: '0 0 6px 2px rgba(239,68,68,0.5)' }}
              />
            </span>

            {/* HUD status strip */}
            <div className="mb-5 flex items-center justify-between font-mono text-[10px] tracking-wide">
              <span className="flex items-center gap-1.5" style={{ color: '#83887E' }}>
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: '#D9A441' }}
                />
                SIGNAL: LOCKED
              </span>
              <span style={{ color: '#83887E' }}>REGION: MYS</span>
            </div>

            <p
              className="mb-1 font-mono text-xs uppercase tracking-wide"
              style={{ color: '#D9A441' }}
            >
              Command access
            </p>
            <h2
              className="mb-6 text-xl font-medium"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#F5F6F3' }}
            >
              Sign in to HikerGuard
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                router.push('/dashboard');
              }}
              className="flex flex-col gap-4"
            >
              <label
                className="flex flex-col gap-1.5 text-xs"
                style={{ color: '#83887E' }}
              >
                Email
                <input
                  type="email"
                  placeholder="you@sar-team.my"
                  className="rounded border bg-transparent px-3 py-2 text-sm outline-none transition-colors duration-200 focus:border-[#D9A441]"
                  style={{ borderColor: 'rgba(245,246,243,0.15)', color: '#F5F6F3' }}
                />
              </label>
              <label
                className="flex flex-col gap-1.5 text-xs"
                style={{ color: '#83887E' }}
              >
                Password
                <input
                  type="password"
                  placeholder="••••••••"
                  className="rounded border bg-transparent px-3 py-2 text-sm outline-none transition-colors duration-200 focus:border-[#D9A441]"
                  style={{ borderColor: 'rgba(245,246,243,0.15)', color: '#F5F6F3' }}
                />
              </label>
              <button
                type="submit"
                className="mt-2 rounded px-4 py-2.5 text-sm font-medium transition-transform hover:-translate-y-px"
                style={{ backgroundColor: '#D9A441', color: '#201604' }}
              >
                Sign in
              </button>
            </form>

            <button
              type="button"
              onClick={handleBack}
              className="mt-5 border-0 bg-transparent p-0 font-mono text-xs"
              style={{ color: '#52564F' }}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}