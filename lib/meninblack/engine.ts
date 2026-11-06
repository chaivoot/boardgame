import {
  ROLES, PRESET, MIN_PLAYERS, MAX_PLAYERS, SPECIAL, floorsFor, daysFor, floorOf, colOf,
  type RoleKey,
} from "./roles.ts";

/* ================= TYPES ================= */
export type Mark = "murdered" | "empty" | "mob";
export type Phase = "lobby" | "deal" | "night" | "day" | "vote" | "voteResult" | "end";

export interface Player {
  id: string;
  token: string;
  name: string;
  role: RoleKey | null;
  room: number | null;
  startRoom: number | null;
  alive: boolean;
  death: string | null;
  ready: boolean;
}

export interface Settings {
  roles: RoleKey[];
  floors: number;
  days: number;
  discussSec: number;
  revealOnDeath: boolean;
}

export interface NightAct {
  target: number | string | null; // room / floor / col number, or player id, null = skip
  result: string;
  done: boolean;
}

export interface Night {
  stage: 1 | 2 | 3;
  acts: Record<string, NightAct>; // by player id
  lock: number | null;
  kill: number | null;
  swap: [string, string] | null;
  autoAt: number | null;
}

export interface State {
  v: number;
  code: string;
  hostId: string;
  createdAt: number;
  phase: Phase;
  settings: Settings;
  players: Player[];
  day: number;
  marks: Record<string, Mark>;
  lastLock: number | null;
  drunkUsed: boolean;
  night: Night | null;
  notices: Record<string, string[]>;
  morning: string[];
  dayEndsAt: number | null;
  votes: Record<string, number | "skip">;
  voteResult: { line: string; tally: { label: string; names: string[] }[] } | null;
  log: string[];
  history: { night: number; acts: { role: RoleKey; name: string; text: string }[] }[];
  result: { winner: "good" | "evil"; reason: string } | null;
}

export class GameError extends Error {}
const fail = (msg: string): never => { throw new GameError(msg); };

/* ================= HELPERS ================= */
export function randomId(len = 16) {
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) s += a[buf[i] % a.length];
  return s;
}
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const allRooms = (floors: number) => {
  const r: number[] = [];
  for (let f = 1; f <= floors; f++) for (let c = 1; c <= 3; c++) r.push(f * 100 + c);
  return r;
};
const strip = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const cleanName = (n: unknown) => String(n ?? "").replace(/[<>]/g, "").trim().slice(0, 16);

export const playerById = (s: State, id: string) => s.players.find((p) => p.id === id);
export const holderOf = (s: State, role: RoleKey) => s.players.find((p) => p.role === role);
export const isEvil = (p: Player) => !!p.role && ROLES[p.role].team === "evil";
const living = (s: State) => s.players.filter((p) => p.alive);
const livingIn = (s: State, pred: (room: number) => boolean) =>
  s.players.filter((p) => p.alive && p.room !== null && pred(p.room)).length;

function addNotice(s: State, id: string, text: string) {
  (s.notices[id] ??= []).push(text);
}

/* ================= ROOM / LOBBY ================= */
export function defaultSettings(n: number): Settings {
  const k = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n));
  return { roles: PRESET[k].slice(), floors: floorsFor(k), days: daysFor(k), discussSec: 300, revealOnDeath: false };
}

export function newRoom(code: string, hostName: string, now = Date.now()): { state: State; player: Player } {
  const name = cleanName(hostName) || "Host";
  const player: Player = { id: randomId(8), token: randomId(24), name, role: null, room: null, startRoom: null, alive: true, death: null, ready: false };
  const state: State = {
    v: 0, code, hostId: player.id, createdAt: now, phase: "lobby",
    settings: defaultSettings(6), players: [player], day: 1, marks: {}, lastLock: null, drunkUsed: false,
    night: null, notices: {}, morning: [], dayEndsAt: null, votes: {}, voteResult: null, log: [], history: [], result: null,
  };
  return { state, player };
}

