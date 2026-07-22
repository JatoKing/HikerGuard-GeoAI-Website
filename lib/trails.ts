// ---------------------------------------------------------------------------
// lib/trails.ts
// Data rujukan kongsi: senarai laluan pendakian ikut negeri, lengkap dengan
// koordinat — dipakai oleh app/dashboard/page.tsx DAN app/geoai/page.tsx
// supaya tak duplicate data yang sama di dua tempat.
//
// NOTA: Disenaraikan HANYA 6 lokasi ikut permintaan awak (bukan senarai penuh
// 100 laluan lagi). Nak tambah lokasi lain balik? Cuma tambah entri baru
// dalam TRAIL_DATA di bawah — struktur/interface kekal sama.
// ---------------------------------------------------------------------------

export interface TrailRef {
  name: string;
  area: string;
  lat: number;
  lng: number;
}

export interface StateTrails {
  state: string;
  trails: TrailRef[];
}

export const TRAIL_DATA: StateTrails[] = [
  {
    state: "Perak",
    trails: [
      { name: "Gunung Batu Putih", area: "Tapah", lat: 4.2223119, lng: 101.4410165 },
      { name: "Gunung Korbu", area: "Ulu Kinta", lat: 4.6833333, lng: 101.3 },
      {
        name: "Gopeng Ultra Trail / Gua Tempurung",
        area: "Gopeng",
        lat: 4.4160094,
        lng: 101.1876852,
      },
    ],
  },
  {
    state: "Selangor",
    trails: [
      { name: "Bukit Wawasan", area: "Puchong", lat: 3.0247495, lng: 101.6297815 },
      { name: "Bukit Tabur", area: "Taman Melawati, Ampang", lat: 3.2331783, lng: 101.7476175 },
    ],
  },
  {
    state: "Johor",
    trails: [
      { name: "Gunung Panti", area: "Kota Tinggi", lat: 1.8344444, lng: 103.9005556 },
    ],
  },
];

// Lookup pantas: nama laluan -> senarai negeri (sesetengah nama laluan wujud
// di lebih dari satu negeri — disimpan sebagai array, bukan satu string sahaja)
export const trailStateMap: Record<string, string[]> = TRAIL_DATA.reduce(
  (acc, s) => {
    s.trails.forEach((t) => {
      if (!acc[t.name]) acc[t.name] = [];
      acc[t.name].push(s.state);
    });
    return acc;
  },
  {} as Record<string, string[]>
);

// Lookup pantas: koordinat pertama yang dijumpai untuk setiap nama laluan
// (untuk letak pin di peta / cari trip aktif punya lokasi)
export const trailCoordMap: Record<string, { lat: number; lng: number }> = {};
TRAIL_DATA.forEach((s) => {
  s.trails.forEach((t) => {
    if (!trailCoordMap[t.name]) {
      trailCoordMap[t.name] = { lat: t.lat, lng: t.lng };
    }
  });
});