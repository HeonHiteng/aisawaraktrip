import {
  Bird,
  Drama,
  Landmark,
  Mountain,
  ShoppingBag,
  Trees,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { CategorySlug } from "@/types/catalogue";

/** The lucide icon for each interest category (matches the `icon` names in the demo fixtures). */
export const CATEGORY_ICON: Record<CategorySlug, LucideIcon> = {
  nature: Trees,
  wildlife: Bird,
  culture: Drama,
  heritage: Landmark,
  food: Utensils,
  adventure: Mountain,
  shopping: ShoppingBag,
};
