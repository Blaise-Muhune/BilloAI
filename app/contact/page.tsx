import type { Metadata } from "next";
import { BrandHomeLink } from "@/components/brand";
import { ContactForm } from "@/components/contact-form";
import { JsonLd } from "@/components/json-ld";
import { SkipLink } from "@/components/skip-link";
import { SITE_NAME, breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  description: "Write BilloAI about billing, a seat, or the product. We reply to the email you enter.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <SkipLink />
      <main id="main" className="mx-auto max-w-lg space-y-4 px-5 py-12">
        <JsonLd
          data={breadcrumbJsonLd([
            { name: "BilloAI", path: "/" },
            { name: "Contact", path: "/contact" },
          ])}
        />
        <BrandHomeLink />
        <h1 className="serif pt-4 text-4xl">Contact {SITE_NAME}</h1>
        <p className="text-muted">
          Billing, a seat, or the product. This is not for people you met — we never email them. We reply to the address
          you put below.
        </p>
        <ContactForm />
      </main>
    </>
  );
}
