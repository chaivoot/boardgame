import { NextResponse } from "next/server";
import { GameError, type State } from "./engine.ts";
import { viewFor } from "./view.ts";

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export function handleError(e: unknown) {
  if (e instanceof GameError) return json({ error: e.message }, 400);
  console.error(e);
  return json({ error: "เซิร์ฟเวอร์มีปัญหา ลองใหม่อีกครั้ง" }, 500);
}

export const normCode = (c: string) => String(c || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);

export function playerForToken(s: State, token: string | null) {
  return token ? s.players.find((p) => p.token === token) ?? null : null;
}

export const viewResponse = (s: State, playerId: string) => json({ view: viewFor(s, playerId) });
