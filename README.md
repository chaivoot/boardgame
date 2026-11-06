# boardgame

เกมกระดานออนไลน์สำหรับฝึกซ้อม (Next.js) · ทุกหน้าอยู่ใต้ `basePath: /boardgame`

## ชายชุดดำ (Men in Black) — `/boardgame/meninblack`

เกมสืบสวนหาฆาตกรในตึก 4–9 คน เล่นออนไลน์ แต่ละคนใช้มือถือตัวเอง

- เจ้าของห้องสร้างห้อง ได้รหัส 4 ตัวอักษร คนอื่นเข้าด้วยรหัสหรือลิงก์
- กลางคืนมี 3 ช่วง
  1. **ช่วงสืบ** — คนเมา ช่างกุญแจ แม่บ้าน ช่างเช็ดกระจก นักสืบ เลือกพร้อมกัน แล้วกด "เรียบร้อย"
  2. **ช่วงลงมือ** — ผู้ช่วยสืบก่อน ฆาตกรเห็นผลของผู้ช่วย แล้วเลือกห้อง
  3. **ช่วงพยาน** — หลังฆาตกรลงมือ พยานเลือกชั้นที่จะเฝ้า
- ถึงตาใคร เครื่องคนนั้นจะสั่น
- กลางวันมีตัวจับเวลา หมดเวลาแล้วเปิดโหวตอัตโนมัติ ทุกคนโหวตห้องบนเครื่องตัวเอง
- จบเกมแล้วเฉลยบทบาท และย้อนดูทุกคืนได้
- server เป็นคนตัดสินทุกอย่าง แต่ละเครื่องได้รับเฉพาะข้อมูลที่ตัวเองควรเห็น

กราฟิกการ์ดเป็น SVG ที่วาดขึ้นใหม่ทั้งหมด

### โครงสร้าง
- `lib/meninblack/engine.ts` — กติกาทั้งหมด (pure TS)
- `lib/meninblack/view.ts` — ตัดข้อมูลให้ผู้เล่นแต่ละคน
- `lib/meninblack/store.ts` — เก็บห้องใน Upstash Redis (มี optimistic locking)
- `app/api/meninblack/...` — API · client poll ทุก 1.2 วินาที
- `app/meninblack/...` — หน้าจอ

## รันในเครื่อง
```bash
npm install
npm run dev   # http://localhost:3000/boardgame/meninblack
npm test      # จำลองเล่น 400 เกม เช็คว่ากติกาไม่ค้าง
```
ถ้าไม่ได้ตั้ง Redis ระบบจะเก็บห้องในหน่วยความจำแทน ใช้ได้เฉพาะตอน dev

## Deploy บน Vercel
1. Import repo · Framework Preset: **Next.js**
2. **Storage → Marketplace → Upstash (Redis)** แล้ว connect เข้าโปรเจกต์ (จะได้ env `KV_REST_API_URL` / `KV_REST_API_TOKEN`)
   หรือตั้ง `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` เอง
3. Redeploy · เปิด `https://<project>.vercel.app/boardgame/meninblack`

### ให้อยู่ใต้ chaivoot.com (เว็บหลัก Astro)
เพิ่มใน `vercel.json` ของโปรเจกต์ Astro:
```json
{
  "rewrites": [
    { "source": "/boardgame", "destination": "https://<project>.vercel.app/boardgame" },
    { "source": "/boardgame/:path*", "destination": "https://<project>.vercel.app/boardgame/:path*" }
  ]
}
```
