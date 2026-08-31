import type {
  Attraction,
  Category,
  Experience,
  LocationRef,
  Vendor,
} from "@/types/catalogue";

/** Mirrors supabase/seed.sql so the demo and the real DB look the same. */

export const demoCategories: Category[] = [
  { slug: "nature", name: "Nature", icon: "trees" },
  { slug: "wildlife", name: "Wildlife", icon: "bird" },
  { slug: "culture", name: "Culture", icon: "drama" },
  { slug: "heritage", name: "Heritage", icon: "landmark" },
  { slug: "food", name: "Food", icon: "utensils" },
  { slug: "adventure", name: "Adventure", icon: "mountain" },
  { slug: "shopping", name: "Shopping", icon: "shopping-bag" },
];

const loc = {
  city: {
    id: "loc-city",
    name: "Kuching City Centre",
    area: "Kuching",
  },
  santubong: {
    id: "loc-santubong",
    name: "Santubong & Damai",
    area: "Kuching",
  },
  bako: { id: "loc-bako", name: "Bako", area: "Kuching" },
  semenggoh: {
    id: "loc-semenggoh",
    name: "Semenggoh",
    area: "Kuching",
  },
  padawan: {
    id: "loc-padawan",
    name: "Padawan & Annah Rais",
    area: "Kuching",
  },
} satisfies Record<string, LocationRef>;

export const demoLocations: LocationRef[] = Object.values(loc);

const IMG = {
  waterfront:
    "https://images.unsplash.com/photo-1591017403286-fd8493524e1e?w=1200&q=70",
  rainforest:
    "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=70",
  orangutan:
    "https://images.unsplash.com/photo-1605552055839-6d5c2f7d0a2a?w=1200&q=70",
  streetFood:
    "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=1200&q=70",
  cruise:
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=70",
  kayak:
    "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=1200&q=70",
  temple:
    "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=1200&q=70",
  longhouse:
    "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200&q=70",
  market:
    "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200&q=70",
  museum:
    "https://images.unsplash.com/photo-1566127992631-137a642a90f4?w=1200&q=70",
  cooking:
    "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=70",
};