export function joinRoom(s: State, rawName: string): Player {
  if (s.phase !== "lobby") fail("เกมเริ่มไปแล้ว เข้าร่วมไม่ได้");
  if (s.players.length >= MAX_PLAYERS) fail(`ห้องเต็มแล้ว (สูงสุด ${MAX_PLAYERS} คน)`);
  const name = cleanName(rawName);
  if (!name) fail("กรุณาใส่ชื่อ");
  if (s.players.some((p) => p.name === name)) fail("ชื่อนี้มีคนใช้แล้ว");
  const player: Player = { id: randomId(8), token: randomId(24), name, role: null, room: null, startRoom: null, alive: true, death: null, ready: false };
  s.players.push(player);
  return player;
}

/* ================= ACTIONS ================= */
export type Action =
  | { type: "settings"; settings: Partial<Settings> }
  | { type: "kick"; playerId: string }
  | { type: "start" }
  | { type: "ready" }
  | { type: "nightAct"; target: number | string | null }
  | { type: "nightDone" }
  | { type: "startVote" }
  | { type: "addTime"; sec: number }
  | { type: "vote"; room: number | "skip" }
  | { type: "closeVote" }
  | { type: "nextNight" }
  | { type: "restart" };

export function applyAction(s: State, playerId: string, a: Action, now = Date.now()) {
  const me = playerById(s, playerId) ?? fail("ไม่พบผู้เล่น");
  const isHost = s.hostId === me.id;
  const hostOnly = () => { if (!isHost) fail("เฉพาะเจ้าของห้องเท่านั้น"); };

  switch (a.type) {
    case "settings": {
      hostOnly();
      if (s.phase !== "lobby") fail("เปลี่ยนการตั้งค่าได้เฉพาะก่อนเริ่มเกม");
      const st = a.settings;
      if (st.roles) {
        const roles = Array.from(new Set(st.roles.filter((r) => SPECIAL.includes(r))));
        if (!roles.includes("murderer")) roles.unshift("murderer");
        s.settings.roles = roles;
      }
      if (st.floors !== undefined) s.settings.floors = Math.max(2, Math.min(5, Math.round(st.floors)));
      if (st.days !== undefined) s.settings.days = Math.max(1, Math.min(5, Math.round(st.days)));
      if (st.discussSec !== undefined) s.settings.discussSec = Math.max(30, Math.min(1200, Math.round(st.discussSec)));
      if (st.revealOnDeath !== undefined) s.settings.revealOnDeath = !!st.revealOnDeath;
      return;
    }
    case "kick": {
      hostOnly();
      if (s.phase !== "lobby") fail("เตะผู้เล่นได้เฉพาะก่อนเริ่มเกม");
      if (a.playerId === s.hostId) fail("เตะตัวเองไม่ได้");
      s.players = s.players.filter((p) => p.id !== a.playerId);
      return;
    }
    case "start": {
      hostOnly();
      if (s.phase !== "lobby") fail("เกมเริ่มไปแล้ว");
      startGame(s);
      return;
    }
    case "ready": {
      if (s.phase !== "deal") fail("ยังไม่ถึงช่วงนี้");
      me.ready = true;
      break;
    }
    case "nightAct": nightAct(s, me, a.target); break;
    case "nightDone": {
      const n = s.night ?? fail("ไม่ใช่กลางคืน");
      const act = n.acts[me.id] ?? fail("ยังไม่ได้เลือก");
      act.done = true;
      break;
    }
    case "startVote": {
      hostOnly();
      if (s.phase !== "day") fail("ยังไม่ถึงช่วงคุย");
      openVote(s);
      return;
    }
    case "addTime": {
      hostOnly();
      if (s.phase !== "day" || !s.dayEndsAt) fail("ไม่ได้อยู่ช่วงคุย");
      s.dayEndsAt = Math.max(now, s.dayEndsAt ?? now) + Math.max(-600, Math.min(600, a.sec)) * 1000;
      return;
    }
    case "vote": {
      if (s.phase !== "vote") fail("ยังไม่เปิดโหวต");
      if (!me.alive) fail("ผู้เล่นที่ตายแล้วโหวตไม่ได้");
      if (a.room !== "skip" && (!allRooms(s.settings.floors).includes(a.room) || s.marks[a.room])) fail("เลือกห้องนี้ไม่ได้");
      s.votes[me.id] = a.room;
      break;
    }
    case "closeVote": {
      hostOnly();
      if (s.phase !== "vote") fail("ยังไม่เปิดโหวต");
      resolveVote(s);
      return;
    }
    case "nextNight": {
      hostOnly();
      if (s.phase !== "voteResult") fail("ยังไม่ถึงช่วงนี้");
      s.day++;
      beginNight(s, now);
      return;
    }
    case "restart": {
      hostOnly();
      if (s.phase !== "end") fail("เกมยังไม่จบ");
      for (const p of s.players) Object.assign(p, { role: null, room: null, startRoom: null, alive: true, death: null, ready: false });
      Object.assign(s, {
        phase: "lobby", day: 1, marks: {}, lastLock: null, drunkUsed: false, night: null, notices: {}, morning: [],
        dayEndsAt: null, votes: {}, voteResult: null, log: [], history: [], result: null,
      });
      return;
    }
    default: fail("คำสั่งไม่ถูกต้อง");
  }
  advance(s, now);
}

