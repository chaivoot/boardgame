import { ROLES, type RoleKey } from "./roles.ts";
import { holderOf, isEvil, playerById, stageActors, allRooms, type State, type Mark, type Phase, type Settings } from "./engine.ts";

export interface PublicPlayer { id: string; name: string; alive: boolean; death: string | null; ready: boolean; isHost: boolean; voted?: boolean; bot?: boolean }

export interface MyTask {
  kind: "player" | "room" | "floor" | "col";
  role: RoleKey;
  options: (number | { id: string; name: string })[];
  canSkip: boolean;
  blockedReason: string | null;
  chosen: { result: string; done: boolean } | null;
}

export interface View {
  v: number;
  code: string;
  phase: Phase;
  settings: Settings;
  now: number;
  day: number;
  floors: number;
  marks: Record<string, Mark>;
  players: PublicPlayer[];
  me: { id: string; name: string; isHost: boolean; alive: boolean; role: RoleKey | null; room: number | null; ready: boolean };
  mates: { name: string; role: RoleKey }[];
  notices: string[];
  night: { stage: 1 | 2 | 3; task: MyTask | null; partner: string | null; waitingOn: number } | null;
  morning: string[];
  dayEndsAt: number | null;
  myVote: number | "skip" | null;
  votedCount: number;
  voteResult: State["voteResult"];
  log: string[];
  claims: { day: number; name: string; text: string }[];
  result: State["result"];
  reveal: { name: string; role: RoleKey; room: number; startRoom: number; alive: boolean; death: string | null }[] | null;
  history: State["history"] | null;
}

export function viewFor(s: State, playerId: string, now = Date.now()): View {
  const me = playerById(s, playerId)!;
  const ended = s.phase === "end";

  let night: View["night"] = null;
  if (s.phase === "night" && s.night) {
    const n = s.night;
    const actors = stageActors(s, n.stage);
    const amActor = actors.some((p) => p.id === me.id);
    let task: MyTask | null = null;
    let partner: string | null = null;
    if (amActor && me.role) {
      const def = ROLES[me.role];
      const act = n.acts[me.id];
      let options: MyTask["options"] = [];
      const floors = s.settings.floors;
      if (def.act === "player") options = s.players.filter((p) => p.alive && p.id !== me.id).map((p) => ({ id: p.id, name: p.name }));
      if (def.act === "floor") options = Array.from({ length: floors }, (_, i) => floors - i);
      if (def.act === "col") options = [1, 2, 3];
      if (def.act === "room") options = allRooms(floors).filter((r) => !s.marks[r] && !(me.role === "murderer" && r === me.room) && !(me.role === "keymaster" && r === s.lastLock));
      let blockedReason: string | null = null;
      if (me.role === "murderer") {
        const acc = holderOf(s, "accomplice");
        if (acc) {
          const accAct = n.acts[acc.id];
          if (accAct) partner = accAct.result;
          else if (acc.alive) blockedReason = "รอผู้ช่วยสืบข้อมูลก่อน…";
        }
      }
      task = { kind: def.act!, role: me.role, options, canSkip: me.role === "drunk", blockedReason, chosen: act ? { result: act.result, done: act.done } : null };
    }
    if (me.role === "accomplice" && n.stage === 2) {
      const m = holderOf(s, "murderer");
      if (m && n.acts[m.id]) partner = `ฆาตกร${n.acts[m.id].result}`;
    }
    night = { stage: n.stage, task, partner, waitingOn: actors.filter((p) => !n.acts[p.id]?.done).length };
  }

  return {
    v: s.v,
    code: s.code,
    phase: s.phase,
    settings: s.settings,
    now,
    day: s.day,
    floors: s.settings.floors,
    marks: s.marks,
    players: s.players.map((p) => ({
      id: p.id, name: p.name, alive: p.alive, death: p.death, ready: p.ready, isHost: p.id === s.hostId,
      voted: s.phase === "vote" ? s.votes[p.id] !== undefined : undefined, bot: !!p.bot,
    })),
    me: { id: me.id, name: me.name, isHost: me.id === s.hostId, alive: me.alive, role: me.role, room: me.room, ready: me.ready },
    mates: me.role && isEvil(me) ? s.players.filter((p) => p.id !== me.id && isEvil(p)).map((p) => ({ name: p.name, role: p.role! })) : [],
    notices: s.notices[me.id] ?? [],
    night,
    morning: s.morning,
    dayEndsAt: s.dayEndsAt,
    myVote: s.votes[me.id] ?? null,
    votedCount: Object.keys(s.votes).length,
    voteResult: s.voteResult,
    log: s.log,
    claims: s.claims ?? [],
    result: s.result,
    reveal: ended ? s.players.map((p) => ({ name: p.name, role: p.role!, room: p.room!, startRoom: p.startRoom!, alive: p.alive, death: p.death })) : null,
    history: ended ? s.history : null,
  };
}
