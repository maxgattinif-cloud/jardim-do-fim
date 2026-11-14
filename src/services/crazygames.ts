/** Integração com CrazyGames HTML5 SDK v3. O jogo continua funcional fora da plataforma. */
import { sound } from "../game/sound";

type CrazyGamesSettings = { muteAudio?: boolean; disableChat?: boolean };
type CrazyGamesDataStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};
type CrazyGamesSdk = {
  init: () => Promise<void>;
  environment?: string;
  data?: CrazyGamesDataStore;
  game: {
    gameplayStart: () => void;
    gameplayStop: () => void;
    loadingStart: () => void;
    loadingStop: () => void;
    settings?: CrazyGamesSettings;
    addSettingsChangeListener?: (listener: (settings: CrazyGamesSettings) => void) => void;
    removeSettingsChangeListener?: (listener: (settings: CrazyGamesSettings) => void) => void;
  };
};

declare global {
  interface Window { CrazyGames?: { SDK?: CrazyGamesSdk } }
}

let sdkReady: Promise<CrazyGamesSdk | null> | null = null;
let gameplayState: boolean | null = null;
let gameplaySent: boolean | null = null;
let loadingFinished = false;

export function initializeCrazyGamesSdk(): Promise<CrazyGamesSdk | null> {
  if (sdkReady) return sdkReady;
  sdkReady = (async () => {
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) return null;
    try {
      // O ambiente é consultável antes do init. Evita chamar métodos do SDK
      // em domínios externos, onde a própria CrazyGames o declara desativado.
      if (sdk.environment === "disabled") return null;
      await sdk.init();
      if (sdk.environment === "disabled") return null;
      sdk.game.loadingStart();
      const applySettings = (settings: CrazyGamesSettings) => {
        if (typeof settings.muteAudio === "boolean") sound.setMuted(settings.muteAudio);
      };
      applySettings(sdk.game.settings ?? {});
      sdk.game.addSettingsChangeListener?.(applySettings);
      return sdk;
    } catch (error) {
      console.warn("CrazyGames SDK indisponível; o jogo seguirá normalmente.", error);
      return null;
    }
  })();
  return sdkReady;
}

export async function finishCrazyGamesLoading(): Promise<void> {
  if (loadingFinished) return;
  const sdk = await initializeCrazyGamesSdk();
  if (!sdk || loadingFinished) return;
  try {
    sdk.game.loadingStop();
    loadingFinished = true;
  } catch (error) {
    console.warn("Não foi possível encerrar o evento de carregamento da CrazyGames.", error);
  }
}

export async function setCrazyGamesGameplay(active: boolean): Promise<void> {
  gameplayState = active;
  const sdk = await initializeCrazyGamesSdk();
  if (!sdk || gameplayState !== active || gameplaySent === active) return;
  // Não envia gameplayStop antes de qualquer gameplayStart.
  if (!active && gameplaySent !== true) return;
  try {
    if (active) sdk.game.gameplayStart();
    else sdk.game.gameplayStop();
    gameplaySent = active;
  } catch (error) {
    console.warn("Não foi possível atualizar o estado de gameplay da CrazyGames.", error);
  }
}
