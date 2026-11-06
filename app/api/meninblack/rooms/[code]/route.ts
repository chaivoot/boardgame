import { joinRoom } from "@/lib/meninblack/engine.ts";
import { loadAndTick, mutateRoom } from "@/lib/meninblack/store.ts";
import { handleError, json, normCode, playerForToken, viewResponse } from "@/lib/meninblack/api.ts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

/** Poll: returns this player's view. `?v=` lets the client skip unchanged states. */
export async function GET(req: Request, ctx: Ctx) {
  try {
    const code = normCode((await ctx.params).code);
    const s = await loadAndTick(code);
    if (!s) return json({ error: "ไม่พบห้องนี้ (อาจหมดอายุแล้ว)" }, 404);
    const me = playerForToken(s, req.headers.get("x-token"));
    if (!me) return json({ exists: true, phase: s.phase, players: s.players.length }, 401);
    const v = Number(new URL(req.url).searchParams.get("v"));
    if (v === s.v) return json({ same: true, v: s.v });
    return viewResponse(s, me.id);
  } catch (e) {
    return handleError(e);
  }
}

/** Join the room. */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const code = normCode((await ctx.params).code);
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const { out } = await mutateRoom(code, (s) => joinRoom(s, body.name ?? ""));
    return json({ code, token: out.token, playerId: out.id });
  } catch (e) {
    return handleError(e);
  }
}
