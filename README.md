# Jardim do Fim — Edição 3.0

Jogo original de estratégia e defesa de território, preparado nesta etapa para experiência solo. **50 fases em 5 mundos**, **51 defensores**, **49 inimigos** (9 chefes), tabuleiros dinâmicos, eventos sinalizados, combinações entre plantas, evolução até nível 5 e funções de equipe.

Toda a arte e todos os sons são gerados por código: sem imagens, fontes ou áudios de terceiros.

## Compilação automática
O projeto inclui um fluxo do GitHub Actions em `.github/workflows/build-game.yml`. Ao enviar o código para um repositório GitHub, o fluxo instala as dependências, verifica o TypeScript, compila o jogo e publica `dist/` como artefato para baixar. Isso permite fazer a compilação em um ambiente com acesso ao npm, sem depender do computador local.

## Como rodar
```
npm install
npm run dev        # desenvolvimento
npm run build      # gera dist/index.html (arquivo único, funciona offline)
```
No jogo: **Configurações → Baixar o jogo (.html)** e **Código-fonte (.zip)**. O backup lógico da versão 1.0 está em `public/backup-jardim-v1.zip`.

## Conteúdo
| Item | Quantidade |
|---|---|
| Fases | 50 (5 mundos × 10) |
| Mundos | Vale das Sementes, Pântano das Sombras, Floresta Mutante, Deserto das Cinzas, Dimensão do Caos |
| Chefes de mundo | Guardião Apodrecido (10), Rei do Lodo (20), Titã das Raízes (30), Colosso das Cinzas (40), Devorador dos Mundos (50) |
| Defensores | 51 (13 originais preservados + 38 novos), 5 classes, 4 raridades, 5 níveis |
| Inimigos | 49 (14 originais preservados + 35 novos), 8 classes, traços próprios |
| Sinergias | 7 combinações com regras e efeitos reais |
| Papéis previstos para o multiplayer futuro | 6 (Comandante, Agricultor, Atirador, Curandeiro, Guarda, Tático) |

Cada fase tem: tabuleiro determinístico próprio (água, lava, gelo, sombra, raízes, pontes, pedras, portais, trilhas, cristais), composição de ondas com esquadrões coordenados, eventos com **aviso prévio de 3 s**, 2 objetivos secundários, recompensas e chefe a cada 10 fases. A fase 50 tem 4 etapas de chefe, guardas em linhas diferentes, encerramento animado e aura exclusiva.

**Curva de dificuldade:** `8 × (1 + 0,04 × (fase − 1)) × (1 + 0,35 × (participantes − 1))` (o fator de participantes pertence ao modo multiplayer futuro), combinada com novos comportamentos, terrenos e eventos — não apenas mais vida. Regra anti-impasse: após a última onda, inimigos restantes definham e continuam avançando.

**Modo solo desta versão:** kit fixo de 4 defensores-base + 2 destaques que mudam por fase.

## Multiplayer — adiado para uma atualização futura
**A versão inicial de publicação será solo.** O código de multiplayer foi preservado no projeto, mas os acessos foram ocultados da interface para evitar oferecer uma função que ainda não será lançada. A reativação e os testes ficarão para uma atualização futura.

**Arquitetura preservada:** o anfitrião é a autoridade (`src/net/session.ts`). Ele roda a simulação e envia o estado (~12×/s); os convidados enviam comandos com número de sequência. Validação estrita, ack com reenvio, proteção contra duplicatas, limite de comandos, reconexão pelo mesmo assento (token), IA assumindo durante a queda e sincronização dos novos sistemas (sinergias, eventos, etapas do chefe, terreno pela semente).

| Transporte | Funciona | Observação |
|---|---|---|
| Abas do mesmo navegador (BroadcastChannel) | implementado no código | **Não é online.** Mesmo aparelho. |
| WebSocket via `server/relay.mjs` | implementado no código | **Online de verdade, mas exige hospedar o relay** (`node server/relay.mjs`, Node ≥ 18). |

Esses recursos não aparecem na interface da versão inicial e precisam ser reativados e testados antes de uma atualização multiplayer.

**Limitações honestas**
- **Chat de voz não implementado** (exigiria WebRTC com sinalização). Há chat de texto, mensagens rápidas e avisos de linha sincronizados.
- Se o **anfitrião** cair, a sala encerra (sem migração de anfitrião).
- A aba do anfitrião precisa ficar visível (navegadores pausam abas em segundo plano).
- Ranking é local; ranking global exige servidor próprio.
- Aliados IA são sempre identificados como IA.

## Testes
```
npx esbuild tests/content.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/content.cjs && node /tmp/content.cjs
npx esbuild tests/sim.test.ts    --bundle --platform=node --format=cjs --outfile=/tmp/sim.cjs    && RUNS=1 node /tmp/sim.cjs
npx esbuild tests/net.test.ts    --bundle --platform=node --format=cjs --outfile=/tmp/net.cjs    && node /tmp/net.cjs
npx esbuild tests/relay.test.ts  --bundle --platform=node --format=cjs --outfile=/tmp/relay.cjs --external:ws && node /tmp/relay.cjs
```
`content.test.ts` foi criado para exercitar **cada um dos 51 defensores** e **cada um dos 49 inimigos**, além de chefes, evolução, sinergias e funções. `sim.test.ts` cobre as 50 fases; `net.test.ts` cobre perda/duplicação/reconexão; `relay.test.ts` cobre o relay local. Esses testes precisam ser executados novamente no ambiente de compilação antes da submissão.

## Preparação CrazyGames e monetização (anúncios ainda DESLIGADOS)
`index.html` carrega o SDK HTML5 v3 oficial da CrazyGames. `src/services/crazygames.ts` inicializa o SDK e reporta carregamento, gameplay e configuração de áudio. `src/services/monetization.ts` mantém anúncios, compras e ranking desativados até a fase Full Launch e a aprovação correspondente. Regras: só cosméticos/expansões; nada pago altera equilíbrio; anúncios nunca durante a partida. Anúncios não serão exibidos na fase Basic Launch. A integração de anúncios só deve ser ativada após a liberação Full Launch, com chamadas pelo SDK oficial, tratamento de falha/unfilled e recompensa somente após `adFinished`. O SDK da CrazyGames é carregado apenas para a integração da plataforma; os anúncios permanecem desligados nesta versão de preparação.

## Estrutura
```
src/data     regras, 51 defensores, 49 inimigos, 50 fases, 5 mundos, tabuleiros, eventos, progressão, cosméticos, funções, sinergias
src/game     motor (simulação + espelho de rede), expansão 3.0, renderização, save, som
src/art      desenho procedural (13+14 originais desenhados à mão + gerador para os novos)
src/net      transporte (bus), sessões anfitrião/convidado
src/ui       título, menu, campanha, sala, partida, coleção, extras
server       relay WebSocket opcional
tests        aceitação de conteúdo, equilíbrio e rede
```
