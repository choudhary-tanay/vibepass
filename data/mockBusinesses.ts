import type { Business } from "@/types";

export const mockBusinesses: Business[] = [
  {
    id: "biz-1",
    ownerId: null,
    businessName: "Zen Yoga Studio",
    category: "Yoga",
    description:
      "A calm and peaceful yoga studio in the heart of the city. We offer classes for all levels — from complete beginners to advanced practitioners.",
    location: "Andheri West, Mumbai",
    phone: "+91 98765 43210",
    email: "hello@zenyoga.com",
    status: "active",
    isMarketplaceVisible: true,
  },
  {
    id: "biz-2",
    ownerId: null,
    businessName: "Iron Strength Gym",
    category: "Fitness",
    description:
      "High-intensity fitness classes for all levels. Our expert trainers will push you to your limits and beyond.",
    location: "Koramangala, Bangalore",
    phone: "+91 87654 32109",
    email: "info@ironstrength.com",
    status: "active",
    isMarketplaceVisible: true,
  },
];