/* ================= GAME FLOW ================= */
function startGame(s: State) {
  const n = s.players.length;
  if (n < MIN_PLAYERS) fail(`ต้องมีผู้เล่นอย่างน้อย ${MIN_PLAYERS} คน`);
  if (s.settings.roles.length > n) fail("บทบาทมากกว่าจำนวนผู้เล่น");
  if (s.settings.floors * 3 < n) fail("ห้องไม่พอสำหรับผู้เล่นทุกคน เพิ่มจำนวนชั้น");
  const roles: RoleKey[] = s.settings.roles.slice();
  while (roles.length < n) roles.push("guest");
  const dealt = shuffle(roles);
  const rooms = shuffle(allRooms(s.settings.floors)).slice(0, n);
  s.players.forEach((p, i) => Object.assign(p, { role: dealt[i], room: rooms[i], startRoom: rooms[i], alive: true, death: null, ready: false }));
  s.phase = "deal";
}

const rolesInPlay = (s: State) => s.settings.roles;

/** ids of living players who must act in the given stage */
export function stageActors(s: State, stage: 1 | 2 | 3): Player[] {
  return living(s).filter((p) => {
    if (!p.role || ROLES[p.role].stage !== stage) return false;
    if (p.role === "drunk" && s.drunkUsed) return false;
    return true;
  });
}

function enterStage(s: State, stage: 1 | 2 | 3, now: number) {
  const n = s.night!;
  n.stage = stage;
  // stages with nobody able to act still pause briefly so nobody can infer who is dead
  const hasRoleInPlay = rolesInPlay(s).some((r) => ROLES[r].stage === stage);
  n.autoAt = stageActors(s, stage).length === 0 ? now + (hasRoleInPlay ? 4000 + Math.random() * 4000 : 0) : null;
}

function beginNight(s: State, now: number) {
  s.phase = "night";
  s.night = { stage: 1, acts: {}, lock: null, kill: null, swap: null, autoAt: null };
  s.votes = {};
  s.voteResult = null;
  s.morning = [];
  enterStage(s, 1, now);
}

