const DDI_BRASIL = "55";

export function normalizarTelefone(raw: string): string {
  const digitos = raw.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) {
    return `${DDI_BRASIL}${digitos}`;
  }
  return digitos;
}

export function linkWhatsapp(raw: string): string {
  return `https://wa.me/${normalizarTelefone(raw)}`;
}

export function formatarTelefone(raw: string): string {
  const completo = normalizarTelefone(raw);
  if (completo.length < 12) return raw;

  const ddi = completo.slice(0, 2);
  const ddd = completo.slice(2, 4);
  const restante = completo.slice(4);

  if (restante.length === 9) {
    return `+${ddi} (${ddd}) ${restante.slice(0, 5)}-${restante.slice(5)}`;
  }
  if (restante.length === 8) {
    return `+${ddi} (${ddd}) ${restante.slice(0, 4)}-${restante.slice(4)}`;
  }
  return `+${ddi} (${ddd}) ${restante}`;
}
