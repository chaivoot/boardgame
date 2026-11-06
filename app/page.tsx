import Link from "next/link";

export default function Home() {
  return (
    <main id="app">
      <h1>Board Games</h1>
      <p className="muted">เกมกระดานออนไลน์สำหรับฝึกซ้อม</p>
      <Link href="/meninblack" className="panel" style={{ display: "block", color: "inherit", textDecoration: "none", marginTop: 16 }}>
        <h2>ชายชุดดำ — Men in Black</h2>
        <span className="muted small">เกมสืบสวนหาฆาตกรในตึก 4–9 คน เล่นออนไลน์คนละเครื่อง</span>
      </Link>
    </main>
  );
}
