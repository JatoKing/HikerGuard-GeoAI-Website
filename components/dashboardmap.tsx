"use client";

/**
 * components/DashboardMap.tsx
 *
 * PENTING: fail ni HANYA boleh dimuatkan melalui:
 *   const MapPanel = dynamic(() => import("@/components/DashboardMap"), { ssr: false });
 * dari app/dashboard/page.tsx.
 *
 * JANGAN import fail ni terus (import { ... } from "@/components/DashboardMap")
 * di mana-mana fail yang di-render semasa SSR — leaflet sentuh `window` waktu
 * modul dia dimuatkan, jadi kena pastikan fail ni cuma load di client (browser).
 */

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { TRAIL_DATA, trailCoordMap } from "@/lib/trails";
import {
  TripStatus,
  severityColor,
  severityLabel,
} from "@/lib/dashboardtypes";

interface DashboardMapProps {
  filterLabel?: string;
  selectedState: string;
  selectedTrail: string;
  trips: TripStatus[];
}

// Auto pan/zoom peta bila penapis (negeri/bukit) ditukar
function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  const key = JSON.stringify(points);

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 11, { animate: true });
    } else {
      const bounds = points.map((p) => [p.lat, p.lng]) as [number, number][];
      map.fitBounds(bounds, { padding: [36, 36], animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  return null;
}

export default function DashboardMap({
  filterLabel,
  selectedState,
  selectedTrail,
  trips,
}: DashboardMapProps) {
  // Semua lokasi laluan, ditapis ikut pilihan negeri/bukit
  const trailMarkers = useMemo(() => {
    const raw =
      selectedTrail !== "all"
        ? TRAIL_DATA.flatMap((s) => s.trails).filter(
            (t) => t.name === selectedTrail
          )
        : selectedState !== "all"
        ? TRAIL_DATA.find((s) => s.state === selectedState)?.trails ?? []
        : TRAIL_DATA.flatMap((s) => s.trails);

    // dedupe (contoh nama laluan yang wujud di lebih dari satu negeri)
    return Array.from(new Map(raw.map((t) => [t.name, t])).values());
  }, [selectedState, selectedTrail]);

  // Pin trip aktif (mock) — cari koordinat ikut nama trail
  const tripMarkers = useMemo(
    () =>
      trips
        .map((t) => {
          const coord = trailCoordMap[t.trail];
          return coord ? { ...t, ...coord } : null;
        })
        .filter((t): t is TripStatus & { lat: number; lng: number } => !!t),
    [trips]
  );

  const boundsPoints =
    trailMarkers.length > 0
      ? trailMarkers.map((t) => ({ lat: t.lat, lng: t.lng }))
      : [{ lat: 4.2105, lng: 108.9758 }];

  return (
    <div className="relative flex-1 min-h-[420px] bg-[#FDFCF9] border border-[#E3DFD3] rounded-xl overflow-hidden">
      <MapContainer
        center={[4.2105, 108.9758]}
        zoom={6}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", minHeight: 420 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={boundsPoints} />

        {/* Semua lokasi laluan (ikut penapis) */}
        {trailMarkers.map((t) => (
          <CircleMarker
            key={t.name}
            center={[t.lat, t.lng]}
            radius={6}
            pathOptions={{
              color: "#12805F",
              fillColor: "#12805F",
              fillOpacity: 0.65,
              weight: 1.5,
            }}
          >
            <Popup>
              <div style={{ fontSize: 13 }}>
                <strong>{t.name}</strong>
                <br />
                {t.area}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Pin trip aktif (mock) — warna ikut status */}
        {tripMarkers.map((t) => (
          <CircleMarker
            key={t.id}
            center={[t.lat, t.lng]}
            radius={9}
            pathOptions={{
              color: "#FFFFFF",
              fillColor: severityColor(t.status),
              fillOpacity: 0.95,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ fontSize: 13 }}>
                <strong>{t.hiker}</strong> — {t.trail}
                <br />
                Status: {severityLabel(t.status)}
                <br />
                Risk score: {t.riskScore}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* label penapis */}
      {filterLabel && (
        <span className="absolute top-3 left-3 z-[1000] text-xs font-mono text-[#12805F] bg-white/95 border border-[#E3DFD3] rounded-full px-3 py-1 shadow-sm">
          Menapis: {filterLabel}
        </span>
      )}

      {/* legend */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-4 bg-[#FFFFFF]/95 border border-[#E3DFD3] rounded-full px-4 py-2 text-xs text-[#6E7568] shadow-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#12805F]" /> Laluan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#A6720B]" /> Deviation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#C6421C]" /> SOS
        </span>
      </div>
    </div>
  );
}