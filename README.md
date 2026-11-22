# capimm-figma

Desenhe **interfaces de Roblox no Figma** e leve para o **Roblox Studio** com as posições e imagens certinhas.

```
Figma (plugin/)  ──upload──►  Roblox (Open Cloud)  ──IDs──►  código  ──colar──►  Studio (studio-plugin/)
   desenha UI              via proxy (worker/)                CAPIMM1{...}        ScreenGui nova ou selecionada
```

> 📘 **Passo a passo completo (GitHub, Figma, Roblox): [INSTRUCOES.md](INSTRUCOES.md)**

## Estrutura do repositório

```
index.html        Página inicial (Texturas / Ícones)
plugin/           Plugin do Figma (manifest.json, code.js, ui.html)
studio-plugin/    Plugin do Roblox Studio (capimm-studio.lua)
worker/           Servidor (Cloudflare Worker): login OAuth + proxy de upload
assets/           Logo (logo-white.png / logo-black.png)
icones/           Imagens de ícones + icones.html (galeria pesquisável)
texturas/         Imagens de texturas + texturas.html (galeria pesquisável)
sons/             sons.json (presets opcionais: [{"name":"Pop","id":"rbxassetid://123"}])
.github/workflows/index.yml   Gera icones/index.json e texturas/index.json a cada push
```

## Galerias (icones.html / texturas.html)

Abra o `.html` da pasta (ou publique com **GitHub Pages**: Settings → Pages → branch `main`, e acesse
`https://capimmm.github.io/capimm-figma/icones/icones.html`). Dá para pesquisar, trocar o fundo, ajustar o tamanho e clicar num item para copiar o link.
A lista vem do `index.json` (gerado pelo GitHub Action) ou, se ele ainda não existir, direto da API do GitHub.

**Para adicionar itens:** coloque o PNG na pasta e faça push. Nada mais.

## Instalar o plugin do Figma

1. Figma Desktop → `Plugins → Development → Import plugin from manifest…` → `plugin/manifest.json`.
2. Rode em `Plugins → Development → capimm-figma`.

## Conectar sua conta Roblox (login OAuth, igual ao BloxFig)

No plugin, aba **Roblox → Entrar com Roblox**: abre o navegador, você escolhe a conta e autoriza *Salvar ativos* e *Ler ativos*. O plugin recebe a sessão sozinho e passa a enviar as imagens para a sua conta.

Para isso funcionar você publica **uma vez** o servidor em `worker/` (Cloudflare Worker, plano grátis):

1. **App OAuth no Roblox:** create.roblox.com → *Credenciais* → *OAuth apps* → criar app.
   Nome (aparece na tela de autorização, ex.: `capimm-figma`), escopos **asset:read** e **asset:write** (+ openid/profile), e como *Redirect URL* use `https://SEU-WORKER.workers.dev/oauth/callback`. Guarde o **Client ID** e o **Client Secret**.
2. **Publicar o servidor:**
   ```bash
   cd worker
   npx wrangler kv namespace create SESSIONS     # cole o id no wrangler.toml
   npx wrangler secret put ROBLOX_CLIENT_ID
   npx wrangler secret put ROBLOX_CLIENT_SECRET
   npx wrangler deploy
   ```
3. No plugin, cole a URL do Worker no campo **Servidor** e clique em **Entrar com Roblox**.

O servidor guarda a sessão por ~2 minutos só para entregá-la ao plugin; depois apaga. O token fica no armazenamento local do Figma e renova sozinho.
Se preferir não usar OAuth, há a opção **Avançado: API key** na mesma aba.
Se usar domínio próprio no servidor, adicione-o em `networkAccess.allowedDomains` do `manifest.json`.

## Fluxo de uso

1. No Figma, monte a UI (use **Componentes**, **Ícones** e **Texturas**) e marque tipos/sons/efeitos se quiser.
2. Selecione a tela/painel → aba **Exportar** → *Exportar para o Roblox*. As imagens sobem, os IDs voltam e aparece o **código** (`CAPIMM1{...}`). Copie.
3. No Studio, instale `studio-plugin/capimm-studio.lua` (crie um Script, cole, botão direito → *Save as Local Plugin*). Clique no botão **capimm-figma** na aba Plugins.
4. Cole o código, escolha **ScreenGui selecionada** ou **Criar nova ScreenGui** e clique em **Importar**.

As posições são relativas ao canto superior esquerdo da seleção, com AnchorPoint `(0,0)`, então a UI fica igual ao Figma.
Se a sua seleção é um frame que representa a tela inteira, marque *A raiz é a tela* para importar só o conteúdo dele.

Animações e sons ficam como **atributos** nas instâncias (`CapimmFx`, `ClickSoundId`, `ClickSoundVolume`) para você ligar nos seus scripts depois.

## Observações

- Imagens são enviadas como **Decal**; o Roblox faz moderação e pode levar alguns segundos até aparecerem. Se alguma não carregar, o ID de Decal pode precisar ser convertido para o ID da Image.
- Imagens só são exportadas de camadas **sem filhos** com preenchimento de imagem.
- Gradientes são exportados na vertical; auto layout vira posições absolutas.
- A interface do plugin usa a fonte Inter embutida e travada (não muda com a fonte do sistema).

## Licença

MIT