export const demoAttractions: Attraction[] = [
  {
    id: "att-waterfront",
    slug: "kuching-waterfront",
    name: "Kuching Waterfront",
    summary: "Landscaped riverside promenade in the heart of the old town.",
    description:
      "A ~1 km walkway along the Sarawak River with food stalls, the Darul Hana musical fountain, and views across to the State Assembly and Fort Margherita. Best at sunset.",
    location: loc.city,
    address: "Main Bazaar, 93000 Kuching",
    lat: 1.5599,
    lng: 110.3499,
    avgVisitMinutes: 60,
    priceMin: 0,
    priceMax: 0,
    isFree: true,
    bookingRequired: false,
    openingHours: { daily: "Open 24 hours" },
    tips: "Come for sunset, stay for the night market stalls.",
    categories: ["heritage", "food"],
    images: [{ url: IMG.waterfront, alt: "Kuching Waterfront at dusk" }],
    isSample: true,
    isPublished: true,
  },
  {
    id: "att-museum",
    slug: "borneo-cultures-museum",
    name: "Borneo Cultures Museum",
    summary:
      "Five-storey museum — the largest in Malaysia — on Sarawak's peoples and environment.",
    description:
      "Modern galleries covering Sarawak's ethnic groups, crafts, biodiversity and history. Allow at least two hours.",
    location: loc.city,
    address: "Jalan Tun Abang Haji Openg, 93000 Kuching",
    lat: 1.5566,
    lng: 110.3436,
    avgVisitMinutes: 150,
    priceMin: 30,
    priceMax: 50,
    isFree: false,
    bookingRequired: false,
    openingHours: { tue_sun: "09:00–16:45", mon: "Closed" },
    tips: "Closed Mondays. Start on the top floor and work down.",
    categories: ["culture", "heritage"],
    images: [{ url: IMG.museum, alt: "Museum gallery interior" }],
    isSample: true,
    isPublished: true,
  },
  {
    id: "att-fort",
    slug: "fort-margherita",
    name: "Fort Margherita",
    summary: "White 1879 fort built by Charles Brooke, now the Brooke Gallery.",
    description:
      "Across the river from the Waterfront (reachable by penambang sampan). Exhibits on the Brooke era and Sarawak history, plus rooftop views.",
    location: loc.city,
    address: "Jalan Sapi, Petra Jaya, 93050 Kuching",
    lat: 1.5606,
    lng: 110.3519,
    avgVisitMinutes: 75,
    priceMin: 20,
    priceMax: 20,
    isFree: false,
    bookingRequired: false,
    openingHours: { tue_sun: "09:30–16:45", mon: "Closed" },
    tips: "Take the tambang (river boat) across — it's part of the fun.",
    categories: ["heritage", "culture"],
    images: [{ url: IMG.temple, alt: "Historic fort" }],
    isSample: true,
    isPublished: true,
  },
  {
    id: "att-tuapekkong",
    slug: "tua-pek-kong-temple",
    name: "Tua Pek Kong Temple",
    summary: "Kuching's oldest Chinese temple (rebuilt 1876).",
    description:
      "A working Taoist temple opposite the Chinese History Museum; especially lively during Wang Kang and the Mid-Autumn festival.",
    location: loc.city,
    address: "Jalan Tunku Abdul Rahman, 93100 Kuching",
    lat: 1.5595,
    lng: 110.352,
    avgVisitMinutes: 30,
    priceMin: 0,
    priceMax: 0,
    isFree: true,
    bookingRequired: false,
    openingHours: { daily: "07:00–21:00" },
    tips: "Dress modestly; it's an active place of worship.",
    categories: ["heritage", "culture"],
    images: [{ url: IMG.temple, alt: "Chinese temple" }],
    isSample: true,
    isPublished: true,
  },
  {
    id: "att-semenggoh",
    slug: "semenggoh-nature-reserve",
    name: "Semenggoh Nature Reserve",
    summary: "Semi-wild orangutan feeding sessions in protected rainforest.",
    description:
      "Rehabilitated orangutans roam free and may appear at the morning or afternoon feeding platform (sightings not guaranteed). Arrive before the session starts.",
    location: loc.semenggoh,
    address: "Semenggoh, 93250 Siburan",
    lat: 1.4018,
    lng: 110.3155,
    avgVisitMinutes: 120,
    priceMin: 10,
    priceMax: 10,
    isFree: false,
    bookingRequired: true,
    openingHours: { feeding: "09:00–10:00 and 15:00–16:00" },
    tips: "Morning sessions have better odds in fruiting season.",
    categories: ["wildlife", "nature"],
    images: [{ url: IMG.orangutan, alt: "Orangutan in the forest" }],
    isSample: true,
    isPublished: true,
  },
  {
    id: "att-bako",
    slug: "bako-national-park",
    name: "Bako National Park",
    summary:
      "Coastal rainforest park famous for proboscis monkeys and sea-stack cliffs.",
    description:
      "Seven vegetation types, well-marked trails, bearded pigs and proboscis monkeys. Access is a 20-minute boat ride from Bako village; the park often needs a permit booked ahead.",
    location: loc.bako,
    address: "Bako, 93050 Kuching",
    lat: 1.7213,
    lng: 110.4707,
    avgVisitMinutes: 360,
    priceMin: 20,
    priceMax: 20,
    isFree: false,
    bookingRequired: true,
    openingHours: { daily: "08:00–17:00 (day visit)" },
    tips: "Book the boat and park permit ahead in peak season.",
    categories: ["nature", "wildlife", "adventure"],
    images: [{ url: IMG.rainforest, alt: "Rainforest canopy in Borneo" }],
    isSample: true,
    isPublished: true,
  },
  {
    id: "att-scv",
    slug: "sarawak-cultural-village",
    name: "Sarawak Cultural Village",
    summary:
      "Living museum of seven traditional dwellings at the foot of Mount Santubong.",
    description:
      "Iban and Bidayuh longhouses, a Melanau tall-house, Penan hut and more, with craft demos and twice-daily cultural shows. Home of the Rainforest World Music Festival.",
    location: loc.santubong,
    address: "Pantai Damai, Santubong, 93050 Kuching",
    lat: 1.753,
    lng: 110.321,
    avgVisitMinutes: 210,
    priceMin: 60,
    priceMax: 90,
    isFree: false,
    bookingRequired: false,
    openingHours: { daily: "09:00–16:45", shows: "11:30 and 16:00" },
    tips: "Time your visit around a cultural show.",
    categories: ["culture", "heritage"],
    images: [{ url: IMG.longhouse, alt: "Traditional longhouse" }],
    isSample: true,
    isPublished: true,
  },
  {
    id: "att-carpenter",
    slug: "main-bazaar-carpenter-street",
    name: "Main Bazaar & Carpenter Street",
    summary: "The old town's heritage shopping row and Chinatown lanes.",
    description:
      "Shophouses selling Sarawak textiles, pua kumbu, pepper, beadwork and pottery, plus clan temples and coffee shops along Carpenter Street.",
    location: loc.city,
    address: "Main Bazaar, 93000 Kuching",
    lat: 1.5591,
    lng: 110.3468,
    avgVisitMinutes: 90,
    priceMin: 0,
    priceMax: 0,
    isFree: true,
    bookingRequired: false,
    openingHours: { most_shops: "10:00–18:00" },
    tips: "Haggle politely; cash is king in the smaller shops.",
    categories: ["shopping", "heritage"],
    images: [{ url: IMG.market, alt: "Heritage shophouse street" }],
    isSample: true,
    isPublished: true,
  },
];

