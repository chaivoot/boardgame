// Plays many random games straight through the engine to check the rules never get stuck.
// Run: npm test
import { newRoom, joinRoom, applyAction, advance, defaultSettings, type State } from "../lib/meninblack/engine.ts";
import { viewFor } from "../lib/meninblack/view.ts";

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
let goodWins = 0, evilWins = 0;

function play(n: number) {
  const { state: s } = newRoom("TEST", "P0");
  for (let i = 1; i < n; i++) joinRoom(s, `P${i}`);
  applyAction(s, s.hostId, { type: "settings", settings: defaultSettings(n) });
  applyAction(s, s.hostId, { type: "start" });
  for (const p of s.players) applyAction(s, p.id, { type: "ready" });
  let t = Date.now();
  for (let guard = 0; guard < 2000 && s.phase !== "end"; guard++) {
    t += 1000;
    if (s.phase === "night") {
      let acted = false;
      for (const p of s.players) {
        const v = viewFor(s, p.id, t);
        const task = v.night?.task;
        if (!task) continue;
        if (!task.chosen) {
          if (task.blockedReason) continue;
          const opt = task.canSkip && Math.random() < 0.5 ? null : pick(task.options);
          const target = opt === null ? null : typeof opt === "object" ? opt.id : opt;
          applyAction(s, p.id, { type: "nightAct", target }, t);
          acted = true;
        } else if (!task.chosen.done) {
          applyAction(s, p.id, { type: "nightDone" }, t);
          acted = true;
        }
        if (s.phase !== "night") break;
      }
      if (!acted) advance(s, t + 10000);
    } else if (s.phase === "day") {
      if (Math.random() < 0.5) applyAction(s, s.hostId, { type: "startVote" }, t);
      else advance(s, t + 3600_000);
    } else if (s.phase === "vote") {
      const rooms = Object.keys(s.marks);
      const open = viewFor(s, s.hostId).floors;
      const all: number[] = [];
      for (let f = 1; f <= open; f++) for (let c = 1; c <= 3; c++) if (!rooms.includes(String(f * 100 + c))) all.push(f * 100 + c);
      const choice = Math.random() < 0.15 ? "skip" : pick(all);
      for (const p of s.players.filter((p) => p.alive)) {
        if (s.phase !== "vote") break;
        applyAction(s, p.id, { type: "vote", room: Math.random() < 0.7 ? choice : pick(all) }, t);
      }
    } else if (s.phase === "voteResult") {
      applyAction(s, s.hostId, { type: "nextNight" }, t);
    }
  }
  if (s.phase !== "end") throw new Error(`stuck in ${s.phase} (n=${n})`);
  check(s);
  if (s.result!.winner === "good") goodWins++; else evilWins++;
}

function check(s: State) {
  const rooms = s.players.map((p) => p.room);
  if (new Set(rooms).size !== rooms.length) throw new Error("two players share a room");
  const v = viewFor(s, s.players[0].id);
  if (!v.reveal || !v.history) throw new Error("end view must reveal");
}

// a guest must never see other players' roles mid-game
{
  const { state: s } = newRoom("LEAK", "P0");
  for (let i = 1; i < 6; i++) joinRoom(s, `P${i}`);
  applyAction(s, s.hostId, { type: "start" });
  for (const p of s.players) {
    const json = JSON.stringify(viewFor(s, p.id));
    if (json.includes("token") || json.includes('"reveal":[')) throw new Error("view leaks secrets");
    for (const q of s.players) if (q !== p && !(p.role === "murderer" || p.role === "accomplice") && json.includes(`"role":"${q.role}"`) && q.role !== p.role) throw new Error(`view of ${p.role} leaks ${q.role}`);
  }
}

// board setup follows player count: floors = players, (players - 4) random rooms closed, nobody lives in one
for (let n = 4; n <= 9; n++) {
  const { state: s } = newRoom("SIZE", "H");
  for (let i = 1; i < n; i++) joinRoom(s, `P${i}`);
  applyAction(s, s.hostId, { type: "start" });
  const closed = Object.entries(s.marks).filter(([, m]) => m === "closed").map(([r]) => Number(r));
  if (s.settings.floors !== n) throw new Error(`n=${n}: expected ${n} floors, got ${s.settings.floors}`);
  if (closed.length !== n - 4) throw new Error(`n=${n}: expected ${n - 4} closed rooms, got ${closed.length}`);
  if (s.players.some((p) => closed.includes(p.room!))) throw new Error(`n=${n}: a player lives in a closed room`);
}
console.log("ok: board size follows player count");

// one human host + bots: bots must carry every phase forward on their own
function playWithBots(n: number) {
  const { state: s } = newRoom("BOTS", "Human");
  for (let i = 1; i < n; i++) applyAction(s, s.hostId, { type: "addBot" });
  applyAction(s, s.hostId, { type: "settings", settings: defaultSettings(n) });
  applyAction(s, s.hostId, { type: "start" });
  const h = s.players[0];
  let t = Date.now();
  for (let guard = 0; guard < 5000 && s.phase !== "end"; guard++) {
    t += 1000;
    if (s.phase === "deal" && !h.ready) applyAction(s, h.id, { type: "ready" }, t);
    const v = viewFor(s, h.id, t);
    const task = v.night?.task;
    if (task && !task.blockedReason) {
      if (!task.chosen) {
        const opt = task.canSkip ? null : pick(task.options);
        applyAction(s, h.id, { type: "nightAct", target: opt === null ? null : typeof opt === "object" ? opt.id : opt }, t);
      } else if (!task.chosen.done) applyAction(s, h.id, { type: "nightDone" }, t);
    }
    if (s.phase === "day") applyAction(s, h.id, { type: "startVote" }, t);
    if (s.phase === "vote" && h.alive && s.votes[h.id] === undefined) applyAction(s, h.id, { type: "vote", room: "skip" }, t);
    if (s.phase === "voteResult") applyAction(s, h.id, { type: "nextNight" }, t);
    advance(s, t);
  }
  if (s.phase !== "end") throw new Error(`bot game stuck in ${s.phase} night=${JSON.stringify(s.night)} (n=${n})`);
  if (s.day > 1 && !(s.claims ?? []).length) throw new Error("bots never posted claims");
}
for (let i = 0; i < 120; i++) playWithBots(4 + (i % 6));
console.log("ok: 120 games with 1 human + bots");

const N = 400;
for (let i = 0; i < N; i++) play(4 + (i % 6));
console.log(`ok: ${N} games, good ${goodWins} / evil ${evilWins}`);
