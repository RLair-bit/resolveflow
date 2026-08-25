# ResolveFlow

Ferramenta pessoal e open-source de apoio ao cliente — `index.html` +
`style.css` + `app.js`, tudo em HTML + CSS + JavaScript vanilla, **sem
dependências e sem build**. Tem uma árvore de decisão navegável
(categorias → sub-tópicos → resoluções com passos) e pesquisa por
palavra-chave.

Abre diretamente `index.html` num browser (mantém os 3 ficheiros na mesma
pasta) — não precisas de servidor, npm, nem ligação à internet para o modo
por omissão. `<link>`/`<script src>` locais funcionam normalmente em
`file://`, ao contrário de módulos ES ou `fetch()`, por isso dividir em 3
ficheiros não quebra o "duplo clique e funciona".

## Design

O padrão visual das listas (cartões arredondados, ícones coloridos por
categoria, separadores finos, chevron `›`) foi inspirado no
[iOS 16 UI Kit for Figma (Community)](https://www.figma.com/design/yBbzbw3RuLtLvoGHZQYsgc/iOS-16-UI-Kit-for-Figma--Community-)
— ecrãs "Settings" (listas agrupadas) e "MessageThread" (bolhas de chat) —
adaptado à identidade própria do ResolveFlow (acento cobalto `#2D5BE3`,
Space Grotesk / IBM Plex Sans / IBM Plex Mono), não uma cópia literal do
iOS.

## Funcionalidades

- Árvore de decisão navegável + pesquisa local **tolerante a erros de escrita** (typo-tolerante), com destaque dos termos encontrados e sugestões em autocomplete enquanto escreves.
- Atalhos de teclado: `/` foca a pesquisa; `Ctrl+K`/`Cmd+K` abre a **paleta de comandos** (salta para qualquer resolução ou executa ações rápidas); `Esc` fecha/limpa.
- Tema claro/escuro (segue o sistema por omissão, com botão 🌙/☀️ para forçar).
- Favoritos ⭐ e "vistos recentemente" 🕘 na barra lateral.
- Links diretos por URL (`#categoria/subtopico`), partilháveis e com recuar/avançar do browser.
- Em cada resolução: copiar passos, copiar link, imprimir, marcar como favorito e votar "Foi útil? 👍/👎".
- **Editor de resoluções personalizadas** — cria/edita/elimina as tuas próprias resoluções (categoria "Minhas Resoluções"), guardadas só no teu browser, sem tocar no código. Exporta/importa como ficheiro `.json` para backup ou partilha entre computadores.
- Menu lateral responsivo (gaveta com hamburger) em ecrãs pequenos/telemóvel.
- Modo Online (IA): respostas em streaming, com Markdown básico, botão "Parar", "Limpar conversa", "Testar chave" e conversa persistida apenas durante a sessão do separador (`sessionStorage`).
- Sincronização automática entre separadores abertos (modo, chave, tema e resoluções personalizadas).
- Botão único no rodapé para apagar todos os dados locais da app.

## Modos de funcionamento

O seletor de modo está no cabeçalho. A escolha fica guardada no
`localStorage` do browser, por isso mantém-se na próxima visita.

### 🔒 Modo Offline (por omissão)

- Funciona **totalmente offline**, sem nenhuma chamada de rede.
- A pesquisa procura apenas nas notas locais desta árvore de decisão.
- Se não encontrar nada relevante, mostra um aviso e um link para abrir um
  chat de IA genérico **noutro separador**. Nada é enviado automaticamente
  — é só um atalho para copiares a tua pergunta manualmente, se quiseres.

### ✨ Modo Online (IA)

- Acrescenta uma caixa de chat com um assistente de IA a sério, para
  dúvidas que não estejam cobertas pela árvore local.
- Antes de contactar a IA, o sistema pesquisa sempre primeiro na árvore
  local. Se encontrar uma resolução relevante, sugere-a primeiro — só
  chama a IA se não houver nada local relevante, ou se pedires
  explicitamente ("Perguntar à IA mesmo assim").
- Usa a API de mensagens da Anthropic (Claude) por omissão. O modelo é
  configurável numa constante no topo do `app.js`
  (`AI_CONFIG.model`), para poderes trocar de modelo facilmente.
- Erros comuns (chave inválida, sem internet, limite de pedidos) são
  mostrados de forma percetível, não como JSON em bruto.

## Como obter e usar a tua chave de API (modo Online)

1. Cria uma chave em **[console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)**.
2. No ResolveFlow, muda para o modo **Online (IA)**.
3. Na primeira utilização, cola a chave no campo apresentado e clica em
   **"Guardar chave"**.
4. A chave fica guardada **apenas no `localStorage` do teu browser, neste
   computador** — nunca é escrita em nenhum ficheiro do projeto nem
   enviada para o repositório.
5. Para a apagar, usa o botão **"Remover chave"** junto ao estado da
   chave (isto limpa também o histórico de conversa em memória).

## 🔐 Segurança e privacidade — lê antes de usar

- **A chave de API nunca está no código-fonte.** Não existe nenhuma chave
  de exemplo, por omissão ou hardcoded em `app.js`, `index.html`, no
  README ou em qualquer outro ficheiro deste repositório. É sempre pedida
  ao utilizador em runtime.
- **A chave só existe em `localStorage`, no browser onde a colaste.** Não
  é sincronizada, não é enviada para nenhum servidor além da própria API
  da Anthropic quando fazes uma pergunta, e não sai do teu computador de
  outra forma.
- **O modo Online envia o texto que escreveres para um servidor externo
  de IA (Anthropic).** Isto é inerente a qualquer assistente de IA
  baseado em API — lê o aviso no cabeçalho da aplicação antes de usar.
- **Nunca coles neste chat (nem no modo Offline nem no Online):**
  - dados pessoais de clientes (nomes, moradas, números de telefone,
    emails, NIFs, etc.);
  - passwords, tokens ou outras credenciais;
  - texto de manuais internos, políticas ou documentação confidencial do
    teu empregador.
- Este é um **projeto pessoal e genérico**, feito para uso individual e
  aprendizagem. **Não substitui as políticas de confidencialidade,
  segurança da informação ou proteção de dados do teu empregador.**
  Confirma sempre o que é permitido usar no teu contexto de trabalho
  antes de colares qualquer informação real de clientes nesta (ou
  qualquer outra) ferramenta.
- Porque a chamada à API é feita diretamente do browser (fetch), a chave
  fica visível no separador de rede das ferramentas de programador do teu
  próprio browser enquanto a usas — isto é esperado para uma ferramenta
  pessoal do género "cola a tua chave e usa", mas não é adequado para uma
  aplicação multi-utilizador ou de produção partilhada (nesse caso, a
  chamada à IA devia passar por um backend próprio que guardasse a chave
  do lado do servidor).

## Estrutura do projeto

```
resolveflow/
├── index.html        # marcação da aplicação (HTML)
├── style.css          # estilo (tema claro/escuro, layout, componentes)
├── app.js              # lógica (árvore de decisão, pesquisa, modo IA, etc.)
├── README.md            # este ficheiro
├── .gitignore            # evita commit acidental de chaves/segredos
└── docs/
    ├── USAGE.md            # guia de utilização passo-a-passo
    └── BRANCHING.md         # estratégia de branches e convenção de commits
```

Os 3 ficheiros continuam **sem dependências, sem build e sem framework** —
é só HTML/CSS/JS lidos diretamente pelo browser.

## Contribuir / organização do repositório

Este repositório segue um fluxo de branches simples (`main` estável,
`develop` de integração, `feature/*` por funcionalidade). Ver
[docs/BRANCHING.md](docs/BRANCHING.md) para o fluxo completo.

## Personalizar

- **Árvore de decisão:** edita o array `TREE` em `app.js`
  (categorias → `subtopics` → `steps`).
- **Modelo de IA / endpoint:** edita o objeto `AI_CONFIG` no topo de
  `app.js`.
- **Cores/tema:** edita as variáveis CSS em `style.css` (`:root`).
- **Link do chat de IA genérico (modo Offline):** edita a constante
  `GENERIC_AI_CHAT_URL`.

## Testar

Consulta [docs/USAGE.md](docs/USAGE.md) para um guia passo-a-passo de como
testar cada modo.

## Licença

Projeto pessoal, open-source, sem garantias. Usa e adapta livremente.