const vendor = {
  foodWalks: {
    id: "ven-foodwalks",
    name: "Kuching Food Walks",
    slug: "kuching-food-walks",
    verificationStatus: "verified" as const,
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=70",
  },
  alacarte: {
    id: "ven-alacarte",
    name: "Borneo à la Carte",
    slug: "borneo-a-la-carte",
    verificationStatus: "verified" as const,
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=70",
  },
  santubong: {
    id: "ven-santubong",
    name: "Santubong River Cruises",
    slug: "santubong-river-cruises",
    verificationStatus: "verified" as const,
    avatarUrl:
      "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&q=70",
  },
  aab: {
    id: "ven-aab",
    name: "Adventure Alternative Borneo",
    slug: "adventure-alternative-borneo",
    verificationStatus: "verified" as const,
    avatarUrl:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=70",
  },
  kayak: {
    id: "ven-kayak",
    name: "Semadang Kayak",
    slug: "semadang-kayak",
    verificationStatus: "verified" as const,
    avatarUrl:
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200&q=70",
  },
};

export const demoVendors: Vendor[] = [
  {
    ...vendor.foodWalks,
    description:
      "Small-group street-food and heritage walking tours led by local guides.",
    locationName: "Kuching City Centre",
    contactEmail: "hello@example-kuchingfoodwalks.test",
    contactPhone: "+60 82-000001",
    isSample: true,
    isPublished: true,
  },
  {
    ...vendor.alacarte,
    description: "Hands-on Sarawakian cooking classes in a heritage kitchen.",
    locationName: "Kuching City Centre",
    contactEmail: "cook@example-borneoalacarte.test",
    contactPhone: "+60 82-000002",
    isSample: true,
    isPublished: true,
  },
  {
    ...vendor.santubong,
    description:
      "Sunset wildlife river cruises around the Santubong and Salak estuaries.",
    locationName: "Santubong & Damai",
    contactEmail: "cruise@example-santubong.test",
    contactPhone: "+60 82-000003",
    isSample: true,
    isPublished: true,
  },
  {
    ...vendor.aab,
    description:
      "Licensed guided trekking and community-based cultural trips across Sarawak.",
    locationName: "Bako",
    contactEmail: "trek@example-aaborneo.test",
    contactPhone: "+60 82-000004",
    isSample: true,
    isPublished: true,
  },
  {
    ...vendor.kayak,
    description:
      "Family-run kayaking on the Sarawak Kiri river at Semadang, Padawan.",
    locationName: "Padawan & Annah Rais",
    contactEmail: "paddle@example-semadangkayak.test",
    contactPhone: "+60 82-000005",
    isSample: true,
    isPublished: true,
  },
  {
    id: "ven-highland",
    name: "Highland Homestays Kuching",
    slug: "highland-homestays-kuching",
    verificationStatus: "pending",
    avatarUrl: null,
    description:
      "New Bidayuh-run homestay collective near Padawan — awaiting verification.",
    locationName: "Padawan & Annah Rais",
    contactEmail: "stay@example-highlandhomestays.test",
    contactPhone: "+60 82-000006",
    isSample: true,
    isPublished: false,
  },
];

