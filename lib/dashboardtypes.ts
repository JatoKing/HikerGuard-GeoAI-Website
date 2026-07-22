// ---------------------------------------------------------------------------
// lib/dashboardTypes.ts
// Jenis data & helper dikongsi antara app/dashboard/page.tsx dan
// components/DashboardMap.tsx (diasingkan supaya map component boleh
// di-lazy-load betul-betul tanpa circular import).
// ---------------------------------------------------------------------------

export type AlertSeverity = "critical" | "warning" | "info";

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  hiker: string;
  trail: string;
  message: string;
  time: string;
}

export interface TripStatus {
  id: string;
  hiker: string;
  trail: string;
  startTime: string;
  lastSeen: string;
  status: "active" | "deviation" | "sos";
  riskScore: number; // 0 - 100
}

export interface SosCase {
  id: string;
  hiker: string;
  trail: string;
  triggeredAt: string;
  lastKnownLocation: string;
  teamAssigned: string | null;
}

export function severityColor(
  severity: AlertSeverity | TripStatus["status"]
) {
  switch (severity) {
    case "critical":
    case "sos":
      return "#C6421C";
    case "warning":
    case "deviation":
      return "#A6720B";
    default:
      return "#12805F";
  }
}

export function severityLabel(status: TripStatus["status"]) {
  switch (status) {
    case "sos":
      return "SOS";
    case "deviation":
      return "Deviation";
    default:
      return "Aktif";
  }
}