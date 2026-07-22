"use client";

/**
 * HikerGuard GeoAI — Network Coverage & Tower Prediction
 * Route: app/coverage/page.tsx
 *
 * Stack: Next.js (App Router) + TypeScript + Tailwind CSS + framer-motion + lucide-react + react-leaflet
 * (package yang sama seperti /dashboard sebelum ni, ditambah react-leaflet + leaflet kalau belum ada:
 *   npm install react-leaflet leaflet
 *   npm install -D @types/leaflet
 * )
 *
 * NOTA: Semua data dalam fail ni ialah DUMMY/MOCK — tukar kepada fetch dari API/model
 * sebenar bila backend/GeoAI team dah siap. Fail ni fokus kepada FRONTEND sahaja
 * (paparan menara + radius liputan placeholder), logik "predict" sebenar (terrain,
 * elevation, ML model) akan gantikan `signalRadiusKm` di bawah kemudian.
 *
 * Page ni sengaja dijadikan BERDIRI SENDIRI (bukan sub-route dashboard) — redirect
 * dari dashboard/landing boleh ditambah kemudian ikut keperluan awak.
 */

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Antenna,
  SignalHigh,
  SignalLow,
  SignalZero,
  Layers,
  AlertTriangle,
  MapPin,
  Radio,
  ChevronDown,
} from "lucide-react";

import "leaflet/dist/leaflet.css";

// ---------------------------------------------------------------------------
// Leaflet perlu di-load client-side sahaja (tiada SSR), sama macam /dashboard
// ---------------------------------------------------------------------------
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SignalStatus = "good" | "weak" | "none";
type Provider = "Maxis" | "Celcom" | "Digi" | "U Mobile" | "TM";
type NetworkType = "4G" | "5G" | "3G";

interface Tower {
  id: string;
  name: string;
  negeri: string;
  gunung: string;
  lat: number;
  lng: number;
  provider: Provider;
  type: NetworkType;
  signalRadiusKm: number;
  status: SignalStatus;
}

interface CriticalZone {
  id: string;
  gunung: string;
  negeri: string;
  segment: string;
  severity: "weak" | "none";
  note: string;
}