function nightAct(s: State, me: Player, target: number | string | null) {
  const n = s.night;
  if (s.phase !== "night" || !n) fail("ไม่ใช่กลางคืน");
  if (!me.alive) fail("คุณเสียชีวิตแล้ว");
  const role = me.role!;
  if (!stageActors(s, n!.stage).some((p) => p.id === me.id)) fail("ยังไม่ถึงตาคุณ");
  if (n!.acts[me.id]) fail("คุณเลือกไปแล้ว");
  const night = n!;
  const floors = s.settings.floors;
  let result = "";
  let done = false;

  const needPlayer = () => {
    const t = typeof target === "string" ? playerById(s, target) : undefined;
    if (!t || !t.alive || t.id === me.id) fail("เลือกผู้เล่นไม่ถูกต้อง");
    return t!;
  };
  const needNum = (valid: number[]) => {
    if (typeof target !== "number" || !valid.includes(target)) fail("ตัวเลือกไม่ถูกต้อง");
    return target as number;
  };

  switch (role) {
    case "drunk": {
      if (target === null) { result = "คืนนี้ไม่สลับห้อง"; break; }
      const t = needPlayer();
      night.swap = [me.id, t.id];
      result = `จะสลับห้องกับ <b>${t.name}</b> ตอนจบช่วงแรก<br>ห้องใหม่ของคุณจะเป็น <b>${t.room}</b>`;
      break;
    }
    case "keymaster": {
      const valid = allRooms(floors).filter((r) => !s.marks[r] && r !== s.lastLock);
      const r = needNum(valid);
      night.lock = r;
      result = `ล็อกห้อง <b>${r}</b> แล้ว ห้องนี้ปลอดภัยคืนนี้`;
      break;
    }
    case "housekeeper": {
      const f = needNum(Array.from({ length: floors }, (_, i) => i + 1));
      result = `ชั้น ${f} มีผู้รอดชีวิต <b>${livingIn(s, (r) => floorOf(r) === f)}</b> คน`;
      break;
    }
    case "windowcleaner": {
      const c = needNum([1, 2, 3]);
      result = `แถว ${c} (ห้อง x0${c}) มีผู้รอดชีวิต <b>${livingIn(s, (r) => colOf(r) === c)}</b> คน`;
      break;
    }
    case "detective":
    case "accomplice": {
      const t = needPlayer();
      result = `<b>${t.name}</b> พักอยู่ <b>ชั้น ${floorOf(t.room!)}</b>`;
      break;
    }
    case "murderer": {
      const acc = holderOf(s, "accomplice");
      if (acc && acc.alive && !night.acts[acc.id]) fail("รอผู้ช่วยสืบข้อมูลก่อน");
      const valid = allRooms(floors).filter((r) => !s.marks[r] && r !== me.room);
      const r = needNum(valid);
      night.kill = r;
      result = `ลงมือที่ห้อง <b>${r}</b>`;
      done = true;
      break;
    }
    case "witness": {
      const f = needNum(Array.from({ length: floors }, (_, i) => i + 1));
      const m = holderOf(s, "murderer")!;
      if (night.kill !== null && floorOf(night.kill) === f) {
        const mf = floorOf(m.room!);
        const rel = mf > f ? "สูงกว่า" : mf < f ? "ต่ำกว่า" : "อยู่ชั้นเดียวกับ";
        result = `เห็นฆาตกรขึ้นมาลงมือที่ชั้น ${f}!<br>ห้องของฆาตกร <b>${rel}</b>ชั้นนี้`;
      } else result = `ชั้น ${f} เงียบสงบ ไม่เห็นฆาตกร`;
      break;
    }
    default: fail("บทบาทนี้ไม่มีความสามารถตอนกลางคืน");
  }
  night.acts[me.id] = { target, result, done };
}

/** Moves the game forward when everyone needed has finished, or a timer passed. Returns true if state changed. */
export function advance(s: State, now = Date.now()): boolean {
  let changed = false;
  for (let guard = 0; guard < 10; guard++) {
    const step = advanceOnce(s, now);
    if (!step) break;
    changed = true;
  }
  return changed;
}

function advanceOnce(s: State, now: number): boolean {
  switch (s.phase) {
    case "deal":
      if (s.players.every((p) => p.ready)) { beginNight(s, now); return true; }
      return false;
    case "night": {
      const n = s.night!;
      const actors = stageActors(s, n.stage);
      const finished = actors.length
        ? actors.every((p) => n.acts[p.id]?.done)
        : n.autoAt !== null && now >= n.autoAt;
      if (!finished) return false;
      if (n.stage === 1) {
        if (n.swap) {
          const [a, b] = n.swap.map((id) => playerById(s, id)!);
          const tmp = a.room; a.room = b.room; b.room = tmp;
          s.drunkUsed = true;
          addNotice(s, b.id, `ระหว่างคืนที่ ${s.day} ห้องของคุณถูกสลับ! คีย์การ์ดใหม่ของคุณคือห้อง ${b.room}`);
          addNotice(s, a.id, `สลับห้องกับ ${b.name} เรียบร้อย คีย์การ์ดใหม่ของคุณคือห้อง ${a.room}`);
        }
        enterStage(s, 2, now);
      } else if (n.stage === 2) enterStage(s, 3, now);
      else endNight(s, now);
      return true;
    }
    case "day":
      if (s.dayEndsAt !== null && now >= s.dayEndsAt) { openVote(s); return true; }
      return false;
    case "vote":
      if (living(s).every((p) => s.votes[p.id] !== undefined)) { resolveVote(s); return true; }
      return false;
    default:
      return false;
  }
}

