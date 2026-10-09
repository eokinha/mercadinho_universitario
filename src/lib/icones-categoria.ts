import {
  BookOpen,
  Cpu,
  FlaskConical,
  Hammer,
  Home,
  Palette,
  Repeat,
  Shirt,
  Tag,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// Ícone Lucide por palavra-chave do nome (o design system não usa emojis)
export function iconeParaCategoria(nome: string): LucideIcon {
  const n = nome.toLowerCase();
  if (n.includes("livro") || n.includes("acadêm") || n.includes("apostila")) return BookOpen;
  if (n.includes("tecnolog") || n.includes("eletrôn")) return Cpu;
  if (n.includes("curso")) return FlaskConical;
  if (n.includes("moda") || n.includes("brechó") || n.includes("roupa")) return Shirt;
  if (n.includes("moradia") || n.includes("casa")) return Home;
  if (n.includes("aliment") || n.includes("bebida")) return Utensils;
  if (n.includes("papelaria") || n.includes("arte")) return Palette;
  if (n.includes("serviço")) return Wrench;
  if (n.includes("troca")) return Repeat;
  if (n.includes("engenharia")) return Hammer;
  return Tag;
}
