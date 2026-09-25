"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Segoe UI, sans-serif", margin: 0, background: "#f4efe6", color: "#1a1612" }}>
        <main style={{ maxWidth: 32 * 16, margin: "0 auto", padding: "4rem 1.25rem" }}>
          <h1 style={{ fontSize: "2.25rem" }}>BilloAI hit a problem</h1>
          <p>The page could not be shown. Your notes were not displayed here.</p>
          <button type="button" onClick={reset} style={{ marginTop: "1.5rem", border: 0, borderRadius: 999, background: "#0b6b4f", color: "#f4fff9", padding: "0.75rem 1rem", fontWeight: 600 }}>
            Try again
          </button>
          <p style={{ marginTop: "1.5rem" }}>
            Email <a href="mailto:blaisemu007@gmail.com">blaisemu007@gmail.com</a> if it keeps happening.
          </p>
        </main>
      </body>
    </html>
  );
}
