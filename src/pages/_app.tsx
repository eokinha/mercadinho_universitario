import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Plus_Jakarta_Sans } from "next/font/google";
import Head from "next/head";
import Script from "next/script";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { tituloDaRota } from "@/lib/titulos";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-jakarta",
});

export default function App({ Component, pageProps, router }: AppProps) {
  return (
    <div className={`${jakarta.variable} font-sans min-h-screen flex flex-col bg-pagina text-tinta`}>
      {/* Título padrão da rota; o <title> da própria página (anúncio, perfil, painel) tem prioridade */}
      <Head>
        <title>{tituloDaRota(router.pathname)}</title>
      </Head>
      {/* Google Analytics (GA4) */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-7HJT8QR82M"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-7HJT8QR82M');
        `}
      </Script>
      <Navbar />
      <main className="flex-1">
        <Component {...pageProps} />
      </main>
      <Footer />
    </div>
  );
}
