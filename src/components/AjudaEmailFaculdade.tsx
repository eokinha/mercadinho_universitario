import { useId, useState } from "react";
import GuiaEmail from "@/components/GuiaEmail";
import { guiaDaInstituicao } from "@/lib/guias-email";
import type { Instituicao } from "@/types";

interface Props {
  instituicoes: Instituicao[];
}

// O aluno escolhe a faculdade e vê como achar e abrir o e-mail institucional
export default function AjudaEmailFaculdade({ instituicoes }: Props) {
  const idSelect = useId();
  const [instituicaoId, setInstituicaoId] = useState<number | null>(null);
  const escolhida = instituicoes.find((i) => i.id === instituicaoId) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={idSelect} className="block text-sm font-semibold text-tinta mb-1">
          Sua faculdade
        </label>
        <select
          id={idSelect}
          value={instituicaoId ?? ""}
          onChange={(e) => setInstituicaoId(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-4 py-2.5 text-sm border border-borda-controle rounded-controle bg-superficie focus:ring-2 focus:ring-petroleo outline-none min-h-[44px]"
        >
          <option value="">Escolha a faculdade</option>
          {instituicoes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
      </div>

      {escolhida && (
        <div aria-live="polite">
          <GuiaEmail guia={guiaDaInstituicao(escolhida.dominios)} dominios={escolhida.dominios ?? []} />
        </div>
      )}
    </div>
  );
}
