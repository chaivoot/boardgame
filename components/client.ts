"use client";
export const BASE = "";
export const API = `${BASE}/api/meninblack/rooms`;

export type Session = { token: string; playerId: string };
export function getSession(code: string): Session | null {
  try { const v = localStorage.getItem(`mib:${code}`); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function setSession(code: string, s: Session) {
  try { localStorage.setItem(`mib:${code}`, JSON.stringify(s)); } catch {}
}
export function clearSession(code: string) {
  try { localStorage.removeItem(`mib:${code}`); } catch {}
}
export function getName(): string {
  try { return localStorage.getItem("mib:name") || ""; } catch { return ""; }
}
export function setName(n: string) {
  try { localStorage.setItem("mib:name", n); } catch {}
}
export async function postJSON<T>(url: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { "x-token": token } : {}) },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({ error: "เชื่อมต่อไม่ได้" }));
  if (!res.ok) throw new Error(j.error || "เกิดข้อผิดพลาด");
  return j as T;
}
