# Guia de utilização — ResolveFlow

## Abrir a aplicação

1. Vai à pasta do projeto (mantém `index.html`, `style.css` e `app.js`
   juntos na mesma pasta).
2. Faz duplo clique em `index.html` (ou abre-o com o browser à tua
   escolha). Não precisas de servidor nem de ligação à internet para o
   modo Offline.

## Testar o Modo Offline (por omissão)

1. Confirma que o botão **🔒 Offline** no cabeçalho está ativo (destacado
   a cobalto).
2. Explora a árvore na barra lateral: clica numa categoria (ex.: "Conta e
   Acesso") para expandir os sub-tópicos, e num sub-tópico (ex.: "Esqueci-
   me da password") para ver a resolução com os passos.
3. Usa a caixa de pesquisa no cabeçalho e escreve, por exemplo,
   `reembolso` ou `atraso`. Devem aparecer resultados correspondentes da
   árvore local, sem qualquer pedido de rede.
4. Escreve algo que não exista na árvore, por exemplo `teclado partido`,
   e confirma que aparece o aviso "Sem resultados no protocolo local" com
   um botão para abrir um chat de IA genérico noutro separador. Confirma
   que **nada é enviado automaticamente** — só abre o separador.
5. (Opcional) Para confirmares que é mesmo offline, desliga o Wi-Fi/rede
   e repete os passos 2–4: deve continuar tudo a funcionar normalmente.

## Testar o Modo Online (IA)

1. Clica no botão **✨ Online (IA)** no cabeçalho.
2. Repara que o aviso de privacidade no topo muda para a versão reforçada
   (fundo vermelho), a lembrar para nunca colares dados pessoais de
   clientes, credenciais, ou conteúdo confidencial do empregador.
3. Na primeira vez, vais ver um cartão a pedir a tua chave de API da
   Anthropic:
   - Obtém uma chave em
     [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
     (precisas de uma conta Anthropic com faturação ativa).
   - Cola a chave no campo e clica em **"Guardar chave"**.
   - Confirma que o cartão passa a mostrar a chave mascarada (ex.:
     `sk-a…1x9Z`) e um botão **"Remover chave"**.
4. Escreve uma pergunta que corresponda a um sub-tópico existente, por
   exemplo `não consigo iniciar sessão`, e envia. Deve aparecer primeiro
   uma **sugestão local** (sem chamar a IA), com os botões "Ver
   resolução" e "Perguntar à IA mesmo assim".
5. Escreve uma pergunta que não exista na árvore, por exemplo `qual é a
   capital de Portugal`, e envia. Desta vez deve ir diretamente pedir
   resposta à IA (vai aparecer "A pensar…" e depois a resposta).
6. Testa os erros amigáveis:
   - **Chave inválida:** remove a chave, cola um valor inválido (ex.:
     `abc123`) e tenta enviar uma pergunta — deve aparecer uma mensagem
     clara de erro, não um JSON em bruto.
   - **Sem internet:** desliga a rede e tenta enviar uma pergunta à IA —
     deve aparecer um aviso de falha de ligação.
7. Clica em **"Remover chave"** para confirmar que a chave é apagada do
   `localStorage` (a caixa de chat desaparece e volta a pedir a chave da
   próxima vez).

## Testar as funcionalidades novas

1. **Atalhos:** prime `/` (fora de campos de texto) ou `Ctrl+K` em qualquer sítio — o foco deve ir para a caixa de pesquisa. Com texto na pesquisa, prime `Esc` para a limpar.
2. **Tema:** clica no botão 🌙/☀️ no cabeçalho. A app deve mudar de tema e manter a escolha após recarregar a página.
3. **Favoritos e recentes:** abre uma resolução e clica em "☆ Adicionar aos favoritos" — deve aparecer em "⭐ Favoritos" na barra lateral, e a resolução também aparece em "🕘 Recentes" assim que a visitas.
4. **Link direto:** clica em "🔗 Copiar link" numa resolução, cola o link numa nova aba — deve abrir diretamente nessa resolução. Usa o botão "recuar" do browser para confirmar que volta ao ecrã anterior.
5. **Copiar / Imprimir:** testa "📋 Copiar passos" (confirma na área de transferência) e "🖨️ Imprimir" (deve abrir a pré-visualização de impressão só com a resolução, sem cabeçalho/barra lateral).
6. **Feedback:** clica em 👍 ou 👎 numa resolução — o contador deve aumentar e o botão escolhido fica destacado.
7. **Testar chave (modo Online):** com uma chave guardada, clica em "Testar chave" — deve validar com um pedido mínimo e mostrar "✓ Chave válida" ou o erro correspondente.
8. **Chat — Parar / Limpar:** faz uma pergunta à IA e clica em "⏹️ Parar" a meio da resposta — a resposta parcial deve ficar guardada na conversa. Clica em "🗑️ Limpar conversa" para reiniciar (pede confirmação).
9. **Apagar todos os dados:** no rodapé, clica em "Apagar todos os dados locais desta app" — depois de confirmar, a chave, favoritos, recentes, feedback, modo e tema voltam todos ao valor por omissão.

## Confirmar a persistência do modo

1. Muda para o modo **Online (IA)**.
2. Recarrega a página (F5).
3. Confirma que continua no modo **Online (IA)** — a preferência foi lida
   do `localStorage`.
4. Repete o teste trocando para **Offline** e recarregando.

## Confirmar que não há chaves no código

Numa pasta do projeto, com o Git instalado, podes correr (PowerShell):

```powershell
Select-String -Path index.html,style.css,app.js,README.md,docs\USAGE.md -Pattern "sk-ant-[a-zA-Z0-9]"
```

Não deve devolver nenhuma linha — só existem placeholders (ex.:
`sk-ant-••••••••••••••••••••••••`) e texto explicativo, nunca uma chave
real.

## Verificar o localStorage no browser (avançado)

Nas ferramentas de programador do browser (F12) → separador
"Application"/"Armazenamento" → Local Storage → escolhe a origem do
`index.html`:

- `resolveflow_mode` — `"offline"` ou `"online"`.
- `resolveflow_api_key` — só existe depois de guardares uma chave; podes
  apagá-la manualmente aqui também, além do botão "Remover chave" na
  aplicação.