// ---------------------------------------------------------------------------
// Dummy data — lokasi menara berhampiran beberapa trail popular Malaysia
// ---------------------------------------------------------------------------
const TOWERS: Tower[] = [
  // Gunung Tahan, Pahang
  { id: "TW-001", name: "Menara Kuala Tahan", negeri: "Pahang", gunung: "Gunung Tahan", lat: 4.6120, lng: 102.2510, provider: "Maxis", type: "4G", signalRadiusKm: 6, status: "good" },
  { id: "TW-002", name: "Menara Wray's Camp", negeri: "Pahang", gunung: "Gunung Tahan", lat: 4.6450, lng: 102.2600, provider: "Celcom", type: "4G", signalRadiusKm: 3, status: "weak" },
  { id: "TW-003", name: "Repeater Puncak Tahan", negeri: "Pahang", gunung: "Gunung Tahan", lat: 4.6398, lng: 102.2436, provider: "TM", type: "3G", signalRadiusKm: 0, status: "none" },

  // Cameron Highlands / Gunung Irau, Pahang
  { id: "TW-004", name: "Menara Tanah Rata", negeri: "Pahang", gunung: "Gunung Irau", lat: 4.4711, lng: 101.3777, provider: "Digi", type: "5G", signalRadiusKm: 7, status: "good" },
  { id: "TW-005", name: "Menara Boh Sungai Palas", negeri: "Pahang", gunung: "Gunung Irau", lat: 4.5000, lng: 101.3800, provider: "Maxis", type: "4G", signalRadiusKm: 4, status: "weak" },
  { id: "TW-006", name: "Repeater Puncak Irau", negeri: "Pahang", gunung: "Gunung Irau", lat: 4.5202, lng: 101.3766, provider: "U Mobile", type: "3G", signalRadiusKm: 0, status: "none" },

  // Fraser's Hill, Pahang
  { id: "TW-007", name: "Menara Fraser's Hill Town", negeri: "Pahang", gunung: "Fraser's Hill", lat: 3.7186, lng: 101.7381, provider: "Celcom", type: "4G", signalRadiusKm: 5, status: "good" },
  { id: "TW-008", name: "Menara Jalan Semantan", negeri: "Pahang", gunung: "Fraser's Hill", lat: 3.7050, lng: 101.7500, provider: "Digi", type: "4G", signalRadiusKm: 3, status: "weak" },

  // Gunung Nuang, Selangor
  { id: "TW-009", name: "Menara Kg. Peretak", negeri: "Selangor", gunung: "Gunung Nuang", lat: 3.2100, lng: 101.8300, provider: "Maxis", type: "5G", signalRadiusKm: 6, status: "good" },
  { id: "TW-010", name: "Menara Empangan Batu", negeri: "Selangor", gunung: "Gunung Nuang", lat: 3.2300, lng: 101.8450, provider: "U Mobile", type: "4G", signalRadiusKm: 3, status: "weak" },
  { id: "TW-011", name: "Repeater Puncak Nuang", negeri: "Selangor", gunung: "Gunung Nuang", lat: 3.2431, lng: 101.8564, provider: "TM", type: "3G", signalRadiusKm: 0, status: "none" },

  // Bukit Broga, Selangor
  { id: "TW-012", name: "Menara Semenyih", negeri: "Selangor", gunung: "Bukit Broga", lat: 2.9700, lng: 101.8300, provider: "Digi", type: "5G", signalRadiusKm: 6, status: "good" },
  { id: "TW-013", name: "Menara Kg. Broga", negeri: "Selangor", gunung: "Bukit Broga", lat: 2.9803, lng: 101.8433, provider: "Celcom", type: "4G", signalRadiusKm: 4, status: "good" },

  // Gunung Korbu & Bukit Larut, Perak
  { id: "TW-014", name: "Menara Kg. Sungai Woh", negeri: "Perak", gunung: "Gunung Korbu", lat: 4.6200, lng: 101.2600, provider: "Maxis", type: "4G", signalRadiusKm: 5, status: "good" },
  { id: "TW-015", name: "Repeater Puncak Korbu", negeri: "Perak", gunung: "Gunung Korbu", lat: 4.6503, lng: 101.2725, provider: "TM", type: "3G", signalRadiusKm: 0, status: "none" },
  { id: "TW-016", name: "Menara Taiping", negeri: "Perak", gunung: "Bukit Larut", lat: 4.8500, lng: 100.7400, provider: "Digi", type: "4G", signalRadiusKm: 6, status: "good" },
  { id: "TW-017", name: "Menara Bungalow Larut", negeri: "Perak", gunung: "Bukit Larut", lat: 4.8635, lng: 100.7998, provider: "U Mobile", type: "3G", signalRadiusKm: 3, status: "weak" },

  // Gunung Ledang, Johor
  { id: "TW-018", name: "Menara Tangkak", negeri: "Johor", gunung: "Gunung Ledang", lat: 2.3400, lng: 102.5700, provider: "Celcom", type: "5G", signalRadiusKm: 7, status: "good" },
  { id: "TW-019", name: "Menara Air Terjun Ledang", negeri: "Johor", gunung: "Gunung Ledang", lat: 2.3600, lng: 102.6000, provider: "Maxis", type: "4G", signalRadiusKm: 3, status: "weak" },
  { id: "TW-020", name: "Repeater Puncak Ledang", negeri: "Johor", gunung: "Gunung Ledang", lat: 2.3725, lng: 102.6142, provider: "TM", type: "3G", signalRadiusKm: 0, status: "none" },

  // Gunung Datuk & Berembun, Negeri Sembilan
  { id: "TW-021", name: "Menara Rembau", negeri: "Negeri Sembilan", gunung: "Gunung Datuk", lat: 2.6700, lng: 101.8800, provider: "Digi", type: "4G", signalRadiusKm: 5, status: "good" },
  { id: "TW-022", name: "Repeater Puncak Datuk", negeri: "Negeri Sembilan", gunung: "Gunung Datuk", lat: 2.6867, lng: 101.8964, provider: "U Mobile", type: "3G", signalRadiusKm: 0, status: "none" },
  { id: "TW-023", name: "Menara Kuala Klawang", negeri: "Negeri Sembilan", gunung: "Gunung Berembun", lat: 2.9200, lng: 102.2700, provider: "Maxis", type: "4G", signalRadiusKm: 4, status: "weak" },

  // Gunung Kinabalu, Sabah
  { id: "TW-024", name: "Menara Kundasang", negeri: "Sabah", gunung: "Gunung Kinabalu", lat: 6.0167, lng: 116.5000, provider: "Celcom", type: "5G", signalRadiusKm: 8, status: "good" },
];

