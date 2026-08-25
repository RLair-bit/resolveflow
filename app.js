// ResolveFlow - logica da aplicacao
// Extraida de index.html para facilitar manutencao.
// Continua sem build/dependencias: e so um script local.

(function(){
  "use strict";

  /* =========================================================================
     CONFIGURAÇÃO — muda aqui o modelo / endpoint da IA se precisares.
     A chave de API NUNCA é lida a partir daqui: é sempre pedida ao
     utilizador em runtime e guardada apenas em localStorage do browser.
     ========================================================================= */
  const AI_CONFIG = {
    provider: "anthropic",
    apiEndpoint: "https://api.anthropic.com/v1/messages",
    model: "claude-sonnet-5",     // <- muda o modelo Claude aqui
    apiVersion: "2023-06-01",
    maxTokens: 1024,
    systemPrompt:
      "és um assistente de apoio ao cliente; responde de forma clara, " +
      "cordial e passo-a-passo, em português europeu. Se a pergunta " +
      "envolver dados pessoais, credenciais ou informação confidencial, " +
      "recorda ao utilizador para não partilhar esses dados aqui. " +
      "Quando fizer sentido, estrutura a resposta em passos numerados."
  };

  // Chat de IA genérico usado no MODO OFFLINE quando a pesquisa local
  // não encontra nada. Não é enviada nenhuma pergunta automaticamente —
  // é apenas aberto um separador novo.
  const GENERIC_AI_CHAT_URL = "https://claude.ai/new";

  const LS_KEYS = {
    mode: "resolveflow_mode",              // "offline" | "online"
    apiKey: "resolveflow_api_key",         // guardada só no browser do utilizador
    theme: "resolveflow_theme",            // "light" | "dark" | (ausente = segue o sistema)
    recent: "resolveflow_recent",          // array de {catId,subId}, vistos recentemente
    favorites: "resolveflow_favorites",    // array de {catId,subId}, marcados como favoritos
    feedback: "resolveflow_feedback",      // objeto { "cat/sub": {up,down,voted} }
    chatSession: "resolveflow_chat_session", // histórico de chat — sessionStorage (limpa ao fechar o separador)
    customResolutions: "resolveflow_custom" // array de resoluções criadas pelo utilizador
  };

  // Categoria virtual "Minhas Resoluções", construída a partir do que o
  // utilizador guardar em localStorage — nunca mistura com a árvore embutida.
  const CUSTOM_CAT_ID = "custom";

  /* ---------------------------------------------------------------------
     DADOS — árvore de decisão (categorias → sub-tópicos → resolução)
     --------------------------------------------------------------------- */
  const TREE = [
    {
      id: "conta", name: "Conta e Acesso", emoji: "🔐", color: "#007AFF",
      subtopics: [
        {
          id: "login-falha", title: "Não consigo iniciar sessão",
          keywords: ["login", "entrar", "sessao", "sessão", "password errada", "acesso negado", "nao consigo entrar"],
          summary: "Passos para resolver problemas comuns ao iniciar sessão.",
          steps: [
            "Confirma que o email ou utilizador está escrito corretamente, sem espaços a mais.",
            "Sugere recuperar a password através da opção \"Esqueci-me da password\".",
            "Pede para limpar cache e cookies do browser, ou experimentar uma janela privada.",
            "Verifica se o Caps Lock não está ativo ao escrever a password.",
            "Se persistir, confirma se a conta não está temporariamente bloqueada por tentativas falhadas."
          ]
        },
        {
          id: "esqueci-password", title: "Esqueci-me da password",
          keywords: ["recuperar password", "reset password", "nova password", "redefinir password", "mudar password"],
          summary: "Como orientar o cliente a redefinir a password em segurança.",
          steps: [
            "Pede ao cliente para aceder à página de login e clicar em \"Esqueci-me da password\".",
            "Deve introduzir o email associado à conta.",
            "Pede para verificar a caixa de entrada (e a pasta de spam) para o email de redefinição.",
            "O cliente segue o link e define uma password nova, com pelo menos 8 caracteres.",
            "Confirma com o cliente que já consegue iniciar sessão com a nova password."
          ]
        },
        {
          id: "conta-bloqueada", title: "Conta bloqueada",
          keywords: ["bloqueada", "suspensa", "demasiadas tentativas", "conta trancada"],
          summary: "Procedimento de apoio para uma conta bloqueada.",
          steps: [
            "Confirma a identidade do cliente através dos dados de verificação habituais da tua organização.",
            "Explica o motivo do bloqueio (normalmente, demasiadas tentativas de login falhadas).",
            "Informa que o bloqueio automático costuma expirar sozinho (ex.: 30 minutos).",
            "Sugere a redefinição da password como medida preventiva depois do desbloqueio.",
            "Regista o incidente conforme o procedimento interno da tua organização."
          ]
        }
      ]
    },
    {
      id: "faturacao", name: "Faturação e Pagamentos", emoji: "💳", color: "#34C759",
      subtopics: [
        {
          id: "pagamento-recusado", title: "Pagamento recusado",
          keywords: ["pagamento recusado", "cartao recusado", "cartão recusado", "erro pagamento", "nao consigo pagar"],
          summary: "Diagnóstico de um pagamento recusado no checkout.",
          steps: [
            "Confirma que os dados do cartão (número, validade, CVV) foram introduzidos corretamente.",
            "Sugere verificar com o banco se existe limite de compras online ativado.",
            "Pede para experimentar outro método de pagamento, se disponível.",
            "Verifica se o valor a debitar excede o saldo ou limite disponível.",
            "Se o erro persistir, encaminha para o suporte de pagamentos com o horário e mensagem de erro exatos."
          ]
        },
        {
          id: "fatura-incorreta", title: "Fatura incorreta",
          keywords: ["fatura errada", "valor errado", "fatura incorreta", "cobranca indevida", "cobrança indevida"],
          summary: "Como validar e corrigir uma fatura com valores incorretos.",
          steps: [
            "Pede o número da fatura e a data de emissão.",
            "Compara os itens faturados com a encomenda ou subscrição associada.",
            "Confirma se houve alguma alteração de plano ou promoção não aplicada.",
            "Se confirmado o erro, emite nota de crédito ou fatura corrigida conforme o processo interno.",
            "Informa o cliente do prazo estimado para a correção."
          ]
        },
        {
          id: "pedido-reembolso", title: "Pedido de reembolso",
          keywords: ["reembolso", "devolver dinheiro", "estorno", "reembolsar"],
          summary: "Fluxo padrão para tratar um pedido de reembolso.",
          steps: [
            "Confirma o motivo do pedido de reembolso junto do cliente.",
            "Verifica se o pedido está dentro do prazo e condições da política de reembolso.",
            "Reúne o número de encomenda ou fatura associado.",
            "Regista o pedido no sistema de gestão e informa o prazo típico de processamento.",
            "Confirma ao cliente o método pelo qual o valor será devolvido."
          ]
        }
      ]
    },
    {
      id: "produto", name: "Produto / Serviço", emoji: "🛠️", color: "#5856D6",
      subtopics: [
        {
          id: "produto-nao-funciona", title: "Produto não funciona",
          keywords: ["nao funciona", "não funciona", "avariado", "defeito", "parou de funcionar"],
          summary: "Diagnóstico inicial para um produto ou serviço que não funciona.",
          steps: [
            "Pede uma descrição concreta do problema e desde quando ocorre.",
            "Sugere reiniciar a aplicação/dispositivo ou atualizar para a versão mais recente.",
            "Confirma se o problema ocorre em todos os dispositivos ou só num.",
            "Pede capturas de ecrã ou mensagens de erro, se existirem.",
            "Se não resolvido, escala para a equipa técnica com os detalhes recolhidos."
          ]
        },
        {
          id: "falta-funcionalidade", title: "Falta de funcionalidade",
          keywords: ["funcionalidade em falta", "nao tem opcao", "não tem opção", "falta recurso", "sugestao", "sugestão"],
          summary: "Como registar um pedido de funcionalidade em falta.",
          steps: [
            "Agradece o feedback e confirma que compreendeste bem o pedido.",
            "Verifica se a funcionalidade já existe de outra forma no produto.",
            "Regista o pedido no canal de feedback/product backlog da tua organização.",
            "Informa o cliente que não há prazo garantido, mas que o feedback foi registado.",
            "Sugere alternativas temporárias, se existirem."
          ]
        },
        {
          id: "erro-instalar", title: "Erro ao instalar",
          keywords: ["erro instalacao", "erro instalação", "nao instala", "não instala", "falha instalacao"],
          summary: "Passos para resolver falhas durante a instalação.",
          steps: [
            "Confirma o sistema operativo e a versão usada pelo cliente.",
            "Pede a mensagem de erro exata apresentada durante a instalação.",
            "Sugere verificar espaço em disco disponível e permissões de administrador.",
            "Sugere desativar temporariamente antivírus/firewall que possam bloquear a instalação.",
            "Se persistir, disponibiliza um instalador alternativo ou escala para suporte técnico."
          ]
        }
      ]
    },
    {
      id: "entregas", name: "Entregas e Encomendas", emoji: "📦", color: "#FF9500",
      subtopics: [
        {
          id: "encomenda-atrasada", title: "Encomenda atrasada",
          keywords: ["atraso", "atrasada", "ainda nao chegou", "ainda não chegou", "demora entrega"],
          summary: "Como responder a uma encomenda que está atrasada.",
          steps: [
            "Pede o número de encomenda ou de rastreio.",
            "Consulta o estado atual no sistema de transporte/logística.",
            "Compara a data prevista de entrega com a data atual.",
            "Informa o cliente do novo prazo estimado, se disponível.",
            "Se o atraso for excessivo, oferece as opções previstas na política da tua organização (reenvio, reembolso, etc.)."
          ]
        },
        {
          id: "encomenda-perdida", title: "Encomenda perdida",
          keywords: ["encomenda perdida", "nao chegou", "não chegou", "extraviada", "desapareceu"],
          summary: "Procedimento para uma encomenda dada como perdida.",
          steps: [
            "Confirma o número de encomenda e a morada de entrega.",
            "Verifica junto da transportadora o último estado registado.",
            "Confirma se passou o prazo máximo de entrega considerado \"perdida\" pela tua política.",
            "Abre um processo de reclamação junto da transportadora, se aplicável.",
            "Propõe reenvio ou reembolso ao cliente, conforme a política interna."
          ]
        },
        {
          id: "artigo-danificado", title: "Artigo danificado",
          keywords: ["danificado", "partido", "chegou partido", "veio estragado"],
          summary: "Como tratar um artigo que chegou danificado.",
          steps: [
            "Pede fotos do artigo e da embalagem, se possível.",
            "Confirma o número de encomenda associado.",
            "Verifica se o dano foi causado no transporte ou é defeito de fabrico.",
            "Regista o pedido de substituição ou reembolso conforme a política aplicável.",
            "Informa o cliente do prazo estimado para resolução."
          ]
        }
      ]
    },
    {
      id: "cancelamentos", name: "Cancelamentos e Devoluções", emoji: "↩️", color: "#FF3B30",
      subtopics: [
        {
          id: "cancelar-subscricao", title: "Cancelar subscrição",
          keywords: ["cancelar subscricao", "cancelar subscrição", "cancelar plano", "terminar assinatura"],
          summary: "Fluxo para cancelar uma subscrição ativa.",
          steps: [
            "Confirma qual o plano/subscrição que o cliente pretende cancelar.",
            "Explica as condições de cancelamento (ex.: efetivo no fim do período pago).",
            "Confirma se há penalizações ou valores a reembolsar.",
            "Processa o cancelamento no sistema de gestão de subscrições.",
            "Envia confirmação por escrito ao cliente."
          ]
        },
        {
          id: "devolver-produto", title: "Devolver produto",
          keywords: ["devolucao", "devolução", "devolver produto", "quero devolver"],
          summary: "Como orientar uma devolução de produto.",
          steps: [
            "Confirma o motivo da devolução e o número de encomenda.",
            "Verifica se está dentro do prazo legal/da política de devolução.",
            "Explica o processo de envio de devolução (etiqueta, morada, prazo).",
            "Informa como e quando o reembolso ou troca será processado.",
            "Regista o pedido no sistema para acompanhamento."
          ]
        },
        {
          id: "politica-devolucao", title: "Política de devolução",
          keywords: ["politica devolucao", "política de devolução", "prazo devolucao", "condicoes devolucao"],
          summary: "Esclarecimentos comuns sobre a política de devolução.",
          steps: [
            "Explica o prazo geral de devolução aplicável (ex.: 14 dias, conforme a tua política).",
            "Esclarece as condições do artigo para aceitar devolução (embalagem, estado, etc.).",
            "Indica quem paga os portes de devolução, conforme a tua política.",
            "Esclarece o método e prazo de reembolso após receção do artigo.",
            "Direciona para a página oficial de políticas, se existir, para mais detalhe."
          ]
        }
      ]
    }
  ];

  /* ---------------------------------------------------------------------
     ESTADO
     --------------------------------------------------------------------- */
  let state = {
    mode: "offline",          // "offline" | "online"
    selected: null,           // { catId, subId }
    chatHistory: [],          // [{role:'user'|'assistant', content:'...'}]
    abortController: null     // AbortController do pedido de IA em curso (para o botão "Parar")
  };

  /* ---------------------------------------------------------------------
     UTILITÁRIOS
     --------------------------------------------------------------------- */
  function normalize(str){
    return (str || "")
      .toString()
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, ""); // remove acentos
  }

  function escapeHtml(str){
    return (str || "").toString()
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function findCategoryAndSub(catId, subId){
    const cat = catId === CUSTOM_CAT_ID ? getCustomCategory() : TREE.find(c => c.id === catId);
    if(!cat) return null;
    const sub = cat.subtopics.find(s => s.id === subId);
    if(!sub) return null;
    return {cat, sub};
  }

  /* ---------------------------------------------------------------------
     RESOLUÇÕES PERSONALIZADAS — criadas pelo utilizador, guardadas em
     localStorage; nunca tocam nos dados embutidos (TREE) do projeto
     --------------------------------------------------------------------- */
  function getCustomResolutions(){
    try{ return JSON.parse(localStorage.getItem(LS_KEYS.customResolutions) || "[]"); } catch(e){ return []; }
  }
  function setCustomResolutions(list){
    localStorage.setItem(LS_KEYS.customResolutions, JSON.stringify(list));
  }
  function getCustomCategory(){
    return {
      id: CUSTOM_CAT_ID,
      name: "Minhas Resoluções",
      emoji: "📝",
      color: "#8E8E93",
      subtopics: getCustomResolutions()
    };
  }
  function getTreeWithCustom(){
    const custom = getCustomCategory();
    return custom.subtopics.length > 0 ? TREE.concat([custom]) : TREE.slice();
  }
  function getAllSubtopics(){
    const list = [];
    TREE.forEach(cat => cat.subtopics.forEach(sub => list.push({cat, sub})));
    const custom = getCustomCategory();
    custom.subtopics.forEach(sub => list.push({cat: custom, sub}));
    return list;
  }

  /* ---------------------------------------------------------------------
     TOAST — pequena notificação temporária no fundo do ecrã
     --------------------------------------------------------------------- */
  function showToast(msg){
    let t = document.getElementById("toast");
    if(!t){
      t = document.createElement("div");
      t.id = "toast";
      t.className = "toast";
      t.setAttribute("role", "status");
      t.setAttribute("aria-live", "polite");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------------------------------------------------------------------
     ÁREA DE TRANSFERÊNCIA
     --------------------------------------------------------------------- */
  function fallbackCopy(text, toastMsg){
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try{
      document.execCommand("copy");
      showToast(toastMsg);
    } catch(e){
      showToast("Não foi possível copiar. Copia manualmente.");
    }
    document.body.removeChild(ta);
  }
  function copyToClipboard(text, toastMsg){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(
        () => showToast(toastMsg),
        () => fallbackCopy(text, toastMsg)
      );
    } else {
      fallbackCopy(text, toastMsg);
    }
  }

  /* ---------------------------------------------------------------------
     TEMA — claro / escuro / segue o sistema, persistido em localStorage
     --------------------------------------------------------------------- */
  function getStoredTheme(){
    return localStorage.getItem(LS_KEYS.theme) || "";
  }
  function applyTheme(theme){
    if(theme === "dark" || theme === "light"){
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    const btn = document.getElementById("btnThemeToggle");
    if(btn){
      const isDark = theme === "dark" ||
        (theme !== "light" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
      btn.textContent = isDark ? "☀️" : "🌙";
      btn.title = isDark ? "Mudar para tema claro" : "Mudar para tema escuro";
    }
  }
  function toggleTheme(){
    const current = getStoredTheme();
    const isDark = current === "dark" ||
      (current !== "light" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    localStorage.setItem(LS_KEYS.theme, next);
    applyTheme(next);
  }

  /* ---------------------------------------------------------------------
     DESTAQUE DE TERMOS DE PESQUISA
     --------------------------------------------------------------------- */
  function highlightTerms(text, terms){
    let html = escapeHtml(text);
    const uniqueTerms = Array.from(new Set(terms.filter(t => t && t.length > 1)))
      .sort((a, b) => b.length - a.length);
    uniqueTerms.forEach(term => {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp("(" + escapedTerm + ")", "gi");
      html = html.replace(re, "<mark>$1</mark>");
    });
    return html;
  }

  /* ---------------------------------------------------------------------
     FAVORITOS E VISTOS RECENTEMENTE — persistidos em localStorage
     --------------------------------------------------------------------- */
  function getList(key){
    try{ return JSON.parse(localStorage.getItem(key) || "[]"); } catch(e){ return []; }
  }
  function setList(key, list){
    localStorage.setItem(key, JSON.stringify(list));
  }
  function pushRecent(catId, subId){
    let list = getList(LS_KEYS.recent).filter(i => !(i.catId === catId && i.subId === subId));
    list.unshift({catId, subId});
    list = list.slice(0, 5);
    setList(LS_KEYS.recent, list);
    renderSideLists();
  }
  function isFavorite(catId, subId){
    return getList(LS_KEYS.favorites).some(i => i.catId === catId && i.subId === subId);
  }
  function toggleFavorite(catId, subId){
    let list = getList(LS_KEYS.favorites);
    if(isFavorite(catId, subId)){
      list = list.filter(i => !(i.catId === catId && i.subId === subId));
      showToast("Removido dos favoritos.");
    } else {
      list.unshift({catId, subId});
      showToast("Adicionado aos favoritos.");
    }
    setList(LS_KEYS.favorites, list);
    renderSideLists();
  }
  function renderSideLists(){
    const container = document.getElementById("sideLists");
    if(!container) return;

    function renderGroup(title, items, emptyHint){
      if(items.length === 0){
        return `<div class="side-section"><h3>${title}</h3><div class="empty-hint">${emptyHint}</div></div>`;
      }
      const rows = items.map(i => {
        const found = findCategoryAndSub(i.catId, i.subId);
        if(!found) return "";
        return `<li><button type="button" data-cat="${i.catId}" data-sub="${i.subId}">` +
          `<span class="icon-badge" style="background:${found.cat.color}">${found.cat.emoji}</span>` +
          `<span>${escapeHtml(found.sub.title)}</span><span class="chevron">›</span></button></li>`;
      }).join("");
      return `<div class="side-section"><h3>${title}</h3><ul>${rows}</ul></div>`;
    }

    container.innerHTML =
      renderGroup("⭐ Favoritos", getList(LS_KEYS.favorites), "Ainda sem favoritos.") +
      renderGroup("🕘 Recentes", getList(LS_KEYS.recent), "Ainda sem histórico.");

    container.querySelectorAll("button[data-cat]").forEach(btn => {
      btn.addEventListener("click", () => selectSubtopic(btn.dataset.cat, btn.dataset.sub));
    });
  }

  /* ---------------------------------------------------------------------
     FEEDBACK ("Foi útil?") por resolução — persistido em localStorage
     --------------------------------------------------------------------- */
  function getFeedback(catId, subId){
    let all = {};
    try{ all = JSON.parse(localStorage.getItem(LS_KEYS.feedback) || "{}"); } catch(e){}
    return all[catId + "/" + subId] || {up: 0, down: 0, voted: null};
  }
  function setVote(catId, subId, vote){
    let all = {};
    try{ all = JSON.parse(localStorage.getItem(LS_KEYS.feedback) || "{}"); } catch(e){}
    const key = catId + "/" + subId;
    const current = all[key] || {up: 0, down: 0, voted: null};
    if(current.voted !== vote){
      if(current.voted === "up") current.up = Math.max(0, current.up - 1);
      if(current.voted === "down") current.down = Math.max(0, current.down - 1);
      if(vote === "up") current.up += 1;
      if(vote === "down") current.down += 1;
      current.voted = vote;
    }
    all[key] = current;
    localStorage.setItem(LS_KEYS.feedback, JSON.stringify(all));
    return current;
  }
  function wireFeedbackButtons(catId, subId){
    const fb = getFeedback(catId, subId);
    const upBtn = document.getElementById("btnFeedbackUp");
    const downBtn = document.getElementById("btnFeedbackDown");
    const upCount = document.getElementById("fbUpCount");
    const downCount = document.getElementById("fbDownCount");
    if(!upBtn || !downBtn) return;

    upCount.textContent = fb.up || "";
    downCount.textContent = fb.down || "";
    upBtn.classList.toggle("active", fb.voted === "up");
    downBtn.classList.toggle("active", fb.voted === "down");

    upBtn.addEventListener("click", () => {
      const updated = setVote(catId, subId, "up");
      upCount.textContent = updated.up || "";
      downCount.textContent = updated.down || "";
      upBtn.classList.add("active");
      downBtn.classList.remove("active");
      showToast("Obrigado pelo feedback!");
    });
    downBtn.addEventListener("click", () => {
      const updated = setVote(catId, subId, "down");
      upCount.textContent = updated.up || "";
      downCount.textContent = updated.down || "";
      downBtn.classList.add("active");
      upBtn.classList.remove("active");
      showToast("Obrigado pelo feedback!");
    });
  }

  /* ---------------------------------------------------------------------
     EDITOR DE RESOLUÇÕES PERSONALIZADAS — criar/editar/eliminar, sem
     tocar na árvore embutida (TREE) do projeto
     --------------------------------------------------------------------- */
  let editingResolutionId = null; // null = a criar; caso contrário, id da resolução a editar

  function openEditor(existingSub){
    const overlay = document.getElementById("editorOverlay");
    const titleEl = document.getElementById("editorTitle");
    const deleteBtn = document.getElementById("btnEditorDelete");

    if(existingSub){
      editingResolutionId = existingSub.id;
      titleEl.textContent = "Editar resolução";
      document.getElementById("editTitle").value = existingSub.title;
      document.getElementById("editSummary").value = existingSub.summary || "";
      document.getElementById("editSteps").value = existingSub.steps.join("\n");
      document.getElementById("editKeywords").value = (existingSub.keywords || []).join(", ");
      deleteBtn.classList.remove("hidden");
    } else {
      editingResolutionId = null;
      titleEl.textContent = "Nova resolução";
      document.getElementById("editTitle").value = "";
      document.getElementById("editSummary").value = "";
      document.getElementById("editSteps").value = "";
      document.getElementById("editKeywords").value = "";
      deleteBtn.classList.add("hidden");
    }
    closePalette();
    overlay.classList.add("open");
    setTimeout(() => document.getElementById("editTitle").focus(), 30);
  }

  function closeEditor(){
    document.getElementById("editorOverlay").classList.remove("open");
    editingResolutionId = null;
  }

  function saveEditor(){
    const title = document.getElementById("editTitle").value.trim();
    const summary = document.getElementById("editSummary").value.trim();
    const steps = document.getElementById("editSteps").value
      .split("\n").map(s => s.trim()).filter(Boolean);
    const keywords = document.getElementById("editKeywords").value
      .split(",").map(s => s.trim()).filter(Boolean);

    if(!title || steps.length === 0){
      showToast("Preenche pelo menos o título e um passo.");
      return;
    }

    let list = getCustomResolutions();
    let savedId = editingResolutionId;
    if(editingResolutionId){
      list = list.map(r => r.id === editingResolutionId ? {...r, title, summary, steps, keywords} : r);
    } else {
      savedId = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      list.push({id: savedId, title, summary, steps, keywords});
    }
    setCustomResolutions(list);
    const wasEditing = !!editingResolutionId;
    closeEditor();
    renderTree();
    renderSideLists();
    showToast(wasEditing ? "Resolução atualizada." : "Resolução criada.");
    selectSubtopic(CUSTOM_CAT_ID, savedId);
  }

  function deleteEditorResolution(){
    if(!editingResolutionId) return;
    if(!confirm("Eliminar esta resolução personalizada? Esta ação não pode ser desfeita.")) return;
    const list = getCustomResolutions().filter(r => r.id !== editingResolutionId);
    setCustomResolutions(list);
    closeEditor();
    renderTree();
    renderSideLists();
    renderWelcome();
    showToast("Resolução eliminada.");
  }

  function wireEditor(){
    document.getElementById("btnNewResolution").addEventListener("click", () => openEditor(null));
    document.getElementById("btnEditorCancel").addEventListener("click", closeEditor);
    document.getElementById("btnEditorSave").addEventListener("click", saveEditor);
    document.getElementById("btnEditorDelete").addEventListener("click", deleteEditorResolution);
    document.getElementById("editorOverlay").addEventListener("click", (e) => {
      if(e.target.id === "editorOverlay") closeEditor();
    });
  }

  /* ---------------------------------------------------------------------
     EXPORTAR / IMPORTAR — backup das resoluções personalizadas em JSON
     --------------------------------------------------------------------- */
  function exportData(){
    const data = {
      resolveflowExport: true,
      version: 1,
      exportedAt: new Date().toISOString(),
      customResolutions: getCustomResolutions()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resolveflow-resolucoes-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Ficheiro exportado.");
  }

  function importData(file){
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try{ data = JSON.parse(reader.result); }
      catch(e){ showToast("Ficheiro inválido — não é um JSON válido."); return; }

      const incoming = Array.isArray(data.customResolutions) ? data.customResolutions : [];
      if(incoming.length === 0){
        showToast("Ficheiro sem resoluções válidas para importar.");
        return;
      }
      const current = getCustomResolutions();
      const existingIds = new Set(current.map(r => r.id));
      let added = 0;
      incoming.forEach(r => {
        if(r && r.id && r.title && Array.isArray(r.steps) && !existingIds.has(r.id)){
          current.push(r);
          existingIds.add(r.id);
          added++;
        }
      });
      setCustomResolutions(current);
      renderTree();
      renderSideLists();
      showToast(added > 0 ? (added + " resolução(ões) importada(s).") : "Nada de novo para importar (já existiam).");
    };
    reader.readAsText(file);
  }

  function wireExportImport(){
    document.getElementById("btnExportData").addEventListener("click", exportData);
    const importBtn = document.getElementById("btnImportData");
    const fileInput = document.getElementById("importFileInput");
    importBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if(file) importData(file);
      e.target.value = "";
    });
  }

  /* ---------------------------------------------------------------------
     MENU MOBILE (hamburger + gaveta lateral)
     --------------------------------------------------------------------- */
  function openMobileNav(){
    document.getElementById("treeNav").classList.add("open");
    document.getElementById("navBackdrop").classList.add("open");
  }
  function closeMobileNav(){
    document.getElementById("treeNav").classList.remove("open");
    document.getElementById("navBackdrop").classList.remove("open");
  }
  function wireMobileNav(){
    document.getElementById("btnMobileNav").addEventListener("click", openMobileNav);
    document.getElementById("navBackdrop").addEventListener("click", closeMobileNav);
  }

  /* ---------------------------------------------------------------------
     PALETA DE COMANDOS (Ctrl+K) — salta para qualquer resolução ou
     executa uma ação rápida (mudar modo, tema, criar resolução)
     --------------------------------------------------------------------- */
  let paletteActiveIndex = -1;

  function updateActiveSuggestion(items, idx){
    items.forEach((it, i) => it.classList.toggle("active", i === idx));
  }

  function openPalette(){
    const overlay = document.getElementById("paletteOverlay");
    const input = document.getElementById("paletteInput");
    overlay.classList.add("open");
    input.value = "";
    renderPaletteResults("");
    setTimeout(() => input.focus(), 30);
  }
  function closePalette(){
    document.getElementById("paletteOverlay").classList.remove("open");
  }

  function getPaletteActions(query){
    const q = normalize(query);
    const actions = [
      {
        label: state.mode === "offline" ? "✨ Mudar para modo Online (IA)" : "🔒 Mudar para modo Offline",
        run: () => setMode(state.mode === "offline" ? "online" : "offline")
      },
      {label: "🌙 Alternar tema claro/escuro", run: () => toggleTheme()},
      {label: "📝 Criar nova resolução", run: () => openEditor(null)}
    ];
    if(!q) return actions;
    return actions.filter(a => normalize(a.label).indexOf(q) !== -1);
  }

  function renderPaletteResults(query){
    const box = document.getElementById("paletteResults");
    paletteActiveIndex = -1;
    const trimmed = query.trim();
    const results = trimmed ? searchLocal(trimmed).slice(0, 8) : [];
    const actions = getPaletteActions(query);

    let html = "";
    if(actions.length){
      html += `<div class="palette-section">Ações</div>`;
      html += actions.map((a, i) => `<button type="button" class="sugg-item" data-action-idx="${i}">${a.label}</button>`).join("");
    }
    if(results.length){
      html += `<div class="palette-section">Resoluções</div>`;
      html += results.map(r => `
        <button type="button" class="sugg-item" data-cat="${r.cat.id}" data-sub="${r.sub.id}">
          <span>${escapeHtml(r.sub.title)}</span><span class="path">${escapeHtml(r.cat.name)}</span>
        </button>
      `).join("");
    }
    if(!actions.length && !results.length){
      html = `<div class="palette-empty">Sem resultados para "${escapeHtml(trimmed)}"</div>`;
    }
    box.innerHTML = html;

    box.querySelectorAll(".sugg-item[data-action-idx]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = actions[Number(btn.dataset.actionIdx)];
        closePalette();
        if(action) action.run();
      });
    });
    box.querySelectorAll(".sugg-item[data-cat]").forEach(btn => {
      btn.addEventListener("click", () => {
        closePalette();
        selectSubtopic(btn.dataset.cat, btn.dataset.sub);
      });
    });
  }

  function wireCommandPalette(){
    const overlay = document.getElementById("paletteOverlay");
    const input = document.getElementById("paletteInput");
    const openBtn = document.getElementById("btnPaletteOpen");

    openBtn.addEventListener("click", openPalette);
    overlay.addEventListener("click", (e) => { if(e.target === overlay) closePalette(); });

    input.addEventListener("input", () => renderPaletteResults(input.value));
    input.addEventListener("keydown", (e) => {
      const items = Array.from(document.getElementById("paletteResults").querySelectorAll(".sugg-item"));
      if(e.key === "ArrowDown" && items.length){
        e.preventDefault();
        paletteActiveIndex = Math.min(paletteActiveIndex + 1, items.length - 1);
        updateActiveSuggestion(items, paletteActiveIndex);
        items[paletteActiveIndex].scrollIntoView({block: "nearest"});
      } else if(e.key === "ArrowUp" && items.length){
        e.preventDefault();
        paletteActiveIndex = Math.max(paletteActiveIndex - 1, 0);
        updateActiveSuggestion(items, paletteActiveIndex);
        items[paletteActiveIndex].scrollIntoView({block: "nearest"});
      } else if(e.key === "Enter"){
        e.preventDefault();
        if(paletteActiveIndex >= 0 && items[paletteActiveIndex]){
          items[paletteActiveIndex].click();
        } else if(items.length === 1){
          items[0].click();
        }
      }
    });
  }

  /* ---------------------------------------------------------------------
     LIGAÇÕES DIRETAS (URL#categoria/subtopico) — partilháveis, com
     suporte a avançar/recuar do browser
     --------------------------------------------------------------------- */
  function updateHash(catId, subId){
    const newHash = "#" + catId + "/" + subId;
    if(location.hash !== newHash){
      history.pushState(null, "", newHash);
    }
  }
  function parseHash(){
    const h = location.hash.replace(/^#/, "");
    if(!h) return null;
    const parts = h.split("/");
    if(parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return {catId: parts[0], subId: parts[1]};
  }
  function applyHashRoute(){
    const h = parseHash();
    if(h && findCategoryAndSub(h.catId, h.subId)){
      selectSubtopic(h.catId, h.subId, {skipHash: true});
      return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------------
     ATALHOS DE TECLADO
     --------------------------------------------------------------------- */
  function wireKeyboardShortcuts(){
    document.addEventListener("keydown", (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      const typing = tag === "INPUT" || tag === "TEXTAREA";

      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"){
        e.preventDefault();
        openPalette();
        return;
      }
      if(e.key === "/" && !typing){
        e.preventDefault();
        const input = document.getElementById("searchInput");
        input.focus();
        input.select();
        return;
      }
      if(e.key === "Escape"){
        const paletteOverlay = document.getElementById("paletteOverlay");
        const editorOverlay = document.getElementById("editorOverlay");
        if(paletteOverlay.classList.contains("open")){ closePalette(); return; }
        if(editorOverlay.classList.contains("open")){ closeEditor(); return; }

        const input = document.getElementById("searchInput");
        if(document.activeElement === input && input.value){
          input.value = "";
          document.getElementById("searchSuggestions").classList.remove("open");
          if(state.selected){ renderResolution(state.selected.catId, state.selected.subId); }
          else { renderWelcome(); }
        } else if(document.activeElement === input){
          input.blur();
        } else {
          closeMobileNav();
        }
      }
    });
  }

  /* ---------------------------------------------------------------------
     DISTÂNCIA DE LEVENSHTEIN — usada para tolerar pequenos erros de
     escrita na pesquisa (ex.: "reembolo" continua a encontrar "reembolso")
     --------------------------------------------------------------------- */
  function levenshtein(a, b){
    const m = a.length, n = b.length;
    if(m === 0) return n;
    if(n === 0) return m;
    const dp = new Array(n + 1);
    for(let j = 0; j <= n; j++) dp[j] = j;
    for(let i = 1; i <= m; i++){
      let prev = dp[0];
      dp[0] = i;
      for(let j = 1; j <= n; j++){
        const tmp = dp[j];
        dp[j] = Math.min(
          dp[j] + 1,
          dp[j - 1] + 1,
          prev + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        prev = tmp;
      }
    }
    return dp[n];
  }

  /* ---------------------------------------------------------------------
     PESQUISA LOCAL — usada pelo modo offline e como 1º passo do modo
     online. Inclui as resoluções embutidas + as personalizadas, e tolera
     pequenos erros de escrita (pesquisa difusa).
     --------------------------------------------------------------------- */
  function searchLocal(query){
    const q = normalize(query).trim();
    if(!q) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    const results = [];

    getAllSubtopics().forEach(({cat, sub}) => {
      const haystackWords = normalize([
        sub.title, sub.summary, (sub.keywords || []).join(" "), sub.steps.join(" ")
      ].join(" ")).split(/\s+/).filter(Boolean);
      const haystack = haystackWords.join(" ");

      let score = 0;
      terms.forEach(t => {
        if(haystack.indexOf(t) !== -1){
          score += 1;
        } else if(t.length >= 4){
          // Sem correspondência exata: procura uma palavra "próxima" (typo-tolerante)
          const maxDist = t.length >= 7 ? 2 : 1;
          const closeMatch = haystackWords.some(w =>
            Math.abs(w.length - t.length) <= maxDist && levenshtein(w, t) <= maxDist
          );
          if(closeMatch) score += 0.5;
        }
        if(normalize(sub.title).indexOf(t) !== -1) score += 2;
        (sub.keywords || []).forEach(k => { if(normalize(k).indexOf(t) !== -1) score += 2; });
      });

      if(score > 0){
        results.push({cat, sub, score});
      }
    });

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /* ---------------------------------------------------------------------
     RENDER — árvore lateral
     --------------------------------------------------------------------- */
  function renderTree(){
    const container = document.getElementById("treeContainer");
    container.innerHTML = "";
    getTreeWithCustom().forEach(cat => {
      const wrap = document.createElement("div");
      wrap.className = "category";
      wrap.dataset.catId = cat.id;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-btn";
      btn.innerHTML = `<span class="icon-badge" style="background:${cat.color}">${cat.emoji}</span><span>${escapeHtml(cat.name)}</span><span class="chev">▶</span>`;
      btn.addEventListener("click", () => {
        wrap.classList.toggle("open");
      });

      const ul = document.createElement("ul");
      ul.className = "subtopic-list";
      cat.subtopics.forEach(sub => {
        const li = document.createElement("li");
        const subBtn = document.createElement("button");
        subBtn.type = "button";
        subBtn.innerHTML = `<span>${escapeHtml(sub.title)}</span><span class="chevron">›</span>`;
        subBtn.dataset.catId = cat.id;
        subBtn.dataset.subId = sub.id;
        subBtn.addEventListener("click", () => selectSubtopic(cat.id, sub.id));
        li.appendChild(subBtn);
        ul.appendChild(li);
      });

      wrap.appendChild(btn);
      wrap.appendChild(ul);
      container.appendChild(wrap);
    });
  }

  function markSelectedInTree(catId, subId){
    document.querySelectorAll(".subtopic-list li button").forEach(b => {
      b.classList.toggle("selected", b.dataset.catId === catId && b.dataset.subId === subId);
    });
    document.querySelectorAll(".category").forEach(c => {
      if(c.dataset.catId === catId) c.classList.add("open");
    });
  }

  /* ---------------------------------------------------------------------
     RENDER — conteúdo principal
     --------------------------------------------------------------------- */
  function renderWelcome(){
    const content = document.getElementById("content");
    content.innerHTML = `
      <div class="card welcome">
        <h2>Bem-vindo(a) ao ResolveFlow</h2>
        <p>Escolhe uma categoria na barra lateral ou pesquisa por palavra-chave para encontrar a resolução recomendada.</p>
        <ul>
          <li><strong>Modo Offline</strong> — pesquisa apenas nas notas locais desta árvore. Nenhum dado sai do teu browser.</li>
          <li><strong>Modo Online (IA)</strong> — adiciona um assistente de IA para dúvidas que não estejam no protocolo, além da pesquisa local.</li>
        </ul>
      </div>
      ${state.mode === "online" ? renderAiSectionHtml() : ""}
    `;
    if(state.mode === "online") wireAiSection();
  }

  function renderResolution(catId, subId){
    const found = findCategoryAndSub(catId, subId);
    const content = document.getElementById("content");
    if(!found){ renderWelcome(); return; }
    const {cat, sub} = found;
    const fav = isFavorite(catId, subId);
    const fb = getFeedback(catId, subId);

    content.innerHTML = `
      <div class="breadcrumb">${escapeHtml(cat.name)}<span class="sep">/</span><strong>${escapeHtml(sub.title)}</strong></div>
      <div class="card">
        <h2>${sub.emoji ? sub.emoji + " " : ""}${escapeHtml(sub.title)}</h2>
        <p class="resolution-summary">${escapeHtml(sub.summary)}</p>
        <ol class="steps">
          ${sub.steps.map(s => `<li>${escapeHtml(s)}</li>`).join("")}
        </ol>
        <div class="tag-row">
          ${(sub.keywords||[]).slice(0,6).map(k => `<span class="tag">${escapeHtml(k)}</span>`).join("")}
        </div>
        <div class="resolution-toolbar">
          <button type="button" class="icon-text-btn" id="btnCopySteps">📋 Copiar passos</button>
          <button type="button" class="icon-text-btn" id="btnCopyLink">🔗 Copiar link</button>
          <button type="button" class="icon-text-btn" id="btnPrint">🖨️ Imprimir</button>
          <button type="button" class="icon-text-btn ${fav ? "active" : ""}" id="btnFavorite">${fav ? "⭐ Favorito" : "☆ Adicionar aos favoritos"}</button>
          ${catId === CUSTOM_CAT_ID ? `<button type="button" class="icon-text-btn" id="btnEditResolution">✏️ Editar</button>` : ""}
          <div class="feedback-row">
            <span class="label">Foi útil?</span>
            <button type="button" class="icon-text-btn" id="btnFeedbackUp">👍 <span id="fbUpCount">${fb.up || ""}</span></button>
            <button type="button" class="icon-text-btn" id="btnFeedbackDown">👎 <span id="fbDownCount">${fb.down || ""}</span></button>
          </div>
        </div>
      </div>
      ${state.mode === "online" ? renderAiSectionHtml() : ""}
    `;

    document.getElementById("btnCopySteps").addEventListener("click", () => {
      const text = sub.title + "\n\n" + sub.steps.map((s, i) => (i + 1) + ". " + s).join("\n");
      copyToClipboard(text, "Passos copiados!");
    });
    document.getElementById("btnCopyLink").addEventListener("click", () => {
      const url = location.origin + location.pathname + "#" + catId + "/" + subId;
      copyToClipboard(url, "Link copiado!");
    });
    document.getElementById("btnPrint").addEventListener("click", () => window.print());
    document.getElementById("btnFavorite").addEventListener("click", () => {
      toggleFavorite(catId, subId);
      renderResolution(catId, subId);
    });
    const editBtn = document.getElementById("btnEditResolution");
    if(editBtn){
      editBtn.addEventListener("click", () => openEditor(sub));
    }
    wireFeedbackButtons(catId, subId);

    if(state.mode === "online") wireAiSection();
  }

  function selectSubtopic(catId, subId, opts){
    opts = opts || {};
    state.selected = {catId, subId};
    markSelectedInTree(catId, subId);
    renderResolution(catId, subId);
    document.getElementById("searchInput").value = "";
    document.getElementById("searchSuggestions").classList.remove("open");
    pushRecent(catId, subId);
    if(!opts.skipHash) updateHash(catId, subId);
    closeMobileNav();
  }

  /* ---------------------------------------------------------------------
     RENDER — resultados de pesquisa (usado pelos dois modos)
     --------------------------------------------------------------------- */
  function renderSearchResults(query){
    const content = document.getElementById("content");
    const results = searchLocal(query);
    const rawTerms = query.trim().split(/\s+/).filter(Boolean);

    if(results.length > 0){
      content.innerHTML = `
        <div class="search-results">
          <h3>Resultados para "${escapeHtml(query)}"</h3>
          <div class="search-results-group">
            ${results.map(r => `
              <button type="button" class="result-item" data-cat="${r.cat.id}" data-sub="${r.sub.id}">
                <span class="icon-badge" style="background:${r.cat.color}">${r.cat.emoji}</span>
                <span class="result-text">
                  <div class="path">${escapeHtml(r.cat.name)}</div>
                  <div class="title">${highlightTerms(r.sub.title, rawTerms)}</div>
                  <div class="snippet">${highlightTerms(r.sub.summary, rawTerms)}</div>
                </span>
                <span class="chevron">›</span>
              </button>
            `).join("")}
          </div>
        </div>
        ${state.mode === "online" ? renderAiSectionHtml() : ""}
      `;
      content.querySelectorAll(".result-item").forEach(btn => {
        btn.addEventListener("click", () => selectSubtopic(btn.dataset.cat, btn.dataset.sub));
      });
      if(state.mode === "online") wireAiSection();
      return;
    }

    // Sem resultados locais
    if(state.mode === "offline"){
      content.innerHTML = `
        <div class="no-results-box">
          <h3>Sem resultados no protocolo local</h3>
          <p>Não encontrámos nenhuma resolução local para "${escapeHtml(query)}".<br>
          Podes abrir um chat de IA genérico noutro separador para pesquisar — nada é enviado automaticamente.</p>
          <a class="btn" href="${GENERIC_AI_CHAT_URL}" target="_blank" rel="noopener noreferrer">↗ Abrir chat de IA genérico</a>
          <p style="margin-top:14px; font-size:12px;">Dica: no modo <strong>Online (IA)</strong> tens um assistente integrado, com acesso a esta árvore de resoluções.</p>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div class="no-results-box">
          <h3>Sem resultados no protocolo local</h3>
          <p>Não encontrámos nenhuma resolução local para "${escapeHtml(query)}". Usa o assistente de IA abaixo para tirar a dúvida.</p>
        </div>
        ${renderAiSectionHtml()}
      `;
      wireAiSection();
      // Pré-preenche a caixa de chat com a pergunta da pesquisa
      setTimeout(() => {
        const ta = document.getElementById("chatInput");
        if(ta){ ta.value = query; ta.focus(); }
      }, 0);
    }
  }

  /* =========================================================================
     MODO — toggle Offline / Online, persistido em localStorage
     ========================================================================= */
  function setMode(mode){
    state.mode = mode;
    localStorage.setItem(LS_KEYS.mode, mode);

    document.getElementById("btnModeOffline").classList.toggle("active", mode === "offline");
    document.getElementById("btnModeOffline").setAttribute("aria-selected", mode === "offline");
    document.getElementById("btnModeOnline").classList.toggle("active", mode === "online");
    document.getElementById("btnModeOnline").setAttribute("aria-selected", mode === "online");

    updatePrivacyBanner();

    // Re-renderiza o painel atual para mostrar/esconder a secção de IA
    const q = document.getElementById("searchInput").value.trim();
    if(q){
      renderSearchResults(q);
    } else if(state.selected){
      renderResolution(state.selected.catId, state.selected.subId);
    } else {
      renderWelcome();
    }
  }

  function updatePrivacyBanner(){
    const banner = document.getElementById("privacyBanner");
    const text = document.getElementById("privacyBannerText");
    banner.classList.toggle("online", state.mode === "online");
    if(state.mode === "online"){
      text.innerHTML = `<strong>Modo Online (IA) ativo:</strong> as perguntas que escreveres no chat são enviadas para um servidor externo de IA (Anthropic/Claude). ` +
        `Nunca coles dados pessoais de clientes, credenciais, ou texto de manuais internos confidenciais. ` +
        `Esta é uma ferramenta pessoal e genérica — não substitui as políticas de confidencialidade do teu empregador.`;
    } else {
      text.innerHTML = `<strong>Modo Offline:</strong> nada sai do teu browser. Nunca coles dados pessoais de clientes, credenciais, ` +
        `ou texto de manuais internos confidenciais, mesmo neste modo local. Esta ferramenta é pessoal e genérica — não substitui as ` +
        `políticas de confidencialidade do teu empregador.`;
    }
  }

  /* =========================================================================
     MODO ONLINE (IA) — gestão da chave, chat e chamada à API Anthropic
     ========================================================================= */
  function getApiKey(){
    return localStorage.getItem(LS_KEYS.apiKey) || "";
  }
  function setApiKey(key){
    localStorage.setItem(LS_KEYS.apiKey, key.trim());
  }
  function clearApiKey(){
    localStorage.removeItem(LS_KEYS.apiKey);
  }
  function maskKey(key){
    if(key.length <= 8) return "•".repeat(key.length);
    return key.slice(0,4) + "…" + key.slice(-4);
  }

  function renderAiSectionHtml(){
    const key = getApiKey();
    const keyCardHtml = key
      ? `
        <div class="ai-key-card" id="apiKeyCard">
          <h3>Assistente de IA</h3>
          <div class="key-status">
            <span class="dot"></span>
            <span>Chave guardada localmente:</span>
            <span class="masked">${escapeHtml(maskKey(key))}</span>
            <button type="button" class="btn secondary" id="btnTestKey">Testar chave</button>
            <span id="testKeyResult" class="mono" style="font-size:12px;"></span>
            <button type="button" class="btn danger" id="btnClearKey">Remover chave</button>
          </div>
        </div>
      `
      : `
        <div class="ai-key-card" id="apiKeyCard">
          <h3>Configurar chave de API (Anthropic / Claude)</h3>
          <p>
            Para usares o assistente de IA precisas da tua própria chave de API da Anthropic.
            A chave fica guardada <strong>só neste browser</strong> (localStorage) — nunca é enviada para
            este repositório nem para nenhum outro sítio além da própria API da Anthropic quando fazes uma pergunta.
            Obtém uma chave em <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>.
          </p>
          <div class="row">
            <input type="password" id="apiKeyInput" placeholder="sk-ant-••••••••••••••••••••••••" autocomplete="off">
            <button type="button" class="btn" id="btnSaveKey">Guardar chave</button>
          </div>
        </div>
      `;

    return `
      <div class="ai-section">
        ${keyCardHtml}
        ${key ? `
        <div class="chat-panel" id="chatPanel">
          <div class="chat-actions-row">
            <button type="button" class="btn secondary" id="btnStopChat" style="display:none;">⏹️ Parar</button>
            <button type="button" class="btn secondary" id="btnClearChat">🗑️ Limpar conversa</button>
          </div>
          <div class="chat-log" id="chatLog"></div>
          <div class="chat-typing" id="chatTyping">A pensar…</div>
          <div class="chat-input-row">
            <textarea id="chatInput" placeholder="Escreve a tua pergunta…" rows="1"></textarea>
            <button type="button" class="btn" id="btnSendChat">Enviar</button>
          </div>
        </div>
        ` : ""}
      </div>
    `;
  }

  function wireAiSection(){
    const saveBtn = document.getElementById("btnSaveKey");
    if(saveBtn){
      saveBtn.addEventListener("click", () => {
        const input = document.getElementById("apiKeyInput");
        const val = input.value.trim();
        if(!val){ input.focus(); return; }
        setApiKey(val);
        rerenderCurrentPanelKeepingChat();
      });
    }
    const clearBtn = document.getElementById("btnClearKey");
    if(clearBtn){
      clearBtn.addEventListener("click", () => {
        if(confirm("Remover a chave de API guardada neste browser?")){
          clearApiKey();
          state.chatHistory = [];
          sessionStorage.removeItem(LS_KEYS.chatSession);
          rerenderCurrentPanelKeepingChat();
        }
      });
    }
    const testBtn = document.getElementById("btnTestKey");
    if(testBtn){
      testBtn.addEventListener("click", testApiKey);
    }

    const stopBtn = document.getElementById("btnStopChat");
    if(stopBtn){
      stopBtn.addEventListener("click", () => {
        if(state.abortController) state.abortController.abort();
      });
    }
    const clearChatBtn = document.getElementById("btnClearChat");
    if(clearChatBtn){
      clearChatBtn.addEventListener("click", () => {
        if(state.chatHistory.length === 0) return;
        if(confirm("Limpar toda a conversa desta sessão?")){
          state.chatHistory = [];
          sessionStorage.removeItem(LS_KEYS.chatSession);
          renderChatHistory();
          showToast("Conversa limpa.");
        }
      });
    }

    const sendBtn = document.getElementById("btnSendChat");
    const chatInput = document.getElementById("chatInput");
    if(sendBtn && chatInput){
      renderChatHistory();
      sendBtn.addEventListener("click", () => handleSendChat());
      chatInput.addEventListener("keydown", (e) => {
        if(e.key === "Enter" && !e.shiftKey){
          e.preventDefault();
          handleSendChat();
        }
      });
      chatInput.addEventListener("input", () => {
        chatInput.style.height = "auto";
        chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + "px";
      });
    }
  }

  function rerenderCurrentPanelKeepingChat(){
    const q = document.getElementById("searchInput").value.trim();
    if(q){ renderSearchResults(q); }
    else if(state.selected){ renderResolution(state.selected.catId, state.selected.subId); }
    else { renderWelcome(); }
  }

  function renderChatHistory(){
    const log = document.getElementById("chatLog");
    if(!log) return;
    log.innerHTML = "";
    state.chatHistory.forEach(msg => appendChatBubble(msg.role, msg.content, false));
    log.scrollTop = log.scrollHeight;
  }

  function appendChatBubble(role, htmlOrText, isHtml){
    const log = document.getElementById("chatLog");
    if(!log) return null;
    const wrap = document.createElement("div");
    wrap.className = "chat-msg " + role;
    const label = {
      user: "Tu", assistant: "Assistente IA", system: "Sugestão local", error: "Erro"
    }[role] || role;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    if(isHtml){
      bubble.innerHTML = htmlOrText;
    } else if(role === "assistant"){
      bubble.innerHTML = renderMarkdown(htmlOrText);
    } else {
      bubble.textContent = htmlOrText;
    }
    wrap.innerHTML = `<div class="role-label">${label}</div>`;
    wrap.appendChild(bubble);
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
    return {wrap, bubble};
  }

  /* ---------------------------------------------------------------------
     MARKDOWN BÁSICO — renderização simples e segura (escapa HTML primeiro)
     das respostas da IA: negrito, itálico, código, links e listas.
     --------------------------------------------------------------------- */
  function renderMarkdown(text){
    let html = escapeHtml(text);
    html = html.replace(/```([\s\S]*?)```/g, (m, code) => "<pre><code>" + code.replace(/^\n/, "") + "</code></pre>");
    html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/(^|\n)((?:- .+(?:\n|$))+)/g, (m, pre, block) => {
      const items = block.replace(/\n$/, "").split("\n").map(l => "<li>" + l.replace(/^- /, "") + "</li>").join("");
      return pre + "<ul>" + items + "</ul>";
    });
    return html;
  }

  /* ---------------------------------------------------------------------
     PERSISTÊNCIA DO CHAT NA SESSÃO — sessionStorage (limpa ao fechar o
     separador; propositadamente não usa localStorage, por privacidade)
     --------------------------------------------------------------------- */
  function persistChatSession(){
    try{ sessionStorage.setItem(LS_KEYS.chatSession, JSON.stringify(state.chatHistory)); } catch(e){}
  }
  function loadChatSession(){
    try{
      const raw = sessionStorage.getItem(LS_KEYS.chatSession);
      if(raw) state.chatHistory = JSON.parse(raw);
    } catch(e){ state.chatHistory = []; }
  }

  function handleSendChat(forceAi){
    const chatInput = document.getElementById("chatInput");
    if(!chatInput) return;
    const text = chatInput.value.trim();
    if(!text) return;

    chatInput.value = "";
    chatInput.style.height = "auto";

    state.chatHistory.push({role:"user", content:text});
    persistChatSession();
    appendChatBubble("user", text, false);

    if(!forceAi){
      const localMatches = searchLocal(text);
      if(localMatches.length > 0){
        const best = localMatches[0];
        const html = `
          <div class="suggestion-card">
            <div class="title">💡 Encontrei isto no protocolo local:</div>
            <div>${escapeHtml(best.cat.name)} — <strong>${escapeHtml(best.sub.title)}</strong><br>
            <span style="color:var(--color-text-muted);">${escapeHtml(best.sub.summary)}</span></div>
            <div class="actions">
              <button type="button" class="btn secondary" data-action="view" data-cat="${best.cat.id}" data-sub="${best.sub.id}">Ver resolução</button>
              <button type="button" class="btn" data-action="ask-ai">Perguntar à IA mesmo assim</button>
            </div>
          </div>
        `;
        appendChatBubble("system", html, true);
        const log = document.getElementById("chatLog");
        const lastCard = log.lastElementChild.querySelector(".suggestion-card");
        lastCard.querySelector('[data-action="view"]').addEventListener("click", (e) => {
          selectSubtopic(e.target.dataset.cat, e.target.dataset.sub);
        });
        lastCard.querySelector('[data-action="ask-ai"]').addEventListener("click", () => {
          callAi(text);
        });
        return;
      }
    }

    callAi(text);
  }

  function setTyping(on){
    const t = document.getElementById("chatTyping");
    if(t) t.classList.toggle("active", on);
  }

  function callAi(userText){
    const key = getApiKey();
    if(!key){
      appendChatBubble("error", "Não há nenhuma chave de API guardada. Adiciona a tua chave da Anthropic acima para usares o assistente.", false);
      return;
    }

    setTyping(true);
    const sendBtn = document.getElementById("btnSendChat");
    const stopBtn = document.getElementById("btnStopChat");
    if(sendBtn) sendBtn.disabled = true;
    if(stopBtn) stopBtn.style.display = "inline-flex";

    const messages = state.chatHistory
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({role: m.role, content: m.content}));

    const controller = new AbortController();
    state.abortController = controller;

    const streamRef = createStreamingAssistantBubble();
    let fullText = "";

    fetch(AI_CONFIG.apiEndpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": AI_CONFIG.apiVersion,
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        max_tokens: AI_CONFIG.maxTokens,
        system: AI_CONFIG.systemPrompt,
        messages: messages,
        stream: true
      })
    })
    .then(async (res) => {
      if(!res.ok){
        const bodyText = await res.text();
        let body = {};
        try{ body = JSON.parse(bodyText); } catch(e){ /* resposta não-JSON */ }
        throw {status: res.status, body};
      }
      setTyping(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while(true){
        const {done, value} = await reader.read();
        if(done) break;
        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split("\n");
        buffer = lines.pop(); // guarda a linha incompleta para o próximo pedaço

        for(const line of lines){
          if(!line.startsWith("data:")) continue;
          const dataStr = line.slice(5).trim();
          if(!dataStr) continue;
          let evt;
          try{ evt = JSON.parse(dataStr); } catch(e){ continue; }

          if(evt.type === "content_block_delta" && evt.delta && evt.delta.type === "text_delta"){
            fullText += evt.delta.text;
            updateStreamingAssistantBubble(streamRef, fullText, true);
          } else if(evt.type === "error"){
            throw {status: 0, body: {error: evt.error}};
          }
        }
      }
    })
    .then(() => {
      updateStreamingAssistantBubble(streamRef, fullText, false);
      if(fullText){
        state.chatHistory.push({role: "assistant", content: fullText});
        persistChatSession();
      } else {
        streamRef.wrap.remove();
      }
    })
    .catch(err => {
      if(err && err.name === "AbortError"){
        updateStreamingAssistantBubble(streamRef, fullText, false);
        if(fullText){
          state.chatHistory.push({role: "assistant", content: fullText + "\n\n_(interrompido pelo utilizador)_"});
          persistChatSession();
        } else {
          streamRef.wrap.remove();
        }
        return;
      }
      streamRef.wrap.remove();
      appendChatBubble("error", formatApiError(err), false);
    })
    .finally(() => {
      setTyping(false);
      if(sendBtn) sendBtn.disabled = false;
      if(stopBtn) stopBtn.style.display = "none";
      state.abortController = null;
    });
  }

  function createStreamingAssistantBubble(){
    const log = document.getElementById("chatLog");
    const wrap = document.createElement("div");
    wrap.className = "chat-msg assistant";
    wrap.innerHTML = `<div class="role-label">Assistente IA</div>`;
    const bubble = document.createElement("div");
    bubble.className = "bubble cursor-blink";
    wrap.appendChild(bubble);
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
    return {wrap, bubble};
  }
  function updateStreamingAssistantBubble(ref, text, streaming){
    ref.bubble.innerHTML = renderMarkdown(text);
    ref.bubble.classList.toggle("cursor-blink", streaming);
    const log = document.getElementById("chatLog");
    log.scrollTop = log.scrollHeight;
  }

  /* ---------------------------------------------------------------------
     TESTAR CHAVE — pedido mínimo (max_tokens:1) só para validar a chave
     sem gastar praticamente nenhum token
     --------------------------------------------------------------------- */
  function testApiKey(){
    const key = getApiKey();
    const resultEl = document.getElementById("testKeyResult");
    const testBtn = document.getElementById("btnTestKey");
    if(!key || !resultEl) return;

    testBtn.disabled = true;
    resultEl.textContent = "A testar…";
    resultEl.style.color = "var(--color-text-muted)";

    fetch(AI_CONFIG.apiEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": AI_CONFIG.apiVersion,
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        max_tokens: 1,
        messages: [{role: "user", content: "ok"}]
      })
    })
    .then(async (res) => {
      if(!res.ok){
        const bodyText = await res.text();
        let body = {};
        try{ body = JSON.parse(bodyText); } catch(e){ /* resposta não-JSON */ }
        throw {status: res.status, body};
      }
      resultEl.textContent = "✓ Chave válida.";
      resultEl.style.color = "var(--success)";
    })
    .catch(err => {
      resultEl.textContent = "✗ " + formatApiError(err);
      resultEl.style.color = "var(--danger)";
    })
    .finally(() => {
      testBtn.disabled = false;
    });
  }

  function formatApiError(err){
    if(!err || typeof err !== "object" || !("status" in err)){
      return "Não foi possível contactar a IA. Verifica a tua ligação à internet e tenta novamente.";
    }
    const status = err.status;
    const apiMsg = err.body && err.body.error && err.body.error.message;

    if(status === 401){
      return "Chave de API inválida ou sem permissões. Verifica se colaste a chave corretamente (remove-a e adiciona de novo, se necessário).";
    }
    if(status === 0){
      return "A IA interrompeu a resposta a meio" + (apiMsg ? (": " + apiMsg) : ".") + " Tenta novamente.";
    }
    if(status === 429){
      return "Limite de pedidos atingido (rate limit) na tua conta Anthropic. Aguarda um pouco e tenta novamente.";
    }
    if(status === 400){
      return "O pedido enviado à IA foi rejeitado" + (apiMsg ? (": " + apiMsg) : ".") ;
    }
    if(status >= 500){
      return "O serviço de IA da Anthropic está indisponível de momento. Tenta novamente dentro de instantes.";
    }
    return "Ocorreu um erro ao contactar a IA (código " + status + ")" + (apiMsg ? (": " + apiMsg) : ".");
  }

  /* =========================================================================
     PESQUISA — ligação da caixa do cabeçalho
     ========================================================================= */
  function renderSuggestions(query){
    const box = document.getElementById("searchSuggestions");
    const trimmed = query.trim();
    if(!trimmed){
      box.classList.remove("open");
      box.innerHTML = "";
      return;
    }
    const results = searchLocal(trimmed).slice(0, 6);
    if(results.length === 0){
      box.classList.remove("open");
      box.innerHTML = "";
      return;
    }
    box.innerHTML = results.map(r => `
      <button type="button" class="sugg-item" data-cat="${r.cat.id}" data-sub="${r.sub.id}">
        <span>${escapeHtml(r.sub.title)}</span><span class="path">${escapeHtml(r.cat.name)}</span>
      </button>
    `).join("");
    box.classList.add("open");
    box.querySelectorAll(".sugg-item").forEach(btn => {
      // mousedown (não click) dispara antes do blur do input esconder a lista
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectSubtopic(btn.dataset.cat, btn.dataset.sub);
      });
    });
  }

  function wireSearch(){
    const input = document.getElementById("searchInput");
    const box = document.getElementById("searchSuggestions");
    let debounceTimer = null;
    let activeIndex = -1;

    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const rawValue = input.value;
      debounceTimer = setTimeout(() => {
        activeIndex = -1;
        renderSuggestions(rawValue);
        const q = rawValue.trim();
        if(q){
          state.selected = null;
          renderSearchResults(q);
        } else if(!state.selected){
          renderWelcome();
        }
      }, 180);
    });

    input.addEventListener("focus", () => {
      if(input.value.trim()) renderSuggestions(input.value);
    });
    input.addEventListener("blur", () => {
      // pequeno atraso para o mousedown da sugestão ainda registar o clique
      setTimeout(() => box.classList.remove("open"), 120);
    });

    input.addEventListener("keydown", (e) => {
      const items = Array.from(box.querySelectorAll(".sugg-item"));
      if(e.key === "ArrowDown" && items.length){
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        updateActiveSuggestion(items, activeIndex);
        return;
      }
      if(e.key === "ArrowUp" && items.length){
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActiveSuggestion(items, activeIndex);
        return;
      }
      if(e.key === "Enter"){
        e.preventDefault();
        if(activeIndex >= 0 && items[activeIndex]){
          selectSubtopic(items[activeIndex].dataset.cat, items[activeIndex].dataset.sub);
          box.classList.remove("open");
          return;
        }
        box.classList.remove("open");
        const q = input.value.trim();
        if(q) renderSearchResults(q);
      }
    });
  }

  /* ---------------------------------------------------------------------
     APAGAR TODOS OS DADOS LOCAIS — estilo RGPD: um único botão para
     remover tudo o que a app guardou neste browser
     --------------------------------------------------------------------- */
  function clearAllLocalData(){
    const ok = confirm(
      "Isto vai apagar do teu browser: a chave de API guardada, favoritos, " +
      "vistos recentemente, feedback, preferências de modo/tema e as tuas " +
      "resoluções personalizadas (\"Minhas Resoluções\").\n\n" +
      "Considera exportar as tuas resoluções personalizadas primeiro, no rodapé.\n\n" +
      "Esta ação não pode ser desfeita. Continuar?"
    );
    if(!ok) return;
    Object.keys(localStorage).forEach(k => {
      if(k.indexOf("resolveflow_") === 0) localStorage.removeItem(k);
    });
    sessionStorage.removeItem(LS_KEYS.chatSession);
    showToast("Todos os dados locais foram apagados.");
    setTimeout(() => location.reload(), 700);
  }

  /* ---------------------------------------------------------------------
     SINCRONIZAÇÃO ENTRE SEPARADORES — se mudares o modo, a chave ou o
     tema noutro separador aberto, este atualiza-se sozinho
     --------------------------------------------------------------------- */
  function handleStorageSync(e){
    if(e.key === LS_KEYS.mode){
      const newMode = e.newValue === "online" ? "online" : "offline";
      if(newMode !== state.mode){
        state.mode = newMode;
        document.getElementById("btnModeOffline").classList.toggle("active", newMode === "offline");
        document.getElementById("btnModeOffline").setAttribute("aria-selected", newMode === "offline");
        document.getElementById("btnModeOnline").classList.toggle("active", newMode === "online");
        document.getElementById("btnModeOnline").setAttribute("aria-selected", newMode === "online");
        updatePrivacyBanner();
        rerenderCurrentPanelKeepingChat();
        showToast("Modo atualizado noutro separador.");
      }
    } else if(e.key === LS_KEYS.apiKey){
      rerenderCurrentPanelKeepingChat();
    } else if(e.key === LS_KEYS.theme){
      applyTheme(getStoredTheme());
    } else if(e.key === LS_KEYS.favorites || e.key === LS_KEYS.recent){
      renderSideLists();
    } else if(e.key === LS_KEYS.customResolutions){
      renderTree();
      renderSideLists();
    }
  }

  /* =========================================================================
     INIT
     ========================================================================= */
  function init(){
    const savedMode = localStorage.getItem(LS_KEYS.mode);
    state.mode = (savedMode === "online") ? "online" : "offline";

    applyTheme(getStoredTheme());
    loadChatSession();
    renderTree();
    renderSideLists();
    wireSearch();
    wireKeyboardShortcuts();
    wireEditor();
    wireExportImport();
    wireMobileNav();
    wireCommandPalette();

    document.getElementById("btnModeOffline").addEventListener("click", () => setMode("offline"));
    document.getElementById("btnModeOnline").addEventListener("click", () => setMode("online"));
    document.getElementById("btnThemeToggle").addEventListener("click", toggleTheme);
    document.getElementById("btnClearAllData").addEventListener("click", clearAllLocalData);

    document.getElementById("btnModeOffline").classList.toggle("active", state.mode === "offline");
    document.getElementById("btnModeOnline").classList.toggle("active", state.mode === "online");
    document.getElementById("btnModeOffline").setAttribute("aria-selected", state.mode === "offline");
    document.getElementById("btnModeOnline").setAttribute("aria-selected", state.mode === "online");

    updatePrivacyBanner();

    const routed = applyHashRoute();
    if(!routed) renderWelcome();

    window.addEventListener("popstate", applyHashRoute);
    window.addEventListener("hashchange", applyHashRoute);
    window.addEventListener("storage", handleStorageSync);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