export const demoExperiences: Experience[] = [
  {
    id: "exp-foodwalk",
    slug: "kuching-heritage-street-food-walk",
    title: "Kuching Heritage & Street Food Evening Walk",
    summary:
      "A 3-hour guided tasting walk through the old town: kolo mee, satay, kek lapis and more.",
    description:
      "Meet at the Waterfront and wander Carpenter Street and the bazaar with a local guide, stopping at 6–7 hawker favourites. Vegetarian option on request.",
    vendor: vendor.foodWalks,
    location: loc.city,
    durationMinutes: 180,
    pricePerPerson: 150,
    currency: "MYR",
    minPax: 2,
    maxPax: 10,
    languages: ["English", "Malay"],
    includes: ["Local guide", "6–7 food tastings", "Bottled water"],
    meetingPoint: "Kuching Waterfront, near the Darul Hana fountain",
    cancellationPolicy: "Free cancellation up to 24 hours before start.",
    availability: {
      days: ["tue", "wed", "thu", "fri", "sat"],
      times: ["17:30"],
      capacityPerSlot: 10,
    },
    bookingLeadtimeHours: 24,
    categories: ["food", "heritage", "culture"],
    images: [{ url: IMG.streetFood, alt: "Street food night market" }],
    rating: 4.9,
    reviewCount: 128,
    isSample: true,
    isPublished: true,
  },
  {
    id: "exp-cooking",
    slug: "sarawak-laksa-kolo-mee-cooking-class",
    title: "Sarawak Laksa & Kolo Mee Cooking Class",
    summary:
      "Half-day hands-on class making Sarawak laksa paste and kolo mee from scratch.",
    description:
      "Includes a guided wet-market visit for ingredients, then cook and eat a full lunch. Recipes provided.",
    vendor: vendor.alacarte,
    location: loc.city,
    durationMinutes: 240,
    pricePerPerson: 220,
    currency: "MYR",
    minPax: 1,
    maxPax: 8,
    languages: ["English"],
    includes: ["Market tour", "All ingredients", "Recipe booklet", "Lunch"],
    meetingPoint: "Borneo à la Carte studio, Jalan Padungan",
    cancellationPolicy: "Free cancellation up to 48 hours before start.",
    availability: {
      days: ["mon", "wed", "fri", "sat"],
      times: ["09:00"],
      capacityPerSlot: 8,
    },
    bookingLeadtimeHours: 48,
    categories: ["food", "culture"],
    images: [{ url: IMG.cooking, alt: "Hands preparing local food" }],
    rating: 4.8,
    reviewCount: 74,
    isSample: true,
    isPublished: true,
  },
  {
    id: "exp-cruise",
    slug: "santubong-sunset-wildlife-river-cruise",
    title: "Santubong Sunset Wildlife River Cruise",
    summary:
      "A 3.5-hour boat cruise looking for Irrawaddy dolphins, proboscis monkeys and fireflies.",
    description:
      "Depart mid-afternoon, cruise the estuary for wildlife, watch sunset over Mount Santubong, then spot fireflies on the way back. Light snacks aboard.",
    vendor: vendor.santubong,
    location: loc.santubong,
    durationMinutes: 210,
    pricePerPerson: 180,
    currency: "MYR",
    minPax: 2,
    maxPax: 20,
    languages: ["English", "Malay"],
    includes: ["Return boat", "Life jackets", "Guide", "Snacks & water"],
    meetingPoint: "Santubong boat jetty",
    cancellationPolicy:
      "Free cancellation up to 24 hours before; weather cancellations fully refunded.",
    availability: {
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      times: ["15:30"],
      capacityPerSlot: 20,
    },
    bookingLeadtimeHours: 24,
    categories: ["nature", "wildlife"],
    images: [{ url: IMG.cruise, alt: "River cruise at sunset" }],
    rating: 4.7,
    reviewCount: 96,
    isSample: true,
    isPublished: true,
  },
  {
    id: "exp-bako",
    slug: "bako-national-park-full-day-trek",
    title: "Bako National Park Full-Day Guided Trek",
    summary:
      "Full-day small-group trek in Bako with a naturalist guide — proboscis monkeys and the Telok Pandan Kecil viewpoint.",
    description:
      "Boat transfer into the park, permit handling, two guided trails, and a packed lunch. Moderate fitness needed; ~8–9 hours door to door.",
    vendor: vendor.aab,
    location: loc.bako,
    durationMinutes: 540,
    pricePerPerson: 320,
    currency: "MYR",
    minPax: 2,
    maxPax: 12,
    languages: ["English"],
    includes: [
      "Park permit",
      "Return boat",
      "Naturalist guide",
      "Packed lunch",
      "Water",
    ],
    meetingPoint: "Bako Terminal, Kampung Bako (transfer from Kuching available)",
    cancellationPolicy: "Free cancellation up to 48 hours before start.",
    availability: {
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      times: ["07:30"],
      capacityPerSlot: 12,
    },
    bookingLeadtimeHours: 48,
    categories: ["nature", "wildlife", "adventure"],
    images: [{ url: IMG.rainforest, alt: "Rainforest trail" }],
    rating: 4.9,
    reviewCount: 152,
    isSample: true,
    isPublished: true,
  },
  {
    id: "exp-kayak",
    slug: "sarawak-kiri-river-kayaking-semadang",
    title: "Sarawak Kiri River Kayaking at Semadang",
    summary:
      "A relaxed half-day paddle through Padawan rainforest with a swim stop and light rapids.",
    description:
      "Beginner-friendly guided kayaking, roughly 10 km downstream. Includes gear, a village lunch and transfers from Kuching.",
    vendor: vendor.kayak,
    location: loc.padawan,
    durationMinutes: 300,
    pricePerPerson: 190,
    currency: "MYR",
    minPax: 2,
    maxPax: 16,
    languages: ["English", "Malay"],
    includes: [
      "Kayak & paddle",
      "Dry bag",
      "Guide",
      "Village lunch",
      "Kuching transfer",
    ],
    meetingPoint: "Kuching city hotel pickup (07:45) or Semadang jetty",
    cancellationPolicy:
      "Free cancellation up to 24 hours before; weather cancellations fully refunded.",
    availability: {
      days: ["wed", "thu", "fri", "sat", "sun"],
      times: ["08:00"],
      capacityPerSlot: 16,
    },
    bookingLeadtimeHours: 24,
    categories: ["adventure", "nature"],
    images: [{ url: IMG.kayak, alt: "Kayaking on a jungle river" }],
    rating: 4.8,
    reviewCount: 61,
    isSample: true,
    isPublished: true,
  },
  {
    id: "exp-annahrais",
    slug: "annah-rais-longhouse-bidayuh-culture-day",
    title: "Annah Rais Longhouse & Bidayuh Culture Day",
    summary:
      "A full day at a living Bidayuh longhouse: bamboo walkways, headhouse, jungle walk to a waterfall and a home-cooked lunch.",
    description:
      "Guided visit hosted by an Annah Rais family, with a short trek to a bathing pool and bamboo-cooking demonstration. Respectful, community-based tourism.",
    vendor: vendor.aab,
    location: loc.padawan,
    durationMinutes: 420,
    pricePerPerson: 280,
    currency: "MYR",
    minPax: 2,
    maxPax: 12,
    languages: ["English"],
    includes: [
      "Kuching transfer",
      "Longhouse entry",
      "Local host & guide",
      "Lunch",
      "Waterfall walk",
    ],
    meetingPoint: "Kuching city hotel pickup (08:30)",
    cancellationPolicy: "Free cancellation up to 48 hours before start.",
    availability: {
      days: ["mon", "tue", "thu", "sat", "sun"],
      times: ["08:30"],
      capacityPerSlot: 12,
    },
    bookingLeadtimeHours: 48,
    categories: ["culture", "heritage"],
    images: [{ url: IMG.longhouse, alt: "Bidayuh longhouse" }],
    rating: 4.9,
    reviewCount: 88,
    isSample: true,
    isPublished: true,
  },
];

export function findDemoExperience(slug: string) {
  return demoExperiences.find((e) => e.slug === slug) ?? null;
}
export function findDemoAttraction(slug: string) {
  return demoAttractions.find((a) => a.slug === slug) ?? null;
}
