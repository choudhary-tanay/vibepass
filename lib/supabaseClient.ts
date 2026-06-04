import { createBrowserClient } from "@supabase/ssr";

// createBrowserClient manages session cookies properly for Next.js App Router.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key"
);
