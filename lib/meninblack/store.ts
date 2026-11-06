import { createClient } from "redis";
import { advance, GameError, type State } from "./engine.ts";

/**
 * Room storage. Supported backends, first match wins:
 *  1. Upstash Redis REST  — KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *  2. Any Redis server    — REDIS_URL or KV_URL (e.g. Vercel's Redis integration)
 *  3. Process memory      — local `next dev` only; refused on Vercel because instances don't share memory
 */
// Vercel lets integrations add a custom prefix to these names, so match by suffix too.
const env = process.env;
const restKey = ["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"].find((k) => env[k] && env[k.replace(/URL$/, "TOKEN")])
  ?? Object.keys(env).find((k) => /REST_(API_)?URL$/.test(k) && env[k]?.startsWith("https://") && env[k.replace(/URL$/, "TOKEN")]);
const REST_URL = restKey ? env[restKey] : undefined;
const REST_TOKEN = restKey ? env[restKey.replace(/URL$/, "TOKEN")] : undefined;
const TCP_URL = env.REDIS_URL || env.KV_URL || Object.values(env).find((v) => /^rediss?:\/\//.test(v ?? ""));
const TTL = 60 * 60 * 24; // rooms expire after 24h idle
const key = (code: string) => `mib:room:${code}`;

export const backend: "rest" | "tcp" | "memory" = REST_URL && REST_TOKEN ? "rest" : TCP_URL ? "tcp" : "memory";
const onVercel = !!process.env.VERCEL;

type Tcp = ReturnType<typeof createClient>;
const g = globalThis as { __mibTcp?: Promise<Tcp>; __mibRooms?: Map<string, string> };
function tcp(): Promise<Tcp> {
  return (g.__mibTcp ??= (async () => {
    const c = createClient({ url: TCP_URL });
    c.on("error", (e) => console.error("redis", e));
    await c.connect();
    return c;
  })().catch((e) => { g.__mibTcp = undefined; throw e; }));
}

async function redis(cmd: (string | number)[]): Promise<unknown> {
  if (backend === "tcp") return (await tcp()).sendCommand(cmd.map(String));
  const res = await fetch(REST_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const j = (await res.json()) as { result?: unknown; error?: string };
  if (!res.ok || j.error) throw new Error(`redis: ${j.error ?? res.status}`);
  return j.result;
}

function assertStore() {
  if (backend === "memory" && onVercel)
    throw new GameError("ยังไม่ได้เชื่อมต่อฐานข้อมูล Redis กับโปรเจกต์บน Vercel (ดู /api/meninblack/health)");
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

const mem: Map<string, string> = (g.__mibRooms ??= new Map());

export async function loadRoom(code: string): Promise<State | null> {
  assertStore();
  const raw = backend !== "memory" ? ((await redis(["GET", key(code)])) as string | null) : mem.get(key(code)) ?? null;
  return raw ? (JSON.parse(raw) as State) : null;
}

/** Saves `next` only if the stored version is still `expectV` (-1 = must not exist). */
async function cas(code: string, expectV: number, next: State): Promise<boolean> {
  const raw = JSON.stringify(next);
  assertStore();
  if (backend !== "memory") return Number(await redis(["EVAL", CAS, 1, key(code), expectV, raw, TTL])) === 1;
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
