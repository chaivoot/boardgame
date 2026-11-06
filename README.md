# boardgame

เว็บเกมกระดานสำหรับฝึกซ้อม เป็นไฟล์ static ล้วน (ไม่ต้อง build)

## ชายชุดดำ (Men in Black) — `/meninblack/`

เกมสืบสวนหาฆาตกรในตึก 4–9 คน ใช้มือถือเครื่องเดียว

- แจกการ์ดบทบาทและคีย์การ์ดห้องแบบส่งเครื่องต่อกัน
- กลางคืนแอปเรียกบทบาทตามลำดับ มีเสียงพากย์ภาษาไทย (Web Speech API) จะมีคนดำเนินเกมหรือไม่มีก็ได้
- บทบาทที่ตายแล้วยังถูกเรียกและรอเวลาสุ่ม คนอื่นจึงเดาไม่ได้
- กลางวันมีกระดานสาธารณะ ตัวจับเวลา และโหวตประชาทัณฑ์ทีละห้อง
- จบเกมแล้วเฉลยบทบาทและย้อนดูทุกคืนได้ ใช้ทบทวนหลังซ้อม
- เกมที่ค้างอยู่ถูกเก็บใน `localStorage` เผลอรีเฟรชก็เล่นต่อได้

บทบาท: Murderer, Accomplice, Detective, Keymaster, Housekeeper, Window Cleaner, Witness, Drunk, Guest

กราฟิกการ์ดทั้งหมดเป็น SVG ที่วาดขึ้นใหม่

## Deploy

เปิด GitHub Pages ของ repo นี้ (Settings → Pages → Deploy from branch, root)
ถ้า user site (`chaivoot.github.io`) ตั้ง custom domain เป็น `chaivoot.com` ไว้ เกมจะอยู่ที่
`https://chaivoot.com/boardgame/meninblack/`
