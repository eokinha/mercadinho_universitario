import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="bg-petroleo-900 text-white mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <div className="flex flex-col items-center sm:items-start gap-1">
          <Logo cor="branco" />
          <p className="text-white/80">Circular. Economia comunitária.</p>
        </div>
        <p className="text-white/80">© 2026 Circular · Termos · Políticas · Privacidade</p>
      </div>
    </footer>
  );
}