const CRITICAL_ZONES: CriticalZone[] = [
  { id: "CZ-001", gunung: "Gunung Tahan", negeri: "Pahang", segment: "Puncak Tahan (± 2km dari kem terakhir)", severity: "none", note: "Tiada liputan langsung, panggilan kecemasan tidak dapat dihantar." },
  { id: "CZ-002", gunung: "Gunung Irau", negeri: "Pahang", segment: "Laluan puncak selepas Gunung Beremban", severity: "none", note: "Zon mati isyarat, GPS masih berfungsi tapi tiada data/panggilan." },
  { id: "CZ-003", gunung: "Gunung Nuang", negeri: "Selangor", segment: "1km terakhir sebelum puncak", severity: "none", note: "Terrain curam menghalang line-of-sight ke menara berdekatan." },
  { id: "CZ-004", gunung: "Gunung Korbu", negeri: "Perak", segment: "Kem Gunting hingga puncak", severity: "none", note: "Kawasan hutan tebal, tiada repeater berfungsi sejak 2023." },
  { id: "CZ-005", gunung: "Gunung Ledang", negeri: "Johor", segment: "Selepas air terjun ke-7", severity: "none", note: "Isyarat hilang sepenuhnya, laporan pendaki mengesahkan." },
  { id: "CZ-006", gunung: "Gunung Datuk", negeri: "Negeri Sembilan", segment: "Tangga besi terakhir ke puncak", severity: "none", note: "Zon curam & berbatu, tiada liputan walaupun cuaca cerah." },
  { id: "CZ-007", gunung: "Gunung Tahan", negeri: "Pahang", segment: "Wray's Camp ke Gunung Gedung", severity: "weak", note: "Isyarat berselang, hanya SMS kadang berjaya dihantar." },
  { id: "CZ-008", gunung: "Fraser's Hill", negeri: "Pahang", segment: "Jalan Semantan – zon rimba", severity: "weak", note: "Liputan tidak konsisten bergantung cuaca." },
];

const NEGERI_LIST = Array.from(new Set(TOWERS.map((t) => t.negeri))).sort();

