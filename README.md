# boardgame

เกมกระดานออนไลน์สำหรับฝึกซ้อม (Next.js) · https://boardgame.chaivoot.com

## ชายชุดดำ (Men in Black) — `/meninblack`

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
npm run dev   # http://localhost:3000/meninblack
npm test      # จำลองเล่น 400 เกม เช็คว่ากติกาไม่ค้าง
```
ถ้าไม่ได้ตั้ง Redis ระบบจะเก็บห้องในหน่วยความจำแทน ใช้ได้เฉพาะตอน dev

## Deploy บน Vercel
1. Import repo · Framework Preset: **Next.js**
2. **Storage** → สร้าง Redis (Upstash หรือ Redis ตัวไหนก็ได้) แล้ว connect เข้าโปรเจกต์ ระบบรองรับ env ทุกแบบต่อไปนี้
   - `KV_REST_API_URL` + `KV_REST_API_TOKEN` หรือ `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
   - `REDIS_URL` หรือ `KV_URL`
3. Redeploy แล้วเปิด `/api/meninblack/health` ต้องเห็น `"ok":true` และ `backend` ไม่ใช่ `memory`
4. เล่นที่ `https://<project>.vercel.app/meninblack`

### Region
`vercel.json` กำหนดให้ server รันที่ `sin1` (สิงคโปร์) ให้อยู่ที่เดียวกับฐานข้อมูล Upstash ถ้าย้ายฐานข้อมูลไป region อื่น ให้แก้ตรงนี้ตาม

### โดเมน
ผูก custom domain `boardgame.chaivoot.com` ที่โปรเจกต์ boardgame บน Vercel (Settings → Domains)
แล้วเพิ่ม DNS record ตามที่ Vercel บอก เกมจะอยู่ที่ `https://boardgame.chaivoot.com/meninblack`
