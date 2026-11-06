import { backend, loadRoom } from "@/lib/meninblack/store.ts";
import { json } from "@/lib/meninblack/api.ts";

export const dynamic = "force-dynamic";

/** Shows which storage backend is active (never values, only variable names). */
export async function GET() {
  const envSeen = Object.keys(process.env).filter((k) => /REDIS|^KV_|UPSTASH/.test(k)).sort();
  let ok = false, error: string | null = null;
  try { await loadRoom("HEALTHCHECK"); ok = true; } catch (e) { error = (e as Error).message; }
  return json({ backend, ok, error, onVercel: !!process.env.VERCEL, envSeen });
}
