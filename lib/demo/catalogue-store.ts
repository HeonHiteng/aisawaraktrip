import "server-only";
import type { Attraction, Experience, Vendor } from "@/types/catalogue";
import {
  demoAttractions,
  demoExperiences,
  demoVendors,
} from "@/lib/demo/fixtures";

/**
 * Mutable catalogue for demo mode. Admin edits land here and flow straight
 * through to the tourist app (`lib/domain/catalogue` reads this in demo mode).
 * Global (not per-user); resets on server restart.
 */
interface CatalogueStore {
  attractions: Attraction[];
  vendors: Vendor[];
  experiences: Experience[];
}

const g = globalThis as unknown as { __demoCatalogue?: CatalogueStore };

g.__demoCatalogue ??= {
  attractions: structuredClone(demoAttractions),
  vendors: structuredClone(demoVendors),
  experiences: structuredClone(demoExperiences),
};

export function catalogueStore(): CatalogueStore {
  return g.__demoCatalogue!;
}