function endNight(s: State, now: number) {
  const n = s.night!;
  const lines: string[] = [];
  s.lastLock = n.lock;
  const k = n.kill;
  if (k === null || k === n.lock) {
    lines.push("คืนนี้สงบ ไม่มีใครเสียชีวิต");
  } else {
    const v = s.players.find((p) => p.alive && p.room === k);
    if (v) {
      v.alive = false;
      v.death = `ถูกฆาตกรรมคืนที่ ${s.day}`;
      s.marks[k] = "murdered";
      lines.push(`ห้อง ${k} — ฆาตกรรม! ${v.name} เสียชีวิต${s.settings.revealOnDeath ? ` (${ROLES[v.role!].en})` : ""}`);
    } else {
      s.marks[k] = "empty";
      lines.push(`ห้อง ${k} — ห้องว่าง (ฆาตกรบุกเข้าห้องที่ไม่มีคนพัก)`);
    }
  }
  const acts = s.players
    .filter((p) => n.acts[p.id])
    .sort((a, b) => ROLES[a.role!].order - ROLES[b.role!].order)
    .map((p) => ({ role: p.role!, name: p.name, text: strip(n.acts[p.id].result) }));
  s.history.push({ night: s.day, acts });
  lines.forEach((l) => s.log.push(`คืนที่ ${s.day}: ${l}`));
  s.morning = lines;
  s.night = null;
  const w = checkWin(s);
  if (w) return endGame(s, w);
  s.phase = "day";
  s.dayEndsAt = now + s.settings.discussSec * 1000;
}

function openVote(s: State) {
  s.phase = "vote";
  s.votes = {};
  s.dayEndsAt = null;
}

function resolveVote(s: State) {
  const counts = new Map<number | "skip", string[]>();
  for (const p of living(s)) {
    const v = s.votes[p.id];
    if (v === undefined) continue;
    if (!counts.has(v)) counts.set(v, []);
    counts.get(v)!.push(p.name);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1].length - a[1].length);
  const tally = sorted.map(([k, names]) => ({ label: k === "skip" ? "ไม่ประชาทัณฑ์" : `ห้อง ${k}`, names }));
  let line: string;
  const top = sorted[0];
  const tie = sorted.length > 1 && sorted[1][1].length === top[1].length;
  if (!top || top[0] === "skip" || tie) {
    line = !top ? "ไม่มีใครโหวต — วันนี้ไม่มีการประชาทัณฑ์" : tie ? "คะแนนเสมอ — วันนี้ไม่มีการประชาทัณฑ์" : "เสียงส่วนใหญ่ไม่ประชาทัณฑ์";
  } else {
    const room = top[0] as number;
    const v = s.players.find((p) => p.alive && p.room === room);
    if (v) {
      v.alive = false;
      v.death = `ถูกประชาทัณฑ์วันที่ ${s.day}`;
      s.marks[room] = "mob";
      const show = s.settings.revealOnDeath || v.role === "murderer";
      line = `ประชาทัณฑ์ห้อง ${room} — ${v.name} ถูกกำจัด${show ? ` (${ROLES[v.role!].en})` : ""}`;
    } else {
      s.marks[room] = "empty";
      line = `ประชาทัณฑ์ห้อง ${room} — ห้องว่าง ไม่มีใครพักอยู่`;
    }
  }
  s.log.push(`วันที่ ${s.day}: ${line}`);
  s.voteResult = { line, tally };
  s.phase = "voteResult";
  const w = checkWin(s);
  if (w) return endGame(s, w);
  if (s.day >= s.settings.days) endGame(s, { winner: "evil", reason: `ครบ ${s.settings.days} วันแล้ว ฆาตกรยังลอยนวล` });
}

export function checkWin(s: State): State["result"] {
  const m = holderOf(s, "murderer");
  if (!m || !m.alive) return { winner: "good", reason: "ฆาตกรถูกประชาทัณฑ์สำเร็จ" };
  const alive = living(s);
  const evil = alive.filter(isEvil).length;
  if (alive.length - evil <= evil) return { winner: "evil", reason: "ฝ่ายผู้เช่าเหลือไม่มากกว่าฝ่ายเงามืด" };
  return null;
}

function endGame(s: State, w: NonNullable<State["result"]>) {
  s.result = w;
  s.phase = "end";
  s.night = null;
  s.dayEndsAt = null;
}
