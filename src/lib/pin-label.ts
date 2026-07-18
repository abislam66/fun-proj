import { CUISINES, type CuisineKey } from "@/config/cuisines";

/** Primary cuisine wins; empty / unknown → Food. */
export function getPinLabel(cuisines: CuisineKey[]): string {
  const primary = cuisines[0];
  if (!primary) return "Food";
  return CUISINES[primary].pinLabel;
}
