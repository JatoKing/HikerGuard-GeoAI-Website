Projek [Next.js](https://nextjs.org) ini dibina menggunakan [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Apa itu HikerGuard GeoAI

Alat pemantauan &amp; koordinasi off-grid untuk pasukan search-and-rescue (SAR) pendaki di Malaysia. Ia memaparkan lokasi pendaki, menandakan trip yang senyap atau menyimpang dari laluan berdaftar, dan membantu pasukan SAR merancang liputan rangkaian di laluan gunung yang terpencil.

**Status semasa: prototaip frontend sahaja.** Semua data trip/alert/SOS/liputan rangkaian di setiap page adalah data mock/dummy — backend/API sebenar belum disambungkan lagi. Lokasi laluan pendakian dan penanda negeri Malaysia menggunakan koordinat sebenar.

## Pages

| Route | Fail | Kegunaan |
|---|---|---|
| `/` | [app/page.tsx](app/page.tsx) | Landing page — globe MapLibre interaktif (imej satelit, tiada API key) yang terbang masuk ke Malaysia dan memaparkan kad login. Hantar borang login (belum berfungsi sebenar) akan redirect ke `/dashboard`. |
| `/dashboard` | [app/dashboard/page.tsx](app/dashboard/page.tsx) | Dashboard operasi utama — statistik pendaki aktif, log alert langsung, jadual trip aktif, panel kes SOS, widget cuaca, dan peta Leaflet menunjukkan laluan/lokasi pendaki. Boleh ditapis ikut negeri dan laluan. |
| `/coverage-net` | [app/coverage-net/page.tsx](app/coverage-net/page.tsx) | Paparan liputan rangkaian &amp; ramalan menara — overlay radius isyarat placeholder bagi setiap menara pada peta Leaflet, akan digantikan dengan model ramalan terrain/elevation sebenar kemudian. |

Navigasi antara `/dashboard` dan `/coverage-net` dikendalikan oleh komponen kongsi [components/navtabs.tsx](components/navtabs.tsx) — untuk tambah page baru, cukup tambah satu entri dalam array `NAV_ITEMS` di situ.

## Kod kongsi (shared code)

- [lib/trails.ts](lib/trails.ts) — data rujukan: laluan pendakian ikut negeri lengkap dengan koordinat sebenar (`TRAIL_DATA`), serta lookup `trailStateMap`/`trailCoordMap`. Dikongsi antara peta dashboard dan coverage-net. Nak tambah lokasi baru, cuma tambah entri dalam `TRAIL_DATA`.
- [lib/dashboardtypes.ts](lib/dashboardtypes.ts) — jenis (types) kongsi seperti `AlertItem`, `TripStatus`, `SosCase`, serta helper warna/label severity. Diasingkan dari dashboard page supaya komponen peta boleh di-lazy-load tanpa circular import.
- [lib/utils.ts](lib/utils.ts) — helper `cn()` untuk classname (clsx + tailwind-merge), digunakan oleh komponen bergaya shadcn.
- [components/dashboardmap.tsx](components/dashboardmap.tsx) — peta Leaflet untuk dashboard. **Wajib** dimuatkan melalui `next/dynamic` dengan `ssr: false` (rujuk `app/dashboard/page.tsx`) — Leaflet menyentuh `window` semasa modul dimuatkan, jadi kalau di-import di tempat yang di-render semasa SSR, ia akan rosak.
- [components/ui/globe.tsx](components/ui/globe.tsx) — komponen globe WebGL hiasan (`cobe`), berasingan dari globe MapLibre pada landing page.
- [components.json](components.json) — konfigurasi CLI shadcn. `npx shadcn add <component>` akan letak komponen UI baru dalam `components/ui/`.

## Mula (Getting Started)

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser. Mula di `/` untuk landing page, atau terus ke `/dashboard`.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS + framer-motion + lucide-react, MapLibre GL JS (globe di landing page) dan Leaflet/react-leaflet (peta dashboard + coverage-net, tile OpenStreetMap — percuma, tiada API key). Kedua-dua library peta memerlukan sambungan internet untuk muat turun tile.

## Ketahui Lebih Lanjut

Untuk ketahui lebih lanjut tentang Next.js, rujuk sumber berikut:

- [Next.js Documentation](https://nextjs.org/docs) - ketahui tentang ciri &amp; API Next.js.
- [Learn Next.js](https://nextjs.org/learn) - tutorial interaktif Next.js.

## Deploy di Vercel

Cara paling mudah untuk deploy app Next.js ialah menggunakan [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) daripada pencipta Next.js.

Rujuk [dokumentasi deployment Next.js](https://nextjs.org/docs/app/building-your-application/deploying) kami untuk maklumat lanjut.
