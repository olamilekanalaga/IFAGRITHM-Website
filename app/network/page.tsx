import { Suspense } from "react";
import type { Metadata } from "next";
import CardStudio from "@/components/CardStudio";

export const metadata: Metadata = {
  title: "Card Studio — IFAGRITHM Research Network",
  description: "Internal preview of the IFAGRITHM network member card.",
  robots: { index: false, follow: false },
};

export default function NetworkPage() {
  return (
    <Suspense fallback={null}>
      <CardStudio />
    </Suspense>
  );
}
