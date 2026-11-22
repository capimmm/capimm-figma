# capimm-figma — instruções completas

Ordem recomendada: **1) GitHub → 2) Servidor (Cloudflare) + app OAuth → 3) Figma → 4) Roblox Studio**.
Os passos 1, 3 e 4 já permitem usar tudo menos o upload automático; o passo 2 liga o login com Roblox.

---

## 1) GitHub

1. Extraia o `.zip`. Dentro vai ter a pasta `capimm-figma/`.
2. No repositório `https://github.com/capimmm/capimm-figma`, envie tudo (os arquivos substituem os antigos):

   ```bash
   cd capimm-figma
   git init
   git add .
   git commit -m "feat: capimm-figma completo"
   git branch -M main
   git remote add origin https://github.com/capimmm/capimm-figma.git
   git push -u origin main --force
   ```
   > `--force` troca o conteúdo atual do repositório pelo desta pasta. Se já tiver arquivos seus lá (ex.: PNGs em `icones/` e `texturas/`), copie-os para a pasta **antes** de enviar, ou use `git pull --rebase origin main` no lugar do `--force`.

3. **Ative o GitHub Pages:** repositório → *Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save*.
   Em ~1 minuto o site fica em `https://capimmm.github.io/capimm-figma/` (página inicial, `/icones/icones.html` e `/texturas/texturas.html`).

4. **Permissão do GitHub Action** (gera a lista de arquivos sozinho): *Settings → Actions → General → Workflow permissions → Read and write permissions → Save*.

5. **Adicionar ícones/texturas:** coloque os PNG/JPG/WEBP em `icones/` ou `texturas/` e faça `git push`.
   O Action cria `icones/index.json` e `texturas/index.json`; as galerias e o plugin passam a mostrar tudo automaticamente (nome do arquivo = nome do item; `-` e `_` viram espaço).
   > Depois do push do Action, rode `git pull` antes do próximo push, para trazer o `index.json` novo.

**Estrutura:**

```
index.html                      página inicial (cards Texturas / Ícones)
icones/icones.html              galeria pesquisável de ícones
texturas/texturas.html          galeria pesquisável de texturas
assets/                         logo.png, favicon.ico, logo-white.png, logo-black.png
plugin/                         plugin do Figma
studio-plugin/capimm-studio.lua plugin do Roblox Studio
worker/                         servidor (login OAuth + upload) — Cloudflare Worker
sons/sons.json                  presets de som opcionais
.github/workflows/index.yml     gera os index.json
```

---

## 2) Servidor + login com Roblox (uma vez)

O Figma não consegue falar direto com o Roblox, então o login e o upload passam por um servidor pequeno e gratuito (Cloudflare Workers).

### 2.1 Criar o servidor
1. Crie uma conta grátis em cloudflare.com.
2. Instale o Node.js (nodejs.org) e, no terminal:
   ```bash
   cd capimm-figma/worker
   npx wrangler login
   npx wrangler kv namespace create SESSIONS
   ```
3. O último comando mostra um `id = "..."`. Cole-o no `worker/wrangler.toml`, no lugar de `COLE_O_ID_DO_KV_AQUI`.
4. Publique: `npx wrangler deploy` — ele mostra a URL, algo como `https://capimm-figma-proxy.SEU-USUARIO.workers.dev`. **Guarde essa URL.**

### 2.2 Criar o app OAuth no Roblox
1. Acesse **create.roblox.com → Credenciais (Credentials) → OAuth 2.0 Apps → Criar**.
2. **Nome:** `capimm-figma` (é o que aparece na tela "Selecione uma conta para continuar para …").
3. **Redirect URL:** `https://SEU-WORKER.workers.dev/oauth/callback` (a URL do passo 2.1 + `/oauth/callback`).
4. **Escopos:** `openid`, `profile`, `asset:read`, `asset:write`.
5. Salve e copie o **Client ID** e o **Client Secret**.

### 2.3 Entregar as credenciais ao servidor
```bash
cd capimm-figma/worker
npx wrangler secret put ROBLOX_CLIENT_ID        # cole o Client ID
npx wrangler secret put ROBLOX_CLIENT_SECRET    # cole o Client Secret
npx wrangler deploy
```
Teste: abrir `https://SEU-WORKER.workers.dev/health` deve mostrar `{"ok":true,...,"oauth":true}`.

