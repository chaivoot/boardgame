import { advance, GameError, type State } from "./engine.ts";

/**
 * Room storage. Uses Upstash Redis (REST) when configured — this is what Vercel's
 * "Upstash for Redis" marketplace integration provides. Falls back to process memory,
 * which only works with a single server process (local `next dev`).
 */
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const TTL = 60 * 60 * 24; // rooms expire after 24h idle
const key = (code: string) => `mib:room:${code}`;

export const usingRedis = !!(URL_ && TOKEN);

async function redis(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(URL_!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const j = (await res.json()) as { result?: unknown; error?: string };
  if (!res.ok || j.error) throw new Error(`redis: ${j.error ?? res.status}`);
  return j.result;
}

// compare-and-set on the version embedded in the stored JSON
const CAS = `
local cur = redis.call('GET', KEYS[1])
local v = -1
if cur then v = cjson.decode(cur)['v'] end
if v == tonumber(ARGV[1]) then
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
  return 1
end
return 0`;

const mem: Map<string, string> = ((globalThis as { __mibRooms?: Map<string, string> }).__mibRooms ??= new Map());

export async function loadRoom(code: string): Promise<State | null> {
  const raw = usingRedis ? ((await redis(["GET", key(code)])) as string | null) : mem.get(key(code)) ?? null;
  return raw ? (JSON.parse(raw) as State) : null;
}

/** Saves `next` only if the stored version is still `expectV` (-1 = must not exist). */
async function cas(code: string, expectV: number, next: State): Promise<boolean> {
  const raw = JSON.stringify(next);
  if (usingRedis) return (await redis(["EVAL", CAS, 1, key(code), expectV, raw, TTL])) === 1;
  const cur = mem.get(key(code));
  const v = cur ? (JSON.parse(cur) as State).v : -1;
  if (v !== expectV) return false;
  mem.set(key(code), raw);
  return true;
}

export async function createRoom(state: State): Promise<boolean> {
  return cas(state.code, -1, state);
}

/** Read-modify-write with optimistic locking. `fn` mutates the state in place. */
export async function mutateRoom<T>(code: string, fn: (s: State) => T): Promise<{ state: State; out: T }> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const s = await loadRoom(code);
    if (!s) throw new GameError("ไม่พบห้องนี้ (อาจหมดอายุแล้ว)");
    const prev = s.v;
    const out = fn(s);
    s.v = prev + 1;
    if (await cas(code, prev, s)) return { state: s, out };
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 120));
  }
  throw new GameError("มีคนกดพร้อมกันเยอะ ลองใหม่อีกครั้ง");
}

/** Loads a room and applies any time-based progression (timers), saving if it changed. */
export async function loadAndTick(code: string): Promise<State | null> {
  const s = await loadRoom(code);
  if (!s) return null;
  const probe: State = structuredClone(s);
  if (!advance(probe)) return s;
  try {
    const { state } = await mutateRoom(code, (st) => { advance(st); });
    return state;
  } catch {
    return loadRoom(code);
  }
}
