import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMeta({
    title: "Sign in",
    description: "Sign in to BilloAI. Your network stays on this account.",
    path: "/login",
    index: false,
  }),
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
