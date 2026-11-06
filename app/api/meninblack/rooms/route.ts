import { newRoom } from "@/lib/meninblack/engine.ts";
import { createRoom } from "@/lib/meninblack/store.ts";
import { handleError, json } from "@/lib/meninblack/api.ts";

export const dynamic = "force-dynamic";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    for (let i = 0; i < 10; i++) {
      const { state, player } = newRoom(makeCode(), body.name ?? "");
      if (await createRoom(state)) return json({ code: state.code, token: player.token, playerId: player.id });
    }
    return json({ error: "สร้างห้องไม่สำเร็จ ลองใหม่" }, 500);
  } catch (e) {
    return handleError(e);
  }
}
