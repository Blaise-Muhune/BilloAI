import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMeta({
    title: "Create your account",
    description: "Start with your first event. Matching is included. No payment to start. You send every message.",
    path: "/signup",
    index: false,
  }),
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
