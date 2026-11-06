"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { API, BASE, clearSession, getName, getSession, postJSON, setName, setSession, type Session } from "@/components/client.ts";
import { Board, Card, DayTrack, Keycard, Logo, Overlay, Rules } from "@/components/mib-ui.tsx";
import { ROLES, SPECIAL, COLOR, MIN_PLAYERS, MAX_FLOORS, type RoleKey } from "@/lib/meninblack/roles.ts";
import type { Action, Settings } from "@/lib/meninblack/engine.ts";
import type { View } from "@/lib/meninblack/view.ts";

const POLL_MS = 1200;
const STAGE_TEXT = { 1: "ช่วงสืบ", 2: "ช่วงลงมือ", 3: "ช่วงพยาน" } as const;

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const code = use(params).code.toUpperCase();
  const [session, setSess] = useState<Session | null | undefined>(undefined);
  useEffect(() => { setSess(getSession(code)); }, [code]);

  if (session === undefined) return <main id="app"><p className="muted center">กำลังโหลด…</p></main>;
  if (!session) return <JoinForm code={code} onJoined={(s) => { setSession(code, s); setSess(s); }} />;
  return <Game code={code} session={session} onLost={() => { clearSession(code); setSess(null); }} />;
}

function JoinForm({ code, onJoined }: { code: string; onJoined: (s: Session) => void }) {
  const [name, setNm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setNm(getName()); }, []);
  async function join() {
    setErr(""); setBusy(true);
    try {
      setName(name.trim());
      const r = await postJSON<{ token: string; playerId: string }>(`${API}/${code}`, { name });
      onJoined({ token: r.token, playerId: r.playerId });
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }
  return (
    <main id="app">
      <div className="topbar"><div className="brand"><Logo /><span>ชายชุดดำ</span></div></div>
      <p className="center muted">เข้าร่วมห้อง</p>
      <div className="code">{code}</div>
      <div className="stack" style={{ marginTop: 16 }}>
        <label className="small">ชื่อของคุณ<input type="text" value={name} maxLength={16} onChange={(e) => setNm(e.target.value)} /></label>
        {err && <div className="err">{err}</div>}
        <button className="btn primary block" disabled={busy || !name.trim()} onClick={join}>เข้าร่วม</button>
        <Link href="/meninblack" className="btn ghost block center" style={{ textDecoration: "none" }}>กลับหน้าแรก</Link>
      </div>
    </main>
  );
}

/* ====================================================================== */

function useNow(offset: number) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => { const t = setInterval(() => setNow(Date.now() + offset), 500); return () => clearInterval(t); }, [offset]);
  return now;
}
const fmt = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

