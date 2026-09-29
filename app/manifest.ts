import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BilloAI",
    short_name: "BilloAI",
    description: "After you network, know who from the room is worth staying connected to.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#f4efe6",
    theme_color: "#0b6b4f",
    icons: [
      { src: "/brand/mark.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
