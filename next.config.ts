import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Evita que la página sea embebida en iframes (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },

          // Evita que el browser "adivine" el tipo de archivo
          { key: "X-Content-Type-Options", value: "nosniff" },

          // No manda el referrer a sitios externos
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Deshabilita features del browser que no usamos
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },

          // HSTS — solo en producción, fuerza HTTPS por 1 año
          ...(isProd
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),

          // CSP — Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js con Turbopack necesita unsafe-inline y unsafe-eval en dev
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              // Imágenes externas permitidas (URLs de platos del menú)
              "img-src 'self' data: https:",
              // SSE y fetch al mismo origen
              "connect-src 'self'",
              "font-src 'self'",
              // Nunca permitir embeber esta app en un iframe
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
