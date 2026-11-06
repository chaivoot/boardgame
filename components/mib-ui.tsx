"use client";
import { cardSVG, keycardSVG, LOGO } from "@/lib/meninblack/cards.ts";
import { ROLES, COLOR, type RoleKey } from "@/lib/meninblack/roles.ts";
import type { Mark } from "@/lib/meninblack/engine.ts";

// The SVG strings are generated from our own static templates (no user input), so inlining them is safe.
export const Card = ({ role }: { role: RoleKey }) => <div dangerouslySetInnerHTML={{ __html: cardSVG(role) }} />;
export const Keycard = ({ room }: { room: number }) => <div dangerouslySetInnerHTML={{ __html: keycardSVG(room) }} />;
export const Logo = ({ className }: { className?: string }) => (
  <span className={className} style={{ display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: LOGO }} />
);

export function Board({ floors, marks, pick, sel, onPick }: {
  floors: number; marks: Record<string, Mark>; pick?: number[]; sel?: number | null; onPick?: (r: number) => void;
}) {
  const rows = [];
  for (let f = floors; f >= 1; f--) {
    const cells = [];
    for (let c = 1; c <= 3; c++) {
      const r = f * 100 + c, mk = marks[r];
      const can = !!pick?.includes(r);
      const cls = ["room", can ? "pick" : "", pick && !can ? "dis" : "", sel === r ? "sel" : ""].join(" ");
      cells.push(
        <button key={r} className={cls} disabled={!can} onClick={() => can && onPick?.(r)} aria-label={`ห้อง ${r}`}>
          {r}
          {mk && (
            <span className={`mk ${mk}`}>
              <b>{r}</b>
              {mk === "murdered" ? "ฆาตกรรม" : mk === "empty" ? "ห้องว่าง" : mk === "closed" ? "ปิดปรับปรุง" : "ประชาทัณฑ์"}
            </span>
          )}
        </button>,
      );
    }
    rows.push(
      <div className="floor" key={f}>
        <div className="flabel"><span>ชั้น</span><b>{f}</b></div>
        {cells}
      </div>,
    );
  }
  return (
    <div className="board">
      {rows}
      <div className="cols"><span /><span>แถว 1</span><span>แถว 2</span><span>แถว 3</span></div>
    </div>
  );
}

export function DayTrack({ day, max }: { day: number; max: number }) {
  return (
    <div className="daytrack">
      {Array.from({ length: max }, (_, i) => i + 1).map((d) => (
        <span key={d} className={d < day ? "past" : d === day ? "now" : ""}>{["I", "II", "III", "IV", "V"][d - 1]}</span>
      ))}
    </div>
  );
}

export function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="overlay">
      <div className="inner">
        {children}
        <button className="btn block" style={{ marginTop: 16 }} onClick={onClose}>ปิด</button>
      </div>
    </div>
  );
}

const ORDER: RoleKey[] = [...(Object.keys(ROLES) as RoleKey[]).filter((k) => k !== "guest").sort((a, b) => ROLES[a].order - ROLES[b].order), "guest"];

