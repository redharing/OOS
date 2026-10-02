import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OOS · Our Oasis",
    short_name: "OOS",
    description: "ติดตามระดับน้ำ ขอความช่วยเหลือ และช่วยเหลือกันเมื่อเกิดภัย",
    lang: "th",
    start_url: "/",
    display: "standalone",
    background_color: "#F3F6F5",
    theme_color: "#0B5C7A",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
