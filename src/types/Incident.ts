export interface Incident {
  id: string;
  type: string;
  description: string;
  position: [number, number];
  confirmationsCount?: number;
  reporterName?: string;
  reporterRole?: string;
  createdAt?: string;
  displayOpacity?: number;
  displayColor?: string;
}
