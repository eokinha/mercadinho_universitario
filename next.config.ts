import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Origem do Supabase (API, Auth, Storage e Realtime). Sem a variável na build, aceita qualquer projeto.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "") || "https://*.supabase.co";
const supabaseWs = supabaseUrl.replace(/^https:/, "wss:");

// Imagens de demonstração (SecaoTrocas) e avatar do modo ?preview=1 (só dev)
const imagensExternas = ["https://images.unsplash.com", ...(isDev ? ["https://api.dicebear.com"] : [])];

// Google Analytics (GA4, _app.tsx): domínios exigidos pelo gtag
const googleTag = "https://*.googletagmanager.com";
const googleAnalytics = "https://*.google-analytics.com https://*.analytics.google.com";

const csp = [
  "default-src 'self'",
  // 'unsafe-eval' só no dev (React Refresh); 'unsafe-inline' cobre os scripts inline que o Next injeta
  // (bootstrap do Turbopack e o snippet do gtag)
  `script-src 'self' 'unsafe-inline' ${googleTag}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseUrl} ${imagensExternas.join(" ")} ${googleTag} ${googleAnalytics}`,
  "font-src 'self' data:",
  // api.pwnedpasswords.com: checagem de senha vazada (src/lib/senha-vazada.ts)
  `connect-src 'self' ${supabaseUrl} ${supabaseWs} https://api.pwnedpasswords.com ${googleTag} ${googleAnalytics}${isDev ? " ws://localhost:*" : ""}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const headersSeguranca = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: headersSeguranca }];
  },
};

export default nextConfig;
