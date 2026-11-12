/**
 * PREPARAÇÃO COMERCIAL — nada aqui está ativo.
 *
 * Todos os recursos abaixo estão DESLIGADOS por padrão e não carregam código de terceiros,
 * não fazem requisições e não coletam dados pessoais. Para ativar no futuro é preciso:
 *   1. autorização expressa do titular do projeto;
 *   2. um provedor real implementando as interfaces abaixo;
 *   3. consentimento do jogador (já existe `save.adsConsent`) e política de privacidade.
 *
 * Regras de equilíbrio (obrigatórias):
 *   - Compras só podem vender COSMÉTICOS (auras, efeitos de projétil, molduras) e expansões de conteúdo.
 *   - Nenhum item pago pode alterar dano, vida, custo, alcance, recarga, sementes ou dificuldade.
 *   - Anúncios nunca aparecem durante a partida: apenas na tela de resultado ou no menu.
 *   - Anúncio com recompensa é sempre opcional.
 */

export const FEATURES = {
  rewardedAds: false,
  interstitialAds: false,
  purchases: false,
  onlineRanking: false,
  analytics: false,
} as const;

/** Onde um anúncio pode (ou não) aparecer. */
export type AdPlacement = "result_screen" | "main_menu" | "reward_double";
export const FORBIDDEN_AD_MOMENTS = ["in_match", "wave_incoming", "boss_fight", "tutorial"] as const;

export interface AdProvider {
  isReady(placement: AdPlacement): boolean;
  /** Resolve true se o jogador assistiu até o fim e deve receber a recompensa. */
  showRewarded(placement: AdPlacement): Promise<boolean>;
  showInterstitial(placement: AdPlacement): Promise<void>;
}

export interface PurchaseItem {
  sku: string;
  cosmeticId?: string;
  title: string;
  priceLabel: string;
}
export interface PurchaseProvider {
  list(): Promise<PurchaseItem[]>;
  buy(sku: string): Promise<{ ok: boolean; receipt?: string }>;
  restore(): Promise<string[]>;
}

export interface RankingProvider {
  submit(entry: { name: string; level: number; score: number }): Promise<void>;
  top(level: number): Promise<{ name: string; score: number }[]>;
}

const disabledAds: AdProvider = {
  isReady: () => false,
  showRewarded: async () => false,
  showInterstitial: async () => undefined,
};

let adProvider: AdProvider = disabledAds;
let purchaseProvider: PurchaseProvider | null = null;

export const monetization = {
  /** Só registra o provedor se a respectiva funcionalidade estiver habilitada em FEATURES. */
  registerAds(p: AdProvider) {
    if (FEATURES.rewardedAds || FEATURES.interstitialAds) adProvider = p;
  },
  registerPurchases(p: PurchaseProvider) {
    if (FEATURES.purchases) purchaseProvider = p;
  },
  canShowRewarded: (placement: AdPlacement, consent: boolean | null) => FEATURES.rewardedAds && consent === true && adProvider.isReady(placement),
  showRewarded: (placement: AdPlacement) => adProvider.showRewarded(placement),
  hasStore: () => FEATURES.purchases && purchaseProvider !== null,
};
