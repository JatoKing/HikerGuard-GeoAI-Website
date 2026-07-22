"use client";

/**
 * HikerGuard GeoAI — Operations Dashboard
 * Route: app/dashboard/page.tsx
 *
 * Stack assumed: Next.js (App Router) + TypeScript + Tailwind CSS + framer-motion + lucide-react
 * (semua package ini dah awak install sebelum ni untuk landing page)
 *
 * Data trip/alert/SOS dalam fail ni SEMUA dummy/mock — tukar kepada fetch dari
 * API sebenar bila backend awak siap. Peta pula guna data SEBENAR: 100 lokasi
 * pendakian/bukit yang awak bekalkan, lengkap dengan koordinat, dipaparkan
 * guna Leaflet + OpenStreetMap (percuma, tiada API key diperlukan).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavTabs from "@/components/navtabs";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { TRAIL_DATA, trailStateMap } from "@/lib/trails";
import {
  AlertItem,
  TripStatus,
  SosCase,
  severityColor,
  severityLabel,
} from "@/lib/dashboardtypes";
import {
  Activity,
  AlertTriangle,
  Cloud,
  CloudRain,
  Droplets,
  MapPin,
  Radio,
  ShieldAlert,
  TrendingUp,
  Users,
  Wind,
  Clock,
  ChevronRight,
  Filter,
  X,
  LogOut,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens — LIGHT THEME (rujuk komen di bawah setiap warna)
// ---------------------------------------------------------------------------
// bg-base        #F7F5EF  latar utama, warna kertas topo-map (bukan putih terus)
// bg-panel       #FFFFFF  permukaan panel
// bg-panel-raised#F0EDE4  elemen yang timbul sikit dari panel / hover state
// border-line    #E3DFD3  garis halus antara elemen
// text-primary   #1C211D  dakwat gelap, bukan hitam pekat
// text-muted     #6E7568
// accent-flare   #C6421C  kritikal / SOS (nada lebih pekat drpd dark theme utk kontras di atas putih)
// accent-amber   #A6720B  amaran / risiko
// accent-teal    #12805F  selamat / aktif
// accent-sky     #1D6F9E  info / cuaca

// ---------------------------------------------------------------------------
// Types: AlertItem, TripStatus, SosCase — sila rujuk lib/dashboardTypes.ts
// ---------------------------------------------------------------------------

// Mock data — gantikan dengan data dari API bila dah sedia
// ---------------------------------------------------------------------------
const stats = [
  {
    label: "Pendaki Aktif",
    value: "24",
    delta: "+3 dari semalam",
    icon: Users,
    accent: "#12805F",
  },
  {
    label: "Alert Hari Ini",
    value: "7",
    delta: "2 kritikal",
    icon: AlertTriangle,
    accent: "#A6720B",
  },
  {
    label: "Purata Risk Score",
    value: "42",
    delta: "Sederhana",
    icon: TrendingUp,
    accent: "#1D6F9E",
  },
  {
    label: "Trail Paling Ramai",
    value: "Bukit Tabur",
    delta: "9 pendaki",
    icon: MapPin,
    accent: "#C6421C",
  },
];

const alerts: AlertItem[] = [
  {
    id: "a1",
    severity: "critical",
    hiker: "Aiman Rizal",
    trail: "Gunung Korbu",
    message: "SOS diterima — tiada pergerakan 15 minit",
    time: "2 min lalu",
  },
  {
    id: "a2",
    severity: "warning",
    hiker: "Farah Nadia",
    trail: "Bukit Tabur",
    message: "Deviation 480m dari laluan berdaftar",
    time: "11 min lalu",
  },
  {
    id: "a3",
    severity: "info",
    hiker: "Danish Haziq",
    trail: "Bukit Wawasan",
    message: "Check-in dijadualkan berjaya",
    time: "24 min lalu",
  },
  {
    id: "a4",
    severity: "warning",
    hiker: "Nur Iman",
    trail: "Gunung Panti",
    message: "Kelajuan pergerakan menurun mendadak",
    time: "38 min lalu",
  },
  {
    id: "a5",
    severity: "info",
    hiker: "Haziq Amirul",
    trail: "Gopeng Ultra Trail / Gua Tempurung",
    message: "Trip bermula",
    time: "1 jam lalu",
  },
];

const trips: TripStatus[] = [
  {
    id: "t1",
    hiker: "Aiman Rizal",
    trail: "Gunung Korbu",
    startTime: "06:20 AM",
    lastSeen: "2 min lalu",
    status: "sos",
    riskScore: 88,
  },
  {
    id: "t2",
    hiker: "Farah Nadia",
    trail: "Bukit Tabur",
    startTime: "07:05 AM",
    lastSeen: "11 min lalu",
    status: "deviation",
    riskScore: 61,
  },
  {
    id: "t3",
    hiker: "Danish Haziq",
    trail: "Bukit Wawasan",
    startTime: "08:00 AM",
    lastSeen: "1 min lalu",
    status: "active",
    riskScore: 18,
  },
  {
    id: "t4",
    hiker: "Nur Iman",
    trail: "Gunung Panti",
    startTime: "06:45 AM",
    lastSeen: "38 min lalu",
    status: "deviation",
    riskScore: 54,
  },
  {
    id: "t5",
    hiker: "Haziq Amirul",
    trail: "Gopeng Ultra Trail / Gua Tempurung",
    startTime: "09:10 AM",
    lastSeen: "just now",
    status: "active",
    riskScore: 22,
  },
];

const sosCases: SosCase[] = [
  {
    id: "c1",
    hiker: "Aiman Rizal",
    trail: "Gunung Korbu",
    triggeredAt: "10:42 AM",
    lastKnownLocation: "4.6833° N, 101.3000° E",
    teamAssigned: null,
  },
];

const weather = {
  location: "Bukit Tabur, Selangor",
  tempC: 22,
  condition: "Hujan ringan",
  humidity: 87,
  windKph: 14,
  riskImpact: "Laluan licin — risiko tergelincir meningkat",
};


// ---------------------------------------------------------------------------
// Small shared UI helpers
// ---------------------------------------------------------------------------
// severityColor / severityLabel — rujuk lib/dashboardTypes.ts
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: "easeOut" as const },
  }),
};

// ---------------------------------------------------------------------------
// Section: Header
// ---------------------------------------------------------------------------
function DashboardHeader() {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    // Bila auth sebenar dah siap (contoh session/cookie/JWT), clear kat sini
    // sebelum redirect. Buat masa ni terus hantar balik ke landing page.
    router.push("/");
  };

  return (
    <div className="flex flex-col gap-1 border-b border-[#E3DFD3] pb-5 mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-[#12805F] text-xs font-mono tracking-widest uppercase">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#12805F] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#12805F]" />
          </span>
          Live
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1C211D] mt-1 tracking-tight">
          HikerGuard GeoAI — Operations Dashboard
        </h1>
        <p className="text-sm text-[#6E7568] mt-0.5">
          Pemantauan pendaki &amp; koordinasi search-and-rescue, laluan gunung Malaysia
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="font-mono text-sm text-[#6E7568] flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {now
            ? now.toLocaleTimeString("en-MY", { hour12: false })
            : "--:--:--"}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm font-medium text-[#1C211D] bg-[#FFFFFF] border border-[#E3DFD3] rounded-lg px-3 py-2 hover:bg-[#F0EDE4] transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log Keluar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Stats row
// ---------------------------------------------------------------------------
function StatsRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <motion.div
            key={s.label}
            custom={i}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="bg-[#FFFFFF] border border-[#E3DFD3] rounded-xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-[#6E7568]">
                {s.label}
              </span>
              <Icon className="h-4 w-4" style={{ color: s.accent }} />
            </div>
            <div>
              <div className="text-2xl font-mono font-semibold text-[#1C211D]">
                {s.value}
              </div>
              <div className="text-xs text-[#6E7568] mt-0.5">{s.delta}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Filter bar (Negeri + Bukit/Gunung)
// ---------------------------------------------------------------------------
interface FilterBarProps {
  selectedState: string;
  selectedTrail: string;
  onStateChange: (state: string) => void;
  onTrailChange: (trail: string) => void;
  onReset: () => void;
}

function FilterBar({
  selectedState,
  selectedTrail,
  onStateChange,
  onTrailChange,
  onReset,
}: FilterBarProps) {
  const rawTrailOptions =
    selectedState === "all"
      ? TRAIL_DATA.flatMap((s) => s.trails)
      : TRAIL_DATA.find((s) => s.state === selectedState)?.trails ?? [];

  // Sesetengah nama laluan (contoh "Gunung Berembun") wujud di lebih dari satu
  // negeri — bila "Semua Negeri" dipilih, dedupe ikut nama supaya tak keluar
  // dua kali dalam dropdown yang sama.
  const trailOptions = Array.from(
    new Map(rawTrailOptions.map((t) => [t.name, t])).values()
  );

  const isFiltering = selectedState !== "all" || selectedTrail !== "all";

  return (
    <div className="bg-[#FFFFFF] border border-[#E3DFD3] rounded-xl px-4 py-3 mb-6 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-[#6E7568] text-sm font-medium shrink-0">
        <Filter className="h-4 w-4" />
        Tapis
      </div>

      <select
        value={selectedState}
        onChange={(e) => onStateChange(e.target.value)}
        className="bg-[#F7F5EF] border border-[#E3DFD3] text-[#1C211D] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#12805F]/40 cursor-pointer"
      >
        <option value="all">Semua Negeri</option>
        {TRAIL_DATA.map((s) => (
          <option key={s.state} value={s.state}>
            {s.state}
          </option>
        ))}
      </select>

      <select
        value={selectedTrail}
        onChange={(e) => onTrailChange(e.target.value)}
        className="bg-[#F7F5EF] border border-[#E3DFD3] text-[#1C211D] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#12805F]/40 cursor-pointer min-w-[160px]"
      >
        <option value="all">Semua Bukit/Gunung</option>
        {trailOptions.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>

      {isFiltering && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-sm text-[#C6421C] hover:underline ml-auto"
        >
          <X className="h-3.5 w-3.5" />
          Reset penapis
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Peta — lazy-loaded, client-only sahaja (fix "window is not
// defined"). Guna import() sebenar (bukan Promise.resolve atas reference
// yang dah di-import statik) supaya leaflet betul-betul tak dinilai di server.
// ---------------------------------------------------------------------------
const MapPanel = dynamic(() => import("@/components/dashboardmap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 min-h-[420px] bg-[#FDFCF9] border border-[#E3DFD3] rounded-xl flex items-center justify-center">
      <span className="text-sm text-[#6E7568]">Memuatkan peta…</span>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Section: Alert ticker (log dispatch)
// ---------------------------------------------------------------------------
function AlertTicker({ alerts: items }: { alerts: AlertItem[] }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E3DFD3] rounded-xl flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E3DFD3]">
        <Radio className="h-4 w-4 text-[#12805F]" />
        <span className="text-sm font-medium text-[#1C211D]">
          Log Alert ({items.length})
        </span>
      </div>
      <div className="flex-1 max-h-[300px] overflow-y-auto divide-y divide-[#E3DFD3]">
        {items.length === 0 && (
          <div className="px-4 py-6 text-sm text-[#6E7568] text-center">
            Tiada alert untuk penapis ini
          </div>
        )}
        {items.map((a) => (
          <div key={a.id} className="px-4 py-3 flex items-start gap-3">
            <span
              className="mt-1 h-2 w-2 rounded-full shrink-0"
              style={{
                backgroundColor: severityColor(a.severity),
                boxShadow:
                  a.severity === "critical"
                    ? `0 0 0 3px ${severityColor(a.severity)}33`
                    : undefined,
              }}
            />
            <div className="min-w-0">
              <div className="text-sm text-[#1C211D] truncate">
                <span className="font-medium">{a.hiker}</span>{" "}
                <span className="text-[#6E7568]">· {a.trail}</span>
              </div>
              <div className="text-xs text-[#6E7568] mt-0.5">{a.message}</div>
              <div className="text-[11px] font-mono text-[#6E7568]/70 mt-1">
                {a.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Weather widget
// ---------------------------------------------------------------------------
function WeatherWidget() {
  return (
    <div className="bg-[#FFFFFF] border border-[#E3DFD3] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <CloudRain className="h-4 w-4 text-[#1D6F9E]" />
        <span className="text-sm font-medium text-[#1C211D]">
          Cuaca — {weather.location}
        </span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-3xl font-mono font-semibold text-[#1C211D]">
          {weather.tempC}°C
        </div>
        <div className="text-sm text-[#6E7568] text-right">
          {weather.condition}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-[#6E7568] mb-3">
        <div className="flex items-center gap-1.5">
          <Droplets className="h-3.5 w-3.5" /> {weather.humidity}% lembapan
        </div>
        <div className="flex items-center gap-1.5">
          <Wind className="h-3.5 w-3.5" /> {weather.windKph} km/j
        </div>
      </div>
      <div className="flex items-start gap-1.5 text-xs text-[#A6720B] bg-[#A6720B]/10 rounded-md px-2.5 py-2">
        <Cloud className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        {weather.riskImpact}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Active trips table
// ---------------------------------------------------------------------------
function ActiveTripsTable({ trips: items }: { trips: TripStatus[] }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E3DFD3] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E3DFD3] flex items-center gap-2">
        <Activity className="h-4 w-4 text-[#12805F]" />
        <span className="text-sm font-medium text-[#1C211D]">
          Trip Aktif ({items.length})
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[#6E7568] border-b border-[#E3DFD3]">
              <th className="px-4 py-2.5 font-medium">Pendaki</th>
              <th className="px-4 py-2.5 font-medium">Trail</th>
              <th className="px-4 py-2.5 font-medium">Mula</th>
              <th className="px-4 py-2.5 font-medium">Last Seen</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Risk Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3DFD3]">
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-sm text-[#6E7568] text-center"
                >
                  Tiada trip aktif untuk penapis ini
                </td>
              </tr>
            )}
            {items.map((t) => (
              <tr key={t.id} className="hover:bg-[#F0EDE4] transition-colors">
                <td className="px-4 py-3 text-[#1C211D] font-medium whitespace-nowrap">
                  {t.hiker}
                </td>
                <td className="px-4 py-3 text-[#6E7568] whitespace-nowrap">
                  {t.trail}
                </td>
                <td className="px-4 py-3 text-[#6E7568] font-mono whitespace-nowrap">
                  {t.startTime}
                </td>
                <td className="px-4 py-3 text-[#6E7568] font-mono whitespace-nowrap">
                  {t.lastSeen}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      color: severityColor(t.status),
                      backgroundColor: `${severityColor(t.status)}1A`,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: severityColor(t.status) }}
                    />
                    {severityLabel(t.status)}
                  </span>
                </td>
                <td className="px-4 py-3 min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[#E3DFD3] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${t.riskScore}%`,
                          backgroundColor:
                            t.riskScore >= 70
                              ? "#C6421C"
                              : t.riskScore >= 40
                              ? "#A6720B"
                              : "#12805F",
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs text-[#6E7568] w-7 text-right">
                      {t.riskScore}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: SOS case management
// ---------------------------------------------------------------------------
function SosCasesPanel() {
  if (sosCases.length === 0) return null;

  return (
    <div className="bg-[#FBEAE3] border border-[#C6421C]/40 rounded-xl overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-[#C6421C]/30 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-[#C6421C]" />
        <span className="text-sm font-medium text-[#1C211D]">
          Kes SOS Aktif ({sosCases.length})
        </span>
      </div>
      <div className="divide-y divide-[#C6421C]/20">
        {sosCases.map((c) => (
          <div
            key={c.id}
            className="px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div>
              <div className="text-[#1C211D] font-medium">
                {c.hiker} — {c.trail}
              </div>
              <div className="text-xs text-[#6E7568] mt-1 font-mono">
                Dicetuskan {c.triggeredAt} · {c.lastKnownLocation}
              </div>
              <div className="text-xs mt-1">
                {c.teamAssigned ? (
                  <span className="text-[#12805F]">
                    Team ditugaskan: {c.teamAssigned}
                  </span>
                ) : (
                  <span className="text-[#C6421C]">
                    Belum ada search team ditugaskan
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 bg-[#C6421C] text-[#FFFFFF] text-sm font-medium px-3.5 py-2 rounded-lg hover:opacity-90 transition-opacity shrink-0"
            >
              Tugaskan Search Team
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const [selectedState, setSelectedState] = useState("all");
  const [selectedTrail, setSelectedTrail] = useState("all");

  // Bila negeri ditukar, reset pilihan bukit/gunung supaya tak "terperangkap"
  // dengan trail dari negeri yang lain.
  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedTrail("all");
  };

  const handleReset = () => {
    setSelectedState("all");
    setSelectedTrail("all");
  };

  const matchesFilter = (trail: string) => {
    if (selectedTrail !== "all") return trail === selectedTrail;
    if (selectedState !== "all") {
      return (trailStateMap[trail] ?? []).includes(selectedState);
    }
    return true;
  };

  const filteredAlerts = alerts.filter((a) => matchesFilter(a.trail));
  const filteredTrips = trips.filter((t) => matchesFilter(t.trail));

  const filterLabel =
    selectedTrail !== "all"
      ? selectedTrail
      : selectedState !== "all"
      ? selectedState
      : undefined;

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-4 py-6 sm:px-8 sm:py-8">
      <div className="max-w-7xl mx-auto">
        <NavTabs />
        <DashboardHeader />
        <SosCasesPanel />
        <StatsRow />

        <FilterBar
          selectedState={selectedState}
          selectedTrail={selectedTrail}
          onStateChange={handleStateChange}
          onTrailChange={setSelectedTrail}
          onReset={handleReset}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 flex">
            <MapPanel
              filterLabel={filterLabel}
              selectedState={selectedState}
              selectedTrail={selectedTrail}
              trips={filteredTrips}
            />
          </div>
          <div className="flex flex-col gap-4">
            <AlertTicker alerts={filteredAlerts} />
            <WeatherWidget />
          </div>
        </div>

        <div className="mb-6">
          <ActiveTripsTable trips={filteredTrips} />
        </div>
      </div>
    </main>
  );
}