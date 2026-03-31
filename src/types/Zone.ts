export interface Zone {
  id: string;
  name: string;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  coordinates: [number, number][];
}
