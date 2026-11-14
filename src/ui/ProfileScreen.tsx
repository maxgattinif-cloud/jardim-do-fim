import { useState } from "react";
import { Btn, Screen } from "./common";
import { useSave } from "./SaveContext";

export function ProfileScreen({ onComplete }: { onComplete: () => void }) {
  const { save, register } = useSave();
  const [name, setName] = useState(save.name === "Guardião" ? "" : save.name);
  const [error, setError] = useState("");

  const submit = () => {
    const clean = name.trim();
    if (clean.length < 2) {
      setError("Digite um nome com pelo menos 2 caracteres.");
      return;
    }
    if (register(clean)) onComplete();
    else setError("Não foi possível salvar esse nome. Tente novamente.");
  };

  return (
    <Screen title="Seu perfil" subtitle="Escolha um nome para identificar e salvar seu progresso." wide>
      <div className="glass mx-auto mt-8 w-full max-w-md rounded-2xl p-5">
        <div className="text-center text-5xl">🌱</div>
        <label className="mt-4 block text-sm font-bold text-white/75" htmlFor="player-name">Nome do jogador</label>
        <input
          id="player-name"
          autoFocus
          maxLength={16}
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Como quer aparecer no jogo?"
          className="mt-2 w-full rounded-xl bg-black/40 px-4 py-3 text-center text-lg font-bold ring-1 ring-white/20 outline-none focus:ring-[#2ee6c5]"
        />
        {error && <p className="mt-2 text-center text-xs text-red-300">{error}</p>}
        <Btn big className="mt-4 w-full" onClick={submit}>Salvar perfil e jogar</Btn>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-white/45">Não é necessário e-mail nem senha. O progresso fica salvo neste navegador e neste aparelho.</p>
      </div>
    </Screen>
  );
}
