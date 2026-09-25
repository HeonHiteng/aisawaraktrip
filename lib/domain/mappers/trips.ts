import type { Json, Tables } from "@/types/database";
import { isCategorySlug } from "@/types/catalogue";
import type {
  Itinerary,
  ItineraryDay,
  ItineraryItem,
  Trip,
  TripInput,
} from "@/types/trip";

/**
 * Domain <-> database mappers for trips. Pure, so the shape contract with the
 * `create_trip` / `save_itinerary` SQL functions is unit-tested.
 */

/** Select string that loads a trip with its whole itinerary tree in one query. */
export const TRIP_SELECT =
  "*, itineraries(*, itinerary_days(*, itinerary_items(*, attraction:attractions(slug))))";

type ItemRow = Tables<"itinerary_items"> & {
  attraction: { slug: string } | null;
};
type DayRow = Tables<"itinerary_days"> & { itinerary_items: ItemRow[] };
type ItineraryRow = Tables<"itineraries"> & { itinerary_days: DayRow[] };
export type TripRow = Tables<"trips"> & { itineraries: ItineraryRow[] };

/** "17:30:00" (Postgres time) -> "17:30". */
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

const pax = (t: Pick<TripInput, "numAdults" | "numChildren">) =>
  t.numAdults + t.numChildren;

// ---------- domain -> database ----------

/**
 * `budget_total` is the whole group's budget; the app's `budgetPerPerson` times
 * travellers (the same multiplication TripSnapshot does for display).
 * NOTE: no `userId` — ownership comes from the caller's session inside SQL.
 */
export function tripToRpc(input: TripInput): Json {
  const total =
    input.budgetPerPerson == null
      ? null
      : Math.round(input.budgetPerPerson * pax(input) * 100) / 100;
  return {
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    budgetTotal: total,
    groupType: input.groupType,
    numAdults: input.numAdults,
    numChildren: input.numChildren,
    interests: input.interests,
    pace: input.pace,
    notes: input.notes,
  };
}

/** Version and ids are deliberately omitted: the database assigns both. */
export function itineraryToRpc(itinerary: Itinerary): Json {
  return {
    generatedBy: itinerary.generatedBy,
    model: itinerary.model,
    requestSummary: itinerary.requestSummary,
    days: itinerary.days.map((d) => ({
      dayNumber: d.dayNumber,
      date: d.date,
      summary: d.summary,
      items: d.items.map((i) => ({
        type: i.type,
        startTime: i.startTime,
        endTime: i.endTime,
        durationMinutes: i.durationMinutes,
        title: i.title,
        description: i.description,
        whyRecommended: i.whyRecommended,
        estimatedCost: i.estimatedCost,
        locationLabel: i.locationLabel,
        attractionId: i.attractionId,
        experienceId: i.experienceId,
        bookable: i.bookable,
      })),
    })),
  };
}

// ---------- database -> domain ----------

function itemFromRow(r: ItemRow): ItineraryItem {
  return {
    id: r.id,
    type: r.item_type,
    startTime: hhmm(r.start_time),
    endTime: hhmm(r.end_time),
    durationMinutes: r.duration_minutes ?? 0,
    title: r.title,
    description: r.description ?? "",
    whyRecommended: r.why_recommended,
    estimatedCost: Number(r.estimated_cost),
    locationLabel: r.location_label,
    // The slug is only for links: an admin-unpublished attraction hides it (RLS),
    // but the id — what persistence uses — is always kept.
    attractionSlug: r.attraction?.slug ?? null,
    attractionId: r.attraction_id,
    experienceId: r.experience_id,
    bookable: r.is_bookable,
  };
}

function dayFromRow(r: DayRow): ItineraryDay {
  return {
    dayNumber: r.day_number,
    date: r.date ?? "",
    summary: r.summary ?? "",
    items: [...r.itinerary_items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(itemFromRow),
  };
}

function itineraryFromRow(r: ItineraryRow): Itinerary {
  return {
    id: r.id,
    version: r.version,
    generatedBy: r.generated_by,
    model: r.model,
    requestSummary: r.request_summary ?? "",
    days: [...r.itinerary_days]
      .sort((a, b) => a.day_number - b.day_number)
      .map(dayFromRow),
    createdAt: r.created_at,
  };
}

export function tripFromRow(row: TripRow): Trip {
  const travellers = row.num_adults + row.num_children;
  const current = row.itineraries.find((i) => i.is_current) ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    destination: row.destination,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    startDate: row.start_date,
    endDate: row.end_date,
    budgetPerPerson:
      row.budget_total == null || travellers < 1
        ? null
        : Math.round((Number(row.budget_total) / travellers) * 100) / 100,
    groupType: row.group_type,
    numAdults: row.num_adults,
    numChildren: row.num_children,
    interests: row.interests.filter(isCategorySlug),
    pace: row.pace,
    notes: row.notes,
    itinerary: current ? itineraryFromRow(current) : null,
  };
}
