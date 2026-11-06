import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ชายชุดดำ — Men in Black",
  description: "เกมสืบสวนหาฆาตกรในตึก เล่นออนไลน์คนละเครื่องผ่านมือถือ",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
