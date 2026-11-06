export type RoleKey =
  | "drunk"
  | "keymaster"
  | "housekeeper"
  | "windowcleaner"
  | "detective"
  | "accomplice"
  | "murderer"
  | "witness"
  | "guest";

export type Team = "good" | "evil" | "neutral";
export type ActKind = "player" | "room" | "floor" | "col" | null;

export interface RoleDef {
  order: number;
  stage: 0 | 1 | 2 | 3;
  en: string;
  th: string;
  team: Team;
  act: ActKind;
  desc: string;
}

export const ROLES: Record<RoleKey, RoleDef> = {
  drunk: { order: 1, stage: 1, en: "DRUNK", th: "คนเมา", team: "neutral", act: "player",
    desc: "ฝ่ายเดียวโดดๆ: ชนะทันทีถ้าถูกประชาทัณฑ์ตอนกลางวัน · ครั้งเดียวต่อเกม เลือกผู้เล่น 1 คนเพื่อสลับห้องกัน (สลับก่อนฆาตกรลงมือ)" },
  keymaster: { order: 2, stage: 1, en: "KEYMASTER", th: "ช่างกุญแจ", team: "good", act: "room",
    desc: "เลือกล็อก 1 ห้อง ห้องนั้นปลอดภัยจากฆาตกรในคืนนั้น (ห้ามล็อกห้องเดิมซ้ำกับคืนก่อน)" },
  housekeeper: { order: 3, stage: 1, en: "HOUSEKEEPER", th: "แม่บ้าน", team: "good", act: "floor",
    desc: "เลือกตรวจ 1 ชั้น เพื่อรู้ว่าชั้นนั้นมีผู้รอดชีวิตกี่คน" },
  windowcleaner: { order: 4, stage: 1, en: "WINDOW CLEANER", th: "ช่างเช็ดกระจก", team: "good", act: "col",
    desc: "เลือกตรวจ 1 แถวแนวตั้ง เพื่อรู้ว่าแถวนั้นมีผู้รอดชีวิตกี่คน" },
  detective: { order: 5, stage: 1, en: "DETECTIVE", th: "นักสืบ", team: "good", act: "player",
    desc: "เลือกผู้เล่น 1 คน เพื่อรู้ว่าเขาพักอยู่ชั้นไหน" },
  accomplice: { order: 6, stage: 2, en: "ACCOMPLICE", th: "ผู้ช่วย", team: "evil", act: "player",
    desc: "ฝ่ายฆาตกร เลือกผู้เล่น 1 คนเพื่อรู้ว่าเขาพักอยู่ชั้นไหน ฆาตกรจะเห็นข้อมูลนี้ด้วย" },
  murderer: { order: 7, stage: 2, en: "MURDERER", th: "ฆาตกร", team: "evil", act: "room",
    desc: "เลือก 1 ห้องเพื่อลงมือฆาตกรรมในคืนนั้น (ถ้ามีผู้ช่วย ต้องรอผู้ช่วยสืบก่อน)" },
  witness: { order: 8, stage: 3, en: "WITNESS", th: "พยาน", team: "good", act: "floor",
    desc: "หลังฆาตกรลงมือ เลือกเฝ้า 1 ชั้น ถ้าฆาตกรลงมือในชั้นนั้น จะรู้ว่าห้องของฆาตกรอยู่สูงกว่า ต่ำกว่า หรือชั้นเดียวกัน" },
  guest: { order: 0, stage: 0, en: "GUEST", th: "แขก", team: "good", act: null,
    desc: "ไม่มีความสามารถตอนกลางคืน ใช้การสังเกตและเหตุผลช่วยฝ่ายผู้เช่า" },
};

export const SPECIAL: RoleKey[] = [
  "murderer", "accomplice", "detective", "keymaster", "housekeeper", "windowcleaner", "witness", "drunk",
];

export const PRESET: Record<number, RoleKey[]> = {
  4: ["murderer", "detective", "keymaster", "housekeeper"],
  5: ["murderer", "detective", "keymaster", "housekeeper", "witness"],
  6: ["murderer", "accomplice", "detective", "keymaster", "housekeeper", "witness"],
  7: ["murderer", "accomplice", "detective", "keymaster", "housekeeper", "witness", "windowcleaner"],
  8: ["murderer", "accomplice", "detective", "keymaster", "housekeeper", "witness", "windowcleaner"],
  9: ["murderer", "accomplice", "detective", "keymaster", "housekeeper", "witness", "windowcleaner", "drunk"],
};

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 9;
/** One floor per player, 3 rooms per floor; (players − 4) random empty rooms become "body found" rooms. */
export const floorsFor = (n: number) => Math.max(2, Math.min(MAX_FLOORS, n));
export const closedFor = (n: number) => Math.max(0, n - 4);
export const MAX_FLOORS = 9;
export const daysFor = (n: number) => (n <= 4 ? 2 : n <= 6 ? 3 : 4);
export const COLOR: Record<Team, string> = { good: "#5ad1c8", evil: "#ff5a5f", neutral: "#f2b84b" };
export const floorOf = (room: number) => Math.floor(room / 100);
export const colOf = (room: number) => room % 100;
