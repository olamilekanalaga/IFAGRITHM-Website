import type { Metadata } from "next";
import ApplicationForm from "@/components/ApplicationForm";

export const metadata: Metadata = {
  title: "Join the research network — IFAGRITHM",
  description:
    "Apply to join the IFAGRITHM research network — Research Scouts and Research Analysts working investigations across consumer apps, DeFi, RWA and infrastructure.",
  alternates: { canonical: "/application" },
  openGraph: { title: "Join the IFAGRITHM research network", description: "We are building a network of Research Scouts and Research Analysts. Apply in 5–10 minutes.", type: "website", url: "/application" },
};

export default function ApplicationPage() {
  return <ApplicationForm />;
}