> Alternativa sem OAuth: crie uma **API key** (Credenciais → API Keys) com *Assets: read + write* e IP `0.0.0.0/0`, e use em **Avançado** na aba Roblox do plugin. Ainda precisa do servidor publicado.

---

## 3) Figma

1. Abra o **Figma Desktop** (o app, não o navegador).
2. Menu **Plugins → Development → Import plugin from manifest…** → escolha `capimm-figma/plugin/manifest.json`.
3. Rode em **Plugins → Development → capimm-figma**.
4. Aba **Roblox:** cole a URL do servidor no campo *Servidor* e clique em **Entrar com Roblox**. O navegador abre; escolha a conta, autorize *Salvar ativos* e *Ler ativos* e volte ao Figma — o plugin mostra seu nome.
5. Se você usa outro domínio no servidor, ou outro nome/repositório no GitHub, edite `plugin/manifest.json` (`allowedDomains`) e o campo *Repositório* da aba Roblox (`dono/repo@branch`).

**Como usar:**
- **Componentes / Ícones / Texturas:** insere blocos prontos e imagens da biblioteca no canvas.
- **Tipos:** escolha a instância do Roblox para cada camada (Auto, ImageLabel, ImageButton, TextLabel, TextBox, ScrollingFrame).
- **Animar / Sons:** ficam salvos na camada e vão como atributos para o Studio.
- **Exportar:** selecione o painel/tela → *Exportar para o Roblox*. As imagens são enviadas, os IDs voltam e aparece um **código** (`CAPIMM1{…}`). Clique em **Copiar código**.
- Imagens só são exportadas de camadas **sem filhos** que tenham preenchimento de imagem.

---

## 4) Roblox Studio

**Instalar o plugin (uma vez):**
1. No Studio, crie um **Script** em `ServerScriptService`.
2. Apague o conteúdo e cole todo o arquivo `studio-plugin/capimm-studio.lua`.
3. Clique com o botão direito no Script → **Save as Local Plugin…** → Save. (Depois pode apagar o Script do jogo.)
4. Se o botão não aparecer, feche e reabra o Studio. Ele aparece na aba **Plugins** como **capimm-figma**.

**Importar uma UI:**
1. Abra o plugin e cole o código copiado no Figma.
2. Escolha **ScreenGui selecionada** (selecione antes uma ScreenGui no Explorer) ou **Criar nova ScreenGui** (vai para `StarterGui`, com `IgnoreGuiInset` ligado para as coordenadas baterem com o Figma).
3. Se o que você exportou foi o frame da tela inteira, marque **A raiz é a tela**.
4. Clique em **Importar**. É possível desfazer com Ctrl+Z.

As posições seguem o canto superior esquerdo da seleção (AnchorPoint 0,0), então fica igual ao Figma. Animações e sons ficam como atributos (`CapimmFx`, `ClickSoundId`, `ClickSoundVolume`) para você ligar nos seus scripts.

---

## Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| Galeria mostra "Não foi possível carregar" | Repositório precisa ser **público**; confira a branch `main` e se o Action rodou (aba *Actions*). |
| Plugin: "Servidor inacessível" | URL do Worker errada, ou domínio fora do `allowedDomains` do `manifest.json`. |
| Login abre mas nada acontece no Figma | O *Redirect URL* do app OAuth deve ser exatamente `…/oauth/callback` do seu Worker. |
| "Roblox 401/403" no upload | Escopos `asset:read`/`asset:write` faltando, ou API key sem permissão. |
| Imagem não aparece no Studio | O Roblox modera os uploads (pode levar alguns segundos/minutos). Se persistir, o ID de Decal pode precisar ser convertido para o ID da imagem. |
| Plugin do Studio não aparece | Feche e reabra o Studio; confirme que salvou como *Local Plugin*. |

> Este pacote foi montado e conferido por inspeção e testes de interface no navegador, mas o fluxo completo (login OAuth, upload e importação no Studio) depende das suas credenciais e não foi executado de ponta a ponta. Se algo falhar, copie a mensagem de erro e me envie.
