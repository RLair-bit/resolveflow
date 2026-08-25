# Estratégia de branches — ResolveFlow

Projeto pessoal, mas organizado com um fluxo simples ao estilo Git Flow,
para manter o histórico limpo e o `main` sempre estável.

## Branches principais

- **`main`** — está sempre pronto a usar/publicar. Só recebe merges vindos
  de `develop` (ou `hotfix/*` em emergências). Cada merge para `main`
  corresponde a uma versão, marcada com uma tag (`v0.1.0`, `v0.2.0`, ...).
- **`develop`** — branch de integração. É onde as `feature/*` são
  juntas e testadas antes de irem para `main`.

## Branches de apoio

- **`feature/<nome-curto>`** — uma funcionalidade ou leva de melhorias
  (ex.: `feature/dark-mode-shortcuts`, `feature/ai-streaming-chat`).
  Nasce de `develop`, é fechada com merge de volta para `develop`.
- **`hotfix/<nome-curto>`** — correção urgente sobre `main` (ex.: uma
  chave a vazar sem querer, um erro que parte o modo Offline). Nasce de
  `main`, junta-se de volta a `main` **e** a `develop`.
- **`docs/<nome-curto>`** — alterações só de documentação (README,
  `docs/USAGE.md`, etc.) quando não vêm junto com uma feature.

## Fluxo típico

```bash
git checkout develop
git pull
git checkout -b feature/nome-da-feature

# ... commits ...

git checkout develop
git merge --no-ff feature/nome-da-feature
git branch -d feature/nome-da-feature
git push origin develop
```

Quando `develop` estiver estável e pronto a "lançar":

```bash
git checkout main
git merge --no-ff develop
git tag -a v0.X.0 -m "Descrição breve da versão"
git push origin main --tags
```

## Convenção das mensagens de commit

Prefixo no estilo [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` documentação
- `style:` CSS/visual sem alterar comportamento
- `refactor:` reorganização de código sem mudar comportamento
- `chore:` tarefas de manutenção (branches, tags, config)

## Versão atual

- `main` → `v0.1.0` (release inicial: modo Offline/Online, árvore de
  decisão, chat de IA com streaming, tema, favoritos, deep links, etc.)
- `develop` → aponta para o mesmo commit que `main` até à próxima feature.
