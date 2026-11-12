import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initializeCrazyGamesSdk } from "./services/crazygames";

// Aguarda a inicialização do SDK antes de montar o jogo. Fora da CrazyGames,
// a integração retorna sem bloquear a inicialização normal.
async function boot() {
  await initializeCrazyGamesSdk();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void boot();