function Game({ code, session, onLost }: { code: string; session: Session; onLost: () => void }) {
  const [view, setView] = useState<View | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [ov, setOv] = useState<"rules" | "me" | null>(null);
  const [offset, setOffset] = useState(0);
  const vRef = useRef(-1);

  const accept = useCallback((v: View) => {
    vRef.current = v.v;
    setOffset(v.now - Date.now());
    setView(v);
  }, []);

  // polling
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const res = await fetch(`${API}/${code}?v=${vRef.current}`, { headers: { "x-token": session.token }, cache: "no-store" });
        if (res.status === 401 || res.status === 404) { if (alive) onLost(); return; }
        const j = await res.json();
        if (!alive) return;
        setOffline(false);
        if (j.view) accept(j.view);
      } catch { if (alive) setOffline(true); }
      if (alive) timer = setTimeout(poll, document.hidden ? POLL_MS * 3 : POLL_MS);
    }
    poll();
    const onVis = () => { if (!document.hidden) { clearTimeout(timer); poll(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [code, session.token, accept, onLost]);

  const send = useCallback(async (a: Action) => {
    setErr(""); setBusy(true);
    try {
      const r = await postJSON<{ view: View }>(`${API}/${code}/action`, a, session.token);
      accept(r.view);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }, [code, session.token, accept]);

  // buzz when it becomes my turn at night
  const myTurn = !!view?.night?.task && !view.night.task.chosen && !view.night.task.blockedReason;
  const prevTurn = useRef(false);
  useEffect(() => {
    if (myTurn && !prevTurn.current) { try { navigator.vibrate?.([120, 80, 120]); } catch {} }
    prevTurn.current = myTurn;
  }, [myTurn]);

  const now = useNow(offset);

  if (!view) return <main id="app"><p className="muted center">กำลังเชื่อมต่อห้อง {code}…</p></main>;

  const isNight = view.phase === "night";
  const title =
    view.phase === "lobby" ? `ห้อง ${code}` :
    view.phase === "deal" ? "แจกการ์ด" :
    isNight ? `คืนที่ ${view.day}` :
    view.phase === "end" ? "จบเกม" : `วันที่ ${view.day}`;

  const p = { view, send, busy, now };
  return (
    <main id="app" className={isNight ? "night" : ""} style={isNight ? { minHeight: "100vh" } : undefined}>
      <div className="topbar">
        <div className="brand"><Logo /><span>{title}</span></div>
        <div className="row">
          <button className="btn ghost small" onClick={() => setOv("rules")}>กติกา</button>
          {view.me.role && <button className="btn ghost small" onClick={() => setOv("me")}>การ์ดฉัน</button>}
        </div>
      </div>
      {offline && <div className="err" style={{ marginBottom: 12 }}>การเชื่อมต่อหลุด กำลังลองใหม่…</div>}
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      {view.notices.length > 0 && view.phase !== "lobby" && (
        <div className="stack" style={{ marginBottom: 12 }}>{view.notices.map((n, i) => <div key={i} className="note">{n}</div>)}</div>
      )}

      {view.phase === "lobby" && <LobbyScreen {...p} code={code} />}
      {view.phase === "deal" && <DealScreen {...p} />}
      {view.phase === "night" && <NightScreen {...p} />}
      {view.phase === "day" && <DayScreen {...p} />}
      {view.phase === "vote" && <VoteScreen {...p} />}
      {view.phase === "voteResult" && <VoteResultScreen {...p} />}
      {view.phase === "end" && <EndScreen {...p} />}

      {ov === "rules" && <Overlay onClose={() => setOv(null)}><Rules /></Overlay>}
      {ov === "me" && view.me.role && (
        <Overlay onClose={() => setOv(null)}>
          <h2 className="center">{view.me.name}</h2>
          <Card role={view.me.role} />
          <p className="center" style={{ marginTop: 12 }}>{ROLES[view.me.role].desc}</p>
          {view.me.room && <Keycard room={view.me.room} />}
          <Mates view={view} />
        </Overlay>
      )}
    </main>
  );
}

type P = { view: View; send: (a: Action) => Promise<void>; busy: boolean; now: number };

const Mates = ({ view }: { view: View }) =>
  view.mates.length ? (
    <div className="note" style={{ marginTop: 12 }}>
      พวกเดียวกัน: {view.mates.map((m, i) => <span key={i}>{i > 0 && ", "}<b>{m.name}</b> ({ROLES[m.role].en})</span>)}
    </div>
  ) : null;

function Fab({ children }: { children: React.ReactNode }) {
  return <div className="fab"><div className="wrap">{children}</div></div>;
}

/* ---------------- LOBBY ---------------- */
function LobbyScreen({ view, send, busy, code }: P & { code: string }) {
  const n = view.players.length;
  const st = view.settings;
  const guests = n - st.roles.length;
  const host = view.me.isHost;
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}${BASE}/meninblack/${code}` : "";
  const set = (s: Partial<Settings>) => send({ type: "settings", settings: s });
  const toggle = (k: RoleKey, on: boolean) => set({ roles: on ? [...st.roles, k] : st.roles.filter((r) => r !== k) });
  const preset = () => set({ auto: true });
  const closed = st.closedRooms ?? 0;
  const usable = st.floors * 3 - closed;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "ชายชุดดำ", text: `เข้าห้อง ${code}`, url: link });
      else { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    } catch {}
  };
  const problems = [
    n < MIN_PLAYERS && `ต้องมีผู้เล่นอย่างน้อย ${MIN_PLAYERS} คน (ตอนนี้ ${n})`,
    guests < 0 && `บทบาทเกินจำนวนผู้เล่น ${-guests} ใบ`,
    usable < n && "ห้องไม่พอ เพิ่มชั้นหรือลดห้องที่ปิด",
  ].filter(Boolean) as string[];

  return (
    <div className="stack">
      <div className="panel center">
        <p className="muted small">รหัสห้อง</p>
        <div className="code">{code}</div>
        <button className="btn" onClick={share}>{copied ? "คัดลอกลิงก์แล้ว" : "แชร์ลิงก์ให้เพื่อน"}</button>
      </div>
      <div className="panel">
        <h3>ผู้เล่น ({n}/9)</h3>
        <div className="plist">
          {view.players.map((pl) => (
            <div className="pitem" key={pl.id}>
              <span>{pl.bot && "🤖 "}{pl.name}{pl.id === view.me.id && " (คุณ)"} {pl.isHost && <span className="pill">เจ้าของห้อง</span>}</span>
              {host && !pl.isHost && <button className="btn ghost small" style={{ minHeight: 32, padding: "4px 10px" }} onClick={() => send({ type: "kick", playerId: pl.id })}>เตะ</button>}
            </div>
          ))}
        </div>
        {host && n < 9 && (
          <button className="btn block" style={{ marginTop: 8 }} disabled={busy} onClick={() => send({ type: "addBot" })}>+ เพิ่มบอท</button>
        )}
        {host && <p className="muted small" style={{ marginTop: 6 }}>บอทเล่นเองทั้งกลางคืนและโหวต ทุกเช้าจะแจ้งข้อมูลที่ได้ (บอทฝ่ายเงามืดจะโกหก)</p>}
      </div>
      <div className="panel">
        <div className="spread"><h3>บทบาทในเกม</h3>{host && <button className="btn ghost small" onClick={preset}>ค่าแนะนำ</button>}</div>
        {SPECIAL.map((k) => (
          <label className="chk" key={k}>
            <input type="checkbox" checked={st.roles.includes(k)} disabled={!host || k === "murderer" || busy} onChange={(e) => toggle(k, e.target.checked)} />
            <span><b>{ROLES[k].en}</b> · {ROLES[k].th} <span className={`tag ${ROLES[k].team}`}>{ROLES[k].team === "evil" ? "เงามืด" : "ผู้เช่า"}</span></span>
          </label>
        ))}
        <p className="muted small">GUEST (แขก) × {Math.max(0, guests)}</p>
      </div>
      <div className="panel">
        <h3>กระดานและเวลา</h3>
        <div className="grid2">
          <label className="small">จำนวนชั้น
            <select value={st.floors} disabled={!host} onChange={(e) => set({ floors: +e.target.value })}>{Array.from({ length: MAX_FLOORS - 1 }, (_, i) => i + 2).map((f) => <option key={f}>{f}</option>)}</select>
          </label>
          <label className="small">ห้องปิดปรับปรุง (สุ่ม)
            <select value={closed} disabled={!host} onChange={(e) => set({ closedRooms: +e.target.value })}>{Array.from({ length: Math.max(closed, st.floors * 3 - Math.max(n, MIN_PLAYERS)) + 1 }, (_, i) => i).map((f) => <option key={f}>{f}</option>)}</select>
          </label>
          <label className="small">จำนวนวัน
            <select value={st.days} disabled={!host} onChange={(e) => set({ days: +e.target.value })}>{[1, 2, 3, 4, 5].map((f) => <option key={f}>{f}</option>)}</select>
          </label>
          <label className="small">เวลาคุยต่อวัน (นาที)
            <select value={st.discussSec / 60} disabled={!host} onChange={(e) => set({ discussSec: +e.target.value * 60 })}>{[1, 2, 3, 4, 5, 7, 10].map((f) => <option key={f}>{f}</option>)}</select>
          </label>
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>{st.floors} ชั้น × 3 = {st.floors * 3} ห้อง · ปิด {closed} · มีคนพัก {n} · ห้องว่าง {Math.max(0, usable - n)}{st.auto !== false && " · ตั้งตามจำนวนผู้เล่นอัตโนมัติ"}</p>
        <label className="chk"><input type="checkbox" checked={st.revealOnDeath} disabled={!host} onChange={(e) => set({ revealOnDeath: e.target.checked })} /> เปิดเผยบทบาทเมื่อผู้เล่นตาย</label>
      </div>
      {problems.map((x) => <div key={x} className="err">{x}</div>)}
      <Fab>
        {host
          ? <button className="btn primary" disabled={busy || problems.length > 0} onClick={() => send({ type: "start" })}>เริ่มเกม แจกการ์ด</button>
          : <button className="btn" disabled>รอเจ้าของห้องเริ่มเกม…</button>}
      </Fab>
    </div>
  );
}

/* ---------------- DEAL ---------------- */
function DealScreen({ view, send, busy }: P) {
  const [shown, setShown] = useState(false);
  const ready = view.players.filter((x) => x.ready).length;
  const role = view.me.role!;
  return (
    <div>
      {!shown && !view.me.ready ? (
        <div className="hidden-tip">
          <p>การ์ดของคุณมาแล้ว</p>
          <p className="muted small">อย่าให้คนข้างๆ เห็นจอ</p>
          <button className="btn primary" onClick={() => setShown(true)}>แตะเพื่อดูการ์ด</button>
        </div>
      ) : (
        <>
          <Card role={role} />
          <p className="center" style={{ marginTop: 12 }}>{ROLES[role].desc}</p>
          {view.me.room && <Keycard room={view.me.room} />}
          <Mates view={view} />
        </>
      )}
      <p className="center muted small" style={{ marginTop: 16 }}>พร้อมแล้ว {ready}/{view.players.length} คน · ดูการ์ดซ้ำได้ที่ปุ่ม &quot;การ์ดฉัน&quot;</p>
      <Fab>
        <button className="btn primary" disabled={busy || view.me.ready || (!shown && !view.me.ready)} onClick={() => send({ type: "ready" })}>
          {view.me.ready ? "รอคนอื่น…" : "จำแล้ว พร้อม"}
        </button>
      </Fab>
    </div>
  );
}

/* ---------------- NIGHT ---------------- */
function NightScreen({ view, send, busy }: P) {
  const n = view.night!;
  const task = n.task;
  const [sel, setSel] = useState<number | string | null>(null);
  useEffect(() => { setSel(null); }, [n.stage]);

  const head = (
    <div className="stage">{([1, 2, 3] as const).map((s) => <span key={s} className={s === n.stage ? "on" : ""}>{s}. {STAGE_TEXT[s]}</span>)}</div>
  );

  if (!task) {
    return (
      <div>
        {head}
        <div className="sleep">
          <div className="moon">🌙</div>
          <h2>หลับตา…</h2>
          <p className="muted">
            {!view.me.alive ? "คุณเสียชีวิตแล้ว ดูเกมต่อได้แต่ห้ามบอกใบ้" :
              n.stage === 1 ? "ผู้มีความสามารถกำลังสืบข้อมูล" :
              n.stage === 2 ? "ฝ่ายเงามืดกำลังลงมือ" : "พยานกำลังเฝ้าดู"}
          </p>
          {n.partner && <div className="note" style={{ marginTop: 12, textAlign: "left" }} dangerouslySetInnerHTML={{ __html: n.partner }} />}
        </div>
        <p className="center muted small" style={{ marginTop: 16 }}>วางมือถือคว่ำไว้ได้ ถึงตาคุณเครื่องจะสั่น</p>
      </div>
    );
  }

  const def = ROLES[task.role];
  const evil = def.team === "evil";
  const partnerBox = n.partner && (
    <div className="note" style={{ marginBottom: 12 }}>
      {task.role === "murderer" ? "ข้อมูลจากผู้ช่วย: " : ""}<span dangerouslySetInnerHTML={{ __html: n.partner }} />
    </div>
  );

  if (task.chosen) {
    return (
      <div>
        {head}
        <div className="bigmsg">{def.th} <span className="muted" style={{ fontFamily: "Oswald", letterSpacing: 2 }}>{def.en}</span></div>
        {partnerBox}
        <div className={`result ${evil ? "evil" : ""}`} dangerouslySetInnerHTML={{ __html: task.chosen.result }} />
        {task.chosen.done ? (
          <div className="sleep" style={{ marginTop: 16 }}><h3>เรียบร้อย หลับตารอได้เลย</h3><p className="muted small">รอคนอื่นอีก {n.waitingOn} คน</p></div>
        ) : (
          <Fab><button className="btn primary" disabled={busy} onClick={() => send({ type: "nightDone" })}>จำแล้ว เรียบร้อย</button></Fab>
        )}
      </div>
    );
  }

  const pickable = task.options.filter((o): o is number => typeof o === "number");
  return (
    <div>
      {head}
      <div className="bigmsg">{def.th} <span className="muted" style={{ fontFamily: "Oswald", letterSpacing: 2 }}>{def.en}</span> ถึงตาคุณ</div>
      <p className="center muted small">{def.desc}</p>
      <p className="center small">ห้องของคุณ: <b>{view.me.room}</b></p>
      {partnerBox}
      {task.blockedReason ? (
        <div className="sleep"><p>{task.blockedReason}</p></div>
      ) : (
        <>
          {task.kind === "room" && <Board floors={view.floors} marks={view.marks} pick={pickable} sel={typeof sel === "number" ? sel : null} onPick={setSel} />}
          {(task.kind === "floor" || task.kind === "col") && (
            <div className="grid3">
              {pickable.map((v) => (
                <button key={v} className={`btn ${sel === v ? "sel" : ""}`} onClick={() => setSel(v)}>
                  {task.kind === "floor" ? `ชั้น ${v}` : <>แถว {v}<br /><span className="small muted">x0{v}</span></>}
                </button>
              ))}
            </div>
          )}
          {task.kind === "player" && (
            <div className="grid2">
              {task.options.map((o) => typeof o === "object" && (
                <button key={o.id} className={`btn ${sel === o.id ? "sel" : ""}`} onClick={() => setSel(o.id)}>{o.name}</button>
              ))}
            </div>
          )}
          <Fab>
            {task.canSkip && <button className="btn" disabled={busy} onClick={() => send({ type: "nightAct", target: null })}>ไม่ใช้คืนนี้</button>}
            <button className="btn primary" disabled={busy || sel === null} onClick={() => send({ type: "nightAct", target: sel })}>ยืนยัน</button>
          </Fab>
        </>
      )}
    </div>
  );
}

/* ---------------- DAY ---------------- */
function Claims({ view }: { view: View }) {
  const days = [...new Set(view.claims.map((c) => c.day))].sort((a, b) => b - a);
  if (!days.length) return null;
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h3>🤖 บอทแจ้งข้อมูล</h3>
      {days.map((d) => (
        <div key={d} style={{ marginTop: 8 }}>
          <div className="muted small">เช้าวันที่ {d}</div>
          {view.claims.filter((c) => c.day === d).map((c, i) => (
            <div key={i} className="small" style={{ padding: "3px 0" }}><b>{c.name}:</b> {c.text}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PlayersAndLog({ view }: { view: View }) {
  return (
    <>
      <Claims view={view} />
      <h3 style={{ marginTop: 16 }}>ผู้เล่น ({view.players.filter((x) => x.alive).length} คนยังอยู่)</h3>
      <div className="plist">
        {view.players.map((pl) => (
          <div key={pl.id} className={`pitem ${pl.alive ? "" : "dead"}`}>
            <span>{pl.bot && "🤖 "}{pl.name}{pl.id === view.me.id && " (คุณ)"}</span>
            <span className="small muted">{pl.alive ? (pl.voted === undefined ? "" : pl.voted ? <span className="pill ok">โหวตแล้ว</span> : <span className="pill">ยังไม่โหวต</span>) : pl.death}</span>
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 16 }}>บันทึกสาธารณะ</h3>
      <div className="log">{view.log.length ? view.log.map((l, i) => <div key={i}>{l}</div>) : <div>—</div>}</div>
    </>
  );
}

function DayScreen({ view, send, busy, now }: P) {
  const left = view.dayEndsAt ? view.dayEndsAt - now : 0;
  return (
    <div>
      <DayTrack day={view.day} max={view.settings.days} />
      <div className="stack" style={{ marginTop: 12 }}>
        {view.morning.map((l, i) => <div key={i} className={`result ${/ฆาตกรรม/.test(l) ? "evil" : ""}`}>☀️ {l}</div>)}
      </div>
      <div className="panel" style={{ margin: "12px 0" }}>
        <p className="center muted small">เวลาคุยก่อนโหวต</p>
        <div className="timer">{fmt(left)}</div>
        {view.me.isHost && (
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn ghost" disabled={busy} onClick={() => send({ type: "addTime", sec: 60 })}>+1 นาที</button>
            <button className="btn ghost" disabled={busy} onClick={() => send({ type: "addTime", sec: -60 })}>−1 นาที</button>
          </div>
        )}
      </div>
      <Board floors={view.floors} marks={view.marks} />
      <PlayersAndLog view={view} />
      {view.me.isHost && <Fab><button className="btn primary" disabled={busy} onClick={() => send({ type: "startVote" })}>เปิดโหวตเลย</button></Fab>}
    </div>
  );
}

function VoteScreen({ view, send, busy }: P) {
  const open: number[] = [];
  for (let f = 1; f <= view.floors; f++) for (let c = 1; c <= 3; c++) if (!view.marks[f * 100 + c]) open.push(f * 100 + c);
  const alive = view.players.filter((x) => x.alive).length;
  const my = view.myVote;
  return (
    <div>
      <DayTrack day={view.day} max={view.settings.days} />
      <h2 className="center" style={{ marginTop: 12 }}>โหวตประชาทัณฑ์</h2>
      {view.me.alive ? (
        <p className="center small">แตะ <b>ห้อง</b> ที่สงสัยว่าเป็นของฆาตกร (เปลี่ยนได้จนกว่าทุกคนจะโหวตครบ)<br />
          <span className="muted">ห้องที่ได้เสียงมากสุดถูกประชาทัณฑ์ · เสมอ = ไม่ประชาทัณฑ์</span></p>
      ) : <p className="center muted">คุณเสียชีวิตแล้ว โหวตไม่ได้</p>}
      <Board floors={view.floors} marks={view.marks} pick={view.me.alive ? open : undefined} sel={typeof my === "number" ? my : null}
        onPick={(r) => send({ type: "vote", room: r })} />
      <p className="center" style={{ marginTop: 12 }}>
        {my === null ? (view.me.alive ? "คุณยังไม่ได้โหวต" : "") : my === "skip" ? "คุณโหวต: ไม่ประชาทัณฑ์" : <>คุณโหวต: <b>ห้อง {my}</b></>}
        <br /><span className="muted small">โหวตแล้ว {view.votedCount}/{alive} คน</span>
      </p>
      <PlayersAndLog view={view} />
      <Fab>
        {view.me.alive && <button className={`btn ${my === "skip" ? "sel" : ""}`} disabled={busy} onClick={() => send({ type: "vote", room: "skip" })}>ไม่ประชาทัณฑ์</button>}
        {view.me.isHost && <button className="btn danger" disabled={busy} onClick={() => { if (confirm("ปิดโหวตตอนนี้เลย? คนที่ยังไม่โหวตจะไม่นับ")) send({ type: "closeVote" }); }}>ปิดโหวต</button>}
      </Fab>
    </div>
  );
}

function Tally({ view }: { view: View }) {
  const r = view.voteResult;
  if (!r || !r.tally.length) return null;
  return (
    <div className="panel" style={{ margin: "12px 0" }}>
      <h3>ผลโหวต</h3>
      {r.tally.map((t) => <div key={t.label} className="small" style={{ padding: "4px 0" }}><b>{t.label}</b> ({t.names.length}) — <span className="muted">{t.names.join(", ")}</span></div>)}
    </div>
  );
}

function VoteResultScreen({ view, send, busy }: P) {
  const r = view.voteResult!;
  return (
    <div>
      <div className={`result ${/ถูกกำจัด/.test(r.line) ? "evil" : ""}`} style={{ margin: "8px 0" }}>{r.line}</div>
      <Tally view={view} />
      <Board floors={view.floors} marks={view.marks} />
      <PlayersAndLog view={view} />
      <Fab>
        {view.me.isHost
          ? <button className="btn primary" disabled={busy} onClick={() => send({ type: "nextNight" })}>เข้าสู่คืนที่ {view.day + 1}</button>
          : <button className="btn" disabled>รอเจ้าของห้องเริ่มคืนถัดไป…</button>}
      </Fab>
    </div>
  );
}

/* ---------------- END ---------------- */
function EndScreen({ view, send, busy }: P) {
  const w = view.result!;
  const good = w.winner === "good";
  return (
    <div>
      <div className={`result ${good ? "" : "evil"}`} style={{ fontSize: 26 }}>
        {good ? "ฝ่ายผู้เช่า ชนะ!" : "ฝ่ายเงามืด ชนะ!"}
        <div className="small muted" style={{ fontSize: 15 }}>{w.reason}</div>
      </div>
      <Tally view={view} />
      <h3 style={{ marginTop: 20 }}>เฉลยบทบาท</h3>
      <table className="roles"><thead><tr><th>ผู้เล่น</th><th>บทบาท</th><th>ห้อง</th><th>สถานะ</th></tr></thead>
        <tbody>
          {view.reveal!.map((x) => (
            <tr key={x.name}>
              <td>{x.name}</td>
              <td style={{ color: COLOR[ROLES[x.role].team] }}>{ROLES[x.role].en}<br /><span className="muted small">{ROLES[x.role].th}</span></td>
              <td>{x.room}{x.startRoom !== x.room && <><br /><span className="muted small">เดิม {x.startRoom}</span></>}</td>
              <td className="small">{x.alive ? "รอด" : x.death}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={{ marginTop: 20 }}>ย้อนดูทุกคืน (สำหรับทบทวน)</h3>
      {view.history!.map((h) => (
        <div className="panel" key={h.night} style={{ marginBottom: 8 }}>
          <b>คืนที่ {h.night}</b>
          <div className="log">{h.acts.map((a, i) => <div key={i}><span style={{ color: COLOR[ROLES[a.role].team] }}>{ROLES[a.role].th}</span> ({a.name}): {a.text}</div>)}</div>
        </div>
      ))}
      <h3>บันทึกสาธารณะ</h3>
      <div className="log">{view.log.map((l, i) => <div key={i}>{l}</div>)}</div>
      <Fab>
        <Link className="btn" href="/meninblack" style={{ textAlign: "center", textDecoration: "none" }}>ออก</Link>
        {view.me.isHost
          ? <button className="btn primary" disabled={busy} onClick={() => send({ type: "restart" })}>เล่นอีกรอบ (ห้องเดิม)</button>
          : <button className="btn" disabled>รอเจ้าของห้อง…</button>}
      </Fab>
    </div>
  );
}