export function Rules() {
  return (
    <div className="rules">
      <h2>วิธีเล่น ชายชุดดำ</h2>
      <p>ในตึกพักอาศัยลึกลับ ชายชุดดำแฝงตัวอยู่ในหมู่ผู้เช่า ทุกคนรู้แค่ห้องของตัวเอง ต้องรวบรวมเบาะแสจากความสามารถตอนกลางคืน แล้วโหวตบุกห้องที่สงสัยตอนกลางวัน</p>
      <h3>ฝ่าย</h3>
      <ul>
        <li><b style={{ color: COLOR.good }}>ผู้เช่า</b> ชนะเมื่อประชาทัณฑ์ฆาตกรได้</li>
        <li><b style={{ color: COLOR.neutral }}>คนเมา</b> (ฝ่ายเดียวโดดๆ ใช้กับ 9 คน) ชนะทันทีถ้าถูกประชาทัณฑ์ ต้องทำตัวให้น่าสงสัย</li>
        <li><b style={{ color: COLOR.evil }}>เงามืด</b> (ฆาตกร + ผู้ช่วย) ชนะเมื่อครบจำนวนวันแล้วฆาตกรยังรอด หรือผู้เช่าที่รอดเหลือไม่มากกว่าฝ่ายเงามืด</li>
      </ul>
      <h3>เตรียมเกม</h3>
      <ul>
        <li>ทุกคนเปิดเว็บบนมือถือตัวเอง เข้าห้องด้วยรหัส 4 ตัวอักษร</li>
        <li>ตึกมีชั้นเท่ากับจำนวนผู้เล่น ชั้นละ 3 ห้อง และสุ่มปิดปรับปรุง (ผู้เล่น − 4) ห้อง เช่น 5 คนปิด 1 ห้อง 7 คนปิด 3 ห้อง</li>
        <li>แต่ละคนได้การ์ดบทบาท 1 ใบ และคีย์การ์ดห้อง 1 ใบ ห้องที่เหลือเป็นห้องว่าง ห้องปิดปรับปรุงไม่มีใครพักและเลือกไม่ได้</li>
        <li>ฆาตกรและผู้ช่วยรู้ชื่อกันและกัน แต่ไม่รู้ห้องของกัน</li>
      </ul>
      <h3>กลางคืน (3 ช่วง)</h3>
      <ol>
        <li><b>ช่วงสืบ</b>: คนเมา ช่างกุญแจ แม่บ้าน ช่างเช็ดกระจก นักสืบ เลือกพร้อมกันบนเครื่องตัวเอง ดูผล แล้วกด &quot;เรียบร้อย&quot;</li>
        <li><b>ช่วงลงมือ</b>: ผู้ช่วยสืบก่อน ฆาตกรเห็นผลของผู้ช่วย แล้วเลือกห้องที่จะลงมือ</li>
        <li><b>ช่วงพยาน</b>: หลังฆาตกรลงมือ พยานเลือกเฝ้า 1 ชั้น</li>
      </ol>
      <table className="roles"><tbody>
        {ORDER.map((k) => (
          <tr key={k}>
            <td>{ROLES[k].stage || "-"}</td>
            <td style={{ color: COLOR[ROLES[k].team] }}><b>{ROLES[k].en}</b><br />{ROLES[k].th}</td>
            <td>{ROLES[k].desc}</td>
          </tr>
        ))}
      </tbody></table>
      <p className="small muted" style={{ marginTop: 8 }}>ช่วงที่ไม่มีใครทำได้ (เช่นพยานตายแล้ว) ระบบจะรอเวลาสุ่มสั้นๆ เพื่อไม่ให้ใครเดาได้</p>
      <h3>เช้า</h3>
      <ul>
        <li>ฆาตกรบุกห้องที่มีคน และห้องไม่ถูกล็อก: ผู้พักห้องนั้นตาย ห้องติดป้าย <b>ฆาตกรรม</b></li>
        <li>บุกห้องว่าง: ห้องนั้นติดป้าย <b>ห้องว่าง</b></li>
        <li>ห้องถูกล็อก: คืนนั้นสงบ ไม่มีใครรู้ว่าบุกห้องไหน</li>
      </ul>
      <h3>กลางวัน</h3>
      <ul>
        <li>คุยกันตามเวลาที่ตั้งไว้ จะพูดจริงหรือโกหกก็ได้</li>
        <li>ผู้เล่นที่ยังอยู่โหวต <b>ห้อง</b> บนเครื่องตัวเอง ห้องที่ได้เสียงมากสุดถูก <b>ประชาทัณฑ์</b> (เสมอ = ไม่ประชาทัณฑ์)</li>
        <li>ผู้เล่นที่ตายแล้วห้ามพูดและห้ามโหวต</li>
      </ul>
    </div>
  );
}
