import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Needle",
    short_name: "Needle",
    description: "每天读一张经典专辑。",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#111111",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