const STATUS_META: Record<SignalStatus, {
  label: string;
  color: string;
  ring: string;
  text: string;
  icon: typeof SignalHigh;
}> = {
  good: { label: "Baik", color: "#0d9488", ring: "ring-teal-200", text: "text-teal-700", icon: SignalHigh },
  weak: { label: "Lemah", color: "#d97706", ring: "ring-amber-200", text: "text-amber-700", icon: SignalLow },
  none: { label: "Tiada", color: "#e11d48", ring: "ring-rose-200", text: "text-rose-700", icon: SignalZero },
};

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Antenna;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 min-w-[160px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accent}1a` }}
        >
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-800">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </motion.div>
  );
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function CoveragePage() {
  const [negeriFilter, setNegeriFilter] = useState<string>("Semua Negeri");
  const [gunungFilter, setGunungFilter] = useState<string>("Semua Kawasan");
  const [showCoverage, setShowCoverage] = useState(true);

  const gunungOptions = useMemo(() => {
    const list =
      negeriFilter === "Semua Negeri"
        ? TOWERS
        : TOWERS.filter((t) => t.negeri === negeriFilter);
    return ["Semua Kawasan", ...Array.from(new Set(list.map((t) => t.gunung))).sort()];
  }, [negeriFilter]);

  const filteredTowers = useMemo(() => {
    return TOWERS.filter((t) => {
      const negeriMatch = negeriFilter === "Semua Negeri" || t.negeri === negeriFilter;
      const gunungMatch = gunungFilter === "Semua Kawasan" || t.gunung === gunungFilter;
      return negeriMatch && gunungMatch;
    });
  }, [negeriFilter, gunungFilter]);

  const filteredZones = useMemo(() => {
    return CRITICAL_ZONES.filter((z) => {
      const negeriMatch = negeriFilter === "Semua Negeri" || z.negeri === negeriFilter;
      const gunungMatch = gunungFilter === "Semua Kawasan" || z.gunung === gunungFilter;
      return negeriMatch && gunungMatch;
    });
  }, [negeriFilter, gunungFilter]);

  const stats = useMemo(() => {
    const total = filteredTowers.length;
    const good = filteredTowers.filter((t) => t.status === "good").length;
    const weak = filteredTowers.filter((t) => t.status === "weak").length;
    const none = filteredTowers.filter((t) => t.status === "none").length;
    const avgCoverage =
      total === 0 ? 0 : Math.round(((good * 1 + weak * 0.5) / total) * 100);
    return { total, good, weak, none, avgCoverage };
  }, [filteredTowers]);

  const mapCenter: [number, number] =
    filteredTowers.length > 0
      ? [
          filteredTowers.reduce((s, t) => s + t.lat, 0) / filteredTowers.length,
          filteredTowers.reduce((s, t) => s + t.lng, 0) / filteredTowers.length,
        ]
      : [4.2105, 101.9758];

  const mapZoom = gunungFilter !== "Semua Kawasan" ? 12 : negeriFilter !== "Semua Negeri" ? 9 : 6;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Antenna className="h-5 w-5 text-teal-600" />
                <h1 className="text-lg font-semibold text-slate-800">
                  Liputan Rangkaian &amp; Ramalan Menara
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                HikerGuard GeoAI — modul telekomunikasi &amp; jurang liputan trail
              </p>
            </div>
          </div>
          <span className="hidden rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-100 sm:inline-flex">
            Data placeholder — belum model ramalan sebenar
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 pt-6 sm:px-6">
        {/* Stats row */}
        <div className="flex flex-wrap gap-4">
          <StatCard label="Jumlah Menara" value={String(stats.total)} icon={Antenna} accent="#0d9488" />
          <StatCard
            label="Anggaran Liputan"
            value={`${stats.avgCoverage}%`}
            sub="berdasarkan radius placeholder"
            icon={SignalHigh}
            accent="#0d9488"
          />
          <StatCard label="Zon Isyarat Lemah" value={String(stats.weak)} icon={SignalLow} accent="#d97706" />
          <StatCard label="Zon Tiada Liputan" value={String(stats.none)} icon={SignalZero} accent="#e11d48" />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="w-48">
            <Dropdown
              label="Negeri"
              value={negeriFilter}
              options={["Semua Negeri", ...NEGERI_LIST]}
              onChange={(v) => {
                setNegeriFilter(v);
                setGunungFilter("Semua Kawasan");
              }}
            />
          </div>
          <div className="w-56">
            <Dropdown
              label="Bukit / Gunung"
              value={gunungFilter}
              options={gunungOptions}
              onChange={setGunungFilter}
            />
          </div>
          <button
            onClick={() => setShowCoverage((v) => !v)}
            className={`ml-auto flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              showCoverage
                ? "border-teal-200 bg-teal-50 text-teal-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Layers className="h-4 w-4" />
            {showCoverage ? "Sembunyi Liputan" : "Tunjuk Liputan"}
          </button>
        </div>

        {/* Map + legend */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-[420px] w-full">
            <MapContainer
              key={`${negeriFilter}-${gunungFilter}`}
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
              {/*
                CartoDB Voyager — tile layer minimal/bersih berbanding OSM standard.
                Latar lebih senyap (grey/pale) supaya bulatan radius liputan
                (merah/kuning/hijau) dan marker status menara lebih menonjol,
                sambil masih ada label jalan/bandar untuk konteks lokasi.
                maxZoom 20 ikut had CartoDB basemap.
              */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
                maxZoom={20}
              />
              {filteredTowers.map((t) => (
                <span key={t.id}>
                  {showCoverage && t.signalRadiusKm > 0 && (
                    <Circle
                      center={[t.lat, t.lng]}
                      radius={t.signalRadiusKm * 1000}
                      pathOptions={{
                        color: STATUS_META[t.status].color,
                        fillColor: STATUS_META[t.status].color,
                        fillOpacity: 0.12,
                        weight: 1,
                      }}
                    />
                  )}
                  <CircleMarker
                    center={[t.lat, t.lng]}
                    radius={7}
                    pathOptions={{
                      color: "#fff",
                      weight: 2,
                      fillColor: STATUS_META[t.status].color,
                      fillOpacity: 1,
                    }}
                  >
                    <Popup>
                      <div className="space-y-1 text-sm">
                        <div className="font-semibold">{t.name}</div>
                        <div className="text-slate-500">
                          {t.gunung}, {t.negeri}
                        </div>
                        <div>
                          {t.provider} · {t.type}
                        </div>
                        <div>
                          Status:{" "}
                          <span style={{ color: STATUS_META[t.status].color }}>
                            {STATUS_META[t.status].label}
                          </span>
                        </div>
                        {t.signalRadiusKm > 0 && <div>Radius: ~{t.signalRadiusKm} km</div>}
                      </div>
                    </Popup>
                  </CircleMarker>
                </span>
              ))}
            </MapContainer>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            {(Object.keys(STATUS_META) as SignalStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_META[s].color }}
                />
                {STATUS_META[s].label}
              </div>
            ))}
            <span className="ml-auto text-slate-400">
              Bulatan = anggaran radius liputan (placeholder, belum kira terrain)
            </span>
          </div>
        </div>

        {/* Critical zones */}
        <div className="rounded-2xl border border-rose-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-rose-100 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <h2 className="text-sm font-semibold text-slate-800">
              Zon Kritikal — Isyarat Lemah / Tiada Liputan
            </h2>
            <span className="ml-auto rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
              {filteredZones.length} zon
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            <AnimatePresence>
              {filteredZones.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-slate-400">
                  Tiada zon kritikal untuk kawasan yang dipilih.
                </div>
              )}
              {filteredZones.map((z) => (
                <motion.div
                  key={z.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ring-1 ${
                      z.severity === "none" ? "bg-rose-50 ring-rose-200" : "bg-amber-50 ring-amber-200"
                    }`}
                  >
                    {z.severity === "none" ? (
                      <SignalZero className="h-3.5 w-3.5 text-rose-600" />
                    ) : (
                      <SignalLow className="h-3.5 w-3.5 text-amber-600" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{z.gunung}</span>
                      <span className="text-xs text-slate-400">· {z.negeri}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          z.severity === "none"
                            ? "bg-rose-50 text-rose-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {z.severity === "none" ? "Tiada liputan" : "Isyarat lemah"}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> {z.segment}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{z.note}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Tower table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <Radio className="h-4 w-4 text-teal-600" />
            <h2 className="text-sm font-semibold text-slate-800">Senarai Menara</h2>
            <span className="ml-auto rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
              {filteredTowers.length} menara
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2 font-medium">ID</th>
                  <th className="px-4 py-2 font-medium">Nama Menara</th>
                  <th className="px-4 py-2 font-medium">Kawasan</th>
                  <th className="px-4 py-2 font-medium">Pembekal</th>
                  <th className="px-4 py-2 font-medium">Jenis</th>
                  <th className="px-4 py-2 font-medium">Radius</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTowers.map((t) => {
                  const meta = STATUS_META[t.status];
                  const Icon = meta.icon;
                  return (
                    <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2 text-xs text-slate-400">{t.id}</td>
                      <td className="px-4 py-2 font-medium text-slate-700">{t.name}</td>
                      <td className="px-4 py-2 text-slate-500">
                        {t.gunung}, {t.negeri}
                      </td>
                      <td className="px-4 py-2 text-slate-500">{t.provider}</td>
                      <td className="px-4 py-2 text-slate-500">{t.type}</td>
                      <td className="px-4 py-2 text-slate-500">
                        {t.signalRadiusKm > 0 ? `~${t.signalRadiusKm} km` : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${meta.ring} ${meta.text}`}
                        >
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredTowers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                      Tiada menara untuk kawasan yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}