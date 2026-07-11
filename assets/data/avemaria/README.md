# Bíblia Ave Maria (embarcada)

Estes 73 arquivos JSON são a **Bíblia católica Ave Maria completa** — um arquivo por
livro (`gn.json` = Gênesis, `tb.json` = Tobias, `ps.json` = Salmos…), embarcada no app
para que a versão AM funcione **100% offline**, incluindo os 7 deuterocanônicos que
não existem na API evangélica (NVI/ACF/ARC).

- **Formato**: `{ id, name, chapters: string[][] }` — mesmo shape da API remota.
- **Carregamento**: preguiçoso, via `index.ts` — cada livro só entra na memória
  quando é lido pela primeira vez.
- **Origem**: gerados a partir de
  [fidalgobr/bibliaAveMariaJSON](https://github.com/fidalgobr/bibliaAveMariaJSON)
  (extração não-oficial; a tradução é © Editora Ave Maria — para publicar o app
  nas lojas seria preciso licença da editora).
- **Detalhes**: Salmos seguem a numeração da Vulgata; Ester tem 16 capítulos e
  Daniel 14 (acréscimos gregos do cânon católico); asteriscos de notas de rodapé
  foram removidos na geração.

> São arquivos **gerados** — não edite à mão. No VS Code eles ficam ocultos do
> explorador (veja `.vscode/settings.json`); este README e o `index.ts` continuam
> visíveis.
