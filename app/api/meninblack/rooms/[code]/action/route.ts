import { applyAction, GameError, type Action } from "@/lib/meninblack/engine.ts";
import { mutateRoom } from "@/lib/meninblack/store.ts";
import { handleError, normCode, playerForToken, viewResponse } from "@/lib/meninblack/api.ts";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const code = normCode((await ctx.params).code);
    const token = req.headers.get("x-token");
    const action = (await req.json()) as Action;
    const { state, out } = await mutateRoom(code, (s) => {
      const me = playerForToken(s, token);
      if (!me) throw new GameError("ไม่ได้อยู่ในห้องนี้");
      applyAction(s, me.id, action);
      return me.id;
    });
    return viewResponse(state, out);
  } catch (e) {
    return handleError(e);
  }
}
