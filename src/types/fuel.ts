
export interface FuelEntry {
  id: string;
  date: string;
  liters: number;
  total_cost: number;
  consumption: number;
  kilometers_driven: number;
  price_per_liter: number;
  fuel_type: "gas" | "gasoline" | "ethanol" | "diesel";
  created_at: string;
  updated_at: string;
  user_id: string;
}
