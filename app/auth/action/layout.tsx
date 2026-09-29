import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMeta({
    title: "Email link",
    description: "Finish verifying your email or resetting your password.",
    path: "/auth/action",
    index: false,
  }),
};

export default function AuthActionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
