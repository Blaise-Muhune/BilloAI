import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { privatePageMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...privatePageMeta,
  title: {
    default: "Home",
    template: "%s · BilloAI",
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
