"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API, getName, postJSON, setName, setSession } from "@/components/client.ts";
import { Card, Logo, Overlay, Rules } from "@/components/mib-ui.tsx";
import { ROLES, type RoleKey } from "@/lib/meninblack/roles.ts";

type JoinRes = { code: string; token: string; playerId: string };

export default function Lobby() {
  const router = useRouter();
  const [name, setNm] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [ov, setOv] = useState<"rules" | "cards" | null>(null);

  useEffect(() => { setNm(getName()); }, []);

  async function go(kind: "create" | "join") {
    setErr("");
    if (!name.trim()) return setErr("กรุณาใส่ชื่อ");
    if (kind === "join" && code.trim().length < 4) return setErr("กรุณาใส่รหัสห้อง 4 ตัวอักษร");
    setBusy(true);
    try {
      setName(name.trim());
      const res = kind === "create"
        ? await postJSON<JoinRes>(API, { name })
        : await postJSON<JoinRes>(`${API}/${code.trim().toUpperCase()}`, { name });
      setSession(res.code, { token: res.token, playerId: res.playerId });
      router.push(`/meninblack/${res.code}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main id="app">
      <div className="topbar">
        <div className="brand"><Logo /><span>ชายชุดดำ</span></div>
        <button className="btn ghost small" onClick={() => setOv("rules")}>กติกา</button>
      </div>
      <div className="hero">
        <Logo className="logo" />
        <h1>ชายชุดดำ</h1>
        <div className="en">MEN IN BLACK</div>
      </div>
      <p className="center muted">เกมสืบสวนหาฆาตกรในตึก 4–9 คน<br />เล่นออนไลน์ แต่ละคนใช้มือถือตัวเอง</p>
      <div className="cards-strip" style={{ margin: "20px 0" }}>
        <Card role="detective" /><Card role="murderer" /><Card role="witness" />
      </div>
      <div className="stack">
        <label className="small">ชื่อของคุณ
          <input type="text" value={name} maxLength={16} onChange={(e) => setNm(e.target.value)} placeholder="เช่น ต้น" />
        </label>
        {err && <div className="err">{err}</div>}
        <button className="btn primary block" disabled={busy} onClick={() => go("create")}>สร้างห้องใหม่</button>
        <div className="panel">
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input type="text" value={code} maxLength={4} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="รหัสห้อง" style={{ fontFamily: "Oswald", letterSpacing: 4, textTransform: "uppercase" }} />
            <button className="btn" disabled={busy} onClick={() => go("join")} style={{ whiteSpace: "nowrap" }}>เข้าร่วม</button>
          </div>
        </div>
        <button className="btn ghost block" onClick={() => setOv("cards")}>ดูการ์ดทั้งหมด</button>
      </div>
      <p className="center muted small" style={{ marginTop: 24 }}>แบบจำลองสำหรับฝึกซ้อม · กราฟิกและชื่อทั้งหมดสร้างขึ้นใหม่</p>
      {ov === "rules" && <Overlay onClose={() => setOv(null)}><Rules /></Overlay>}
      {ov === "cards" && (
        <Overlay onClose={() => setOv(null)}>
          <h2>การ์ดทั้งหมด</h2>
          <div className="cards-strip">
            {(Object.keys(ROLES) as RoleKey[]).map((k) => (
              <div key={k}><Card role={k} /><p className="small muted center" style={{ marginTop: 6 }}>{ROLES[k].desc}</p></div>
            ))}
          </div>
        </Overlay>
      )}
    </main>
  );
}
