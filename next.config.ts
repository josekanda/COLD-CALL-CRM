import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Épingle la racine au dossier du projet (plusieurs lockfiles détectés en amont).
  turbopack: {
    root: path.resolve(__dirname),
  },
  // En-têtes de sécurité (défense en profondeur — l'app n'a pas de backend).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
