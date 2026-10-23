# AAIC · UFF — site oficial

Site da **Associação Atlética do Instituto de Computação da UFF** ([aaic.com.br](https://aaic.com.br)).
É um site estático publicado pelo **GitHub Pages a partir da raiz do branch `main`**. Usa só HTML, CSS e
JavaScript puros: não tem build, framework ou dependências para instalar. Produtos, campeonatos e times
vêm de arquivos em `dados/`, e um script em Python puro escreve o HTML deles
(ver [Produtos, campeonatos e times](#produtos-campeonatos-e-times)).

A identidade visual (astronomia, constelações, matemática, código e antiguidade clássica, com a mascote
**Hipátia de Alexandria**) já usa a paleta oficial, o monograma e a Hipátia do kit de branding; a
tipografia ainda é provisória. Tudo o que falta está marcado no código e listado em
[Pendências da identidade](#pendências-da-identidade).

## Estrutura

```
.
├── index.html, sobre.html, times.html, campeonatos.html,
│   trotes.html, loja.html, eventos.html, contato.html   ← as 8 páginas (mesmas URLs de sempre;
│                                                           trotes.html é o Manual do calouro)
├── 404.html          ← página de erro (usa caminhos absolutos: o Pages a serve em qualquer URL)
├── style.css         ← folha de estilo única; o bloco IDENTIDADE fica no topo
├── script.js         ← menu, revelação no scroll, contato (mailto), ano do rodapé
├── astrolabio.js     ← o astrolábio vivo da página inicial
├── assets/
│   ├── fonts/        ← fontes self-hosted (woff2) + licenças OFL
│   ├── img/          ← imagens WebP (1200 e 640 px), limbo.svg, astrolabio.svg (sem JS)
│   ├── icons.svg     ← sprite de ícones, pictogramas dos times e o monograma (#aaic-monograma)
│   └── favicon.png
├── dados/            ← loja.json, campeonatos.json e times.json (a fonte desses três conteúdos)
├── ferramentas/
│   └── gerar_conteudo.py ← escreve no HTML o que está em dados/ (só Python 3, sem instalar nada)
├── robots.txt, sitemap.xml ← rastreamento pelo Google (ver [SEO](#seo))
├── CNAME             ← domínio aaic.com.br (não mexer)
└── .nojekyll         ← o Pages publica os arquivos como estão, sem passar pelo Jekyll
```

## Como editar e publicar

1. **Editar:** os arquivos HTML do repositório são a fonte da verdade, com uma exceção: produtos,
   campeonatos e times se editam em `dados/` (veja abaixo). Dá para editar pelo navegador abrindo o
   repositório no GitHub e apertando `.` (abre o github.dev).
2. **Testar localmente:** na pasta do site, rode `python3 -m http.server 8080` e abra
   <http://localhost:8080>. Abrir o HTML direto pelo arquivo (`file://`) não carrega os ícones do sprite.
3. **Publicar:** faça commit no `main`. O Pages atualiza em cerca de 1 minuto, e o cache dos
   visitantes dura até 10 minutos.
4. **Mudou CSS, JS ou ícones?** Troque a versão `?v=AAAAMMDD` em todas as páginas para furar o cache
   (substitua `AAAAMMDD` pela data do dia):
   `sed -i -E 's/\?v=[0-9]{8}/?v=AAAAMMDD/g' *.html`
5. **Navegação e rodapé** se repetem em todas as páginas, entre os comentários `<!-- chrome:nav -->` e
   `<!-- chrome:footer -->`. Se mudar um, mude todos. Em cada página, o link da própria página leva
   `aria-current="page"` (é isso que marca o item ativo no menu).

### Convenções do código

- **CSS:** classes simples no formato `bloco-parte` e `bloco--variante` (ex.: `.team-row`,
  `.chip--live`). Estado vai em atributo (`aria-expanded`, `aria-current`, `data-*`). Não use IDs nem
  `style=""`.
- **Cores:** sempre por token. Os tokens `--bg`, `--text`, `--accent` e `--line` mudam sozinhos dentro
  de `.section--light` (página clara) e `.section--green` (plano verde), então os componentes funcionam
  em qualquer fundo.
- **JS:** encontra os elementos por atributos `data-*`; as classes são do CSS. As únicas classes que o JS
  adiciona são as de estado da revelação (`reveal-ready`, `is-visible`) e as do SVG que o
  `astrolabio.js` gera.
- **Movimento:** só `transform` e `opacity`, sempre respeitando `prefers-reduced-motion`.

## Adicionar conteúdo

Copie um bloco existente e edite. Os blocos já trazem a revelação no scroll (`data-reveal`).

- **Evento** (`eventos.html`): duplique um `<article class="event-item" data-reveal>…</article>`. O
  primeiro (`event-item--feature`) é o destaque em largura total.
- **Time, produto ou campeonato:** não edite o HTML; veja
  [Produtos, campeonatos e times](#produtos-campeonatos-e-times).
- **Manual do calouro** (`trotes.html`, "Calouros" no menu, logo depois de "Início"):
  - **Grupo do WhatsApp:** o link aparece em dois lugares da página (botão do topo e passo 01), ambos
    marcados com `TODO(conteúdo)`. Até o grupo abrir, os dois apontam para o Instagram e o topo mostra o
    aviso "Link em breve" (parágrafo `calouro-pending`). Com o convite em mãos, troque os dois `href`,
    apague os trechos `sr-only` que falam em "link em breve" e o parágrafo do aviso.
  - **Cronograma do trote:** cada etapa tem Data, Horário e Local. Troque o "a confirmar" pelo valor
    (para datas, `<time datetime="2027-03-15">15/03</time>`) e apague o atributo `data-pending` do
    `<dd>`: é ele que deixa o campo apagado, em fonte mono.
  - A home chama o manual em três pontos: o link "Sou calouro" do hero, a faixa logo abaixo dele e o
    card do índice.
- **Imagens:**
  - Gere WebP em 1200 e 640 px de largura, com nomes em minúsculas (o Pages diferencia `.JPG` de `.jpg`).
  - Use `srcset` e sempre informe `width` e `height` reais, para a página não "pular" ao carregar.
  - Remova os metadados (EXIF/GPS) das fotos.
  - Exemplo sem instalar nada no projeto:
    `npx -y sharp-cli@6.1.0 -i foto.jpg -o assets/img/ --autoOrient -f webp -q 72 resize 1200 --withoutEnlargement`
    (o arquivo sai com o nome da foto; renomeie para `foto-1200.webp`)

## Produtos, campeonatos e times

A loja, os campeonatos e os times aparecem em mais de um lugar: na página de cada um, nos cards do índice
da home, nas contagens ("Seis modalidades") e na descrição da página no Google. Por isso eles têm uma
fonte só, em `dados/`, e o script `ferramentas/gerar_conteudo.py` escreve o HTML de todos esses lugares.

1. Edite `dados/loja.json`, `dados/campeonatos.json` ou `dados/times.json`.
2. Na raiz do site, rode `python3 ferramentas/gerar_conteudo.py`.
3. Confira as páginas localmente e faça o commit dos dados junto com o HTML.

O script só mexe no que fica entre os comentários `<!-- gerado:… -->` e `<!-- /gerado:… -->` (não edite
o HTML dentro deles, que será sobrescrito) e nas `meta description` de `loja.html`, `times.html` e
`campeonatos.html`. Se algo estiver errado nos dados, ele avisa e não muda nada. Para só conferir se as
páginas estão em dia, rode com `--verificar`.

- **Esconder sem apagar:** `"visivel": false` em qualquer item.
- **Ordem:** a da lista no JSON. Na home, o destaque é o primeiro produto à venda (ou em pré-venda) e o
  primeiro campeonato com status ativo.
- **Imagens:** informe só o nome-base (`"imagem": "camisa-aaic"` usa `assets/img/camisa-aaic-640.webp` e
  `-1200.webp`). Largura e altura são lidas do arquivo. Sem imagem, entra o placeholder com `TODO(identidade)`.

| Arquivo | Campos | Status aceitos |
|---|---|---|
| `loja.json` | `id`, `nome`, `chamada` (como o produto aparece numa frase: "a camisa da AAIC", "os bottons"), `status`; opcionais: `descricao` (frase do card da home), `imagem`, `alt`, `link` (formulário ou página de compra), `cta` (texto do link no card da home) | `a-venda`, `pre-venda`, `em-breve`, `esgotado` |
| `campeonatos.json` | `id`, `nome`, `status`; opcionais: `frequencia`, `texto`, `resumo` (card da home), `imagem`, `alt`, `duotone`, `pendencia` (vira `TODO(identidade)`), `link` (`{"rotulo", "url"}`), `artigo` ("o", padrão; ou "a") | `inscricoes-abertas`, `em-andamento`, `em-breve`, `encerrado` |
| `times.json` | `id`, `nome`, `icone` (pictograma do `icons.svg`: `p-futsal`, `p-basquete`, `p-volei`, `p-handebol`, `p-esports`, `p-cheer`), `status`; opcionais: `detalhe` (ex.: "Masculino e feminino"), `foto`, `alt` | `treinos-abertos`, `seletiva-aberta`, `em-atividade`, `em-breve` |

Para criar um status novo ou mudar o rótulo de um chip, edite as tabelas `STATUS_*` no topo do script.

## Pendências da identidade

Liste tudo que falta com:

```
grep -rn "TODO(identidade)\|TODO(conteúdo)\|data-placeholder" --include=*.html --include=*.css --include=*.js .
```

Os espaços reservados aparecem no site como uma "planta técnica": quadriculado com cruzetas nos cantos.
Nos times, o formato recomendado vem escrito no centro; na loja, o espaço fica vazio, sem texto.

| Item | Onde | Como trocar | Formato |
|---|---|---|---|
| **Tipografia** | `style.css`: `@font-face` e `--font-display`, `--font-text`, `--font-mono` | Substitua os woff2 em `assets/fonts/` (com a licença) e os nomes | woff2, subset latino |
| **Fotos dos times** | `data-placeholder="time-*"` em `times.html` | Salve `assets/img/<nome>-640.webp` e `-1200.webp`, ponha `"foto": "<nome>"` no time em `dados/times.json` e rode o gerador | 1600×1200 |
| **Fotos dos produtos** | `data-placeholder="produto-*"` em `loja.html` (caneca, bottons, uniforme) | Salve a foto em `assets/img/`, ponha `"imagem"` e `"alt"` no produto em `dados/loja.json` e rode o gerador | 1200×1200, fundo neutro |
| **Arte do campeonato** | `lleague-*.webp` (Lovelace League, identidade antiga roxa) em `campeonatos.html` e na home | Hoje aparece em duotone verde; troque pela arte nova no campo `imagem` de `dados/campeonatos.json` (e apague `pendencia`) | WebP 1200 e 640 |

### O que já veio do kit de branding

Os arquivos de origem ficam fora deste repositório, na pasta do projeto da AAIC (`logos/`, `camisa/`).

| Item | Origem | Onde está no site |
|---|---|---|
| **Paleta oficial** | `#0A0A0A`, `#0F3D2E`, `#FFFFFF` (o cinza `#D9D9D9` não tem token) | Bloco IDENTIDADE do `style.css`, `theme-color` dos HTML, `favicon.png` e `limbo.svg`. O acento menta (`--green-bright`) continua derivado do verde e fora da paleta: é decisão em aberto do kit. Se as cores mudarem, atualize também o valor de reserva dele, logo abaixo do bloco |
| **Monograma** (logo primária) | `logos/1-primaria/monograma/svg/aaic-monograma-og-branco.svg` | Símbolo `#aaic-monograma` do sprite (nav e rodapé), constante `MONOGRAM` do `astrolabio.js` (eixo), `favicon.png` e `apple-touch-icon.png`. Sempre em branco: verde sobre preto reprova no contraste (1,63:1) |
| **Hipátia** (logo secundária) | `camisa/Versão Camisa Preta/Estampa Costas/Elementos/01-…` e `02-…png`, com o marfim trocado por branco | `hipatia-circulo-*.webp` (home) e `hipatia-*.webp` (sobre) |
| **Camisa da AAIC** | `camisa/Versão Camisa Preta/Mockups/mockup-branco-no-preto-camisa-preta.jpg`, recorte quadrado das costas | `camisa-aaic-*.webp` (loja) |
| **Imagem de compartilhamento** | Composição com a Hipátia e as fontes do site | `assets/img/og.jpg` (1200×630) |

### Pendências de conteúdo (`TODO(conteúdo)`)

- **Manual do calouro** (`trotes.html`):
  - Falta o link do grupo de WhatsApp dos calouros.
  - Faltam data, horário e local das quatro etapas do trote.
  - As regras de "Nosso compromisso" e as respostas das dúvidas são provisórias: revisar com a diretoria.

- **Tese do hero:** "∃! atlética ∀ curso ∈ IC." A ordem é intencional: "existe uma única atlética para
  todo curso do IC". Com `∀` antes de `∃!`, leria "cada curso com a sua atlética".
- **"Por que Hipátia?"** (home e sobre): texto provisório, para revisar com a diretoria.
- **Subtítulo de Campeonatos:** "Onde a teoria vira jogada." Substitui o antigo, que citava a Hidra.
- **Inscrição do astrolábio:** atributo `data-inscription` em `index.html`. O trecho em hex
  (`23 68 69 70 61 74 69 61`) decodifica para `#hipatia`. Quem abrir `aaic.com.br/#hipatia` vê uma nota
  escondida na seção da Hipátia da home; não é preciso nenhum link para ela.
- **Discord:** falta o link de convite (e outras redes, se houver).
- **Eventos:**
  - A UFFEST (14/03) já aconteceu: atualizar a data ou trocar o destaque.
  - Os "Saber mais" apontam para o Instagram até cada evento ter um link próprio.

## O astrolábio vivo

A página inicial abre com um astrolábio que mostra o **céu real sobre o IC (22°54′S 43°08′O) no momento
do acesso**. O aluno de Hipátia, Sinésio, conta que projetou um astrolábio com o que aprendeu com ela.

- **Como funciona:**
  - Usa a projeção estereográfica de um astrolábio austral: o centro é o polo sul celeste, e a borda da
    placa é o trópico de Câncer.
  - O tímpano (horizonte, almucântaras e azimutes) depende só da latitude.
  - A rete (estrelas, constelações, eclíptica e Sol) gira com o tempo sidéreo local, recalculado a cada
    minuto.
  - As coordenadas das estrelas (J2000) foram conferidas na SIMBAD.
- **Para editar:**
  - A inscrição do limbo fica no atributo `data-inscription` do HTML.
  - O catálogo de estrelas e as figuras ficam no topo de `astrolabio.js`.
- **Coisas que parecem bug, mas não são:**
  - Órion aparece "de cabeça para cima", como no hemisfério norte. É porque, de Niterói, ele passa
    além do zênite.
  - A placa não é espelhada como a bandeira do Brasil, que mostra o céu visto de fora.
  - O Cruzeiro do Sul aparece numa lupa ×5 com linha-guia: perto do polo a projeção encolhe, e ele
    viraria um borrão de poucos pixels.
- **Acessibilidade:** o desenho é decorativo (`aria-hidden`). A informação vai em texto na legenda: hora
  em Niterói, tempo sidéreo e constelações acima do horizonte. Com `prefers-reduced-motion`, aparece
  direto no estado final, sem animação.
- **Sem JavaScript:** mostra `assets/img/astrolabio.svg`, um retrato estático. Se as cores da marca
  mudarem, gere esse arquivo de novo a partir da página.

## SEO

Tudo fica no `<head>` e em dois arquivos da raiz; o corpo das páginas não carrega nada de SEO.

- **Títulos e descrições** citam os três cursos por extenso (Ciência da Computação, Sistemas de
  Informação e IA e Ciência de Dados), para o site aparecer nas buscas por qualquer um deles. As
  descrições de `loja.html`, `times.html` e `campeonatos.html` vêm do `gerar_conteudo.py`.
- **`sitemap.xml`** lista as 8 páginas com a mesma URL do `canonical` de cada uma. Criou ou removeu uma
  página? Atualize o sitemap.
- **Dados estruturados (JSON-LD)**, no fim do `<head>`:
  - Home: `WebSite` e `SportsOrganization`. Mudou o nome, o e-mail, o Instagram ou o endereço? Atualize
    ali também.
  - Páginas internas: `BreadcrumbList` com os mesmos rótulos da trilha "AAIC / Página" do topo.
- **Fora do repositório:** a propriedade de domínio no Google Search Console (verificada por TXT no
  DNS), com o `sitemap.xml` enviado, e o Perfil da Empresa no Google. Links vindos do site do IC, dos
  centros acadêmicos e da bio do Instagram são o que mais ajuda nas buscas genéricas.

## Decisões técnicas

- **Sem build e sem bibliotecas:** o deploy continua sendo "os arquivos da raiz". Não há dependência
  externa em tempo de execução: as fontes são locais e não existe CDN. O `gerar_conteudo.py` roda só na
  máquina de quem edita, e o HTML que ele escreve vai para o repositório: o site não depende de JavaScript
  para mostrar produtos, campeonatos e times.
- **Desempenho:**
  - Fontes em subset latino (~78 KB no total), duas com `preload`.
  - Imagens WebP com `srcset` e `loading="lazy"`.
  - Animações só em `transform`/`opacity`, com IntersectionObserver no lugar de listener de scroll.
  - O astrolábio pausa fora da tela e com a aba oculta.
- **Melhorias progressivas:** transição suave entre páginas (View Transitions, no Chromium e no Safari)
  e pré-carregamento de links internos ao passar o mouse (Speculation Rules, no Chromium). Nos outros
  navegadores, tudo funciona normalmente, só sem esses extras.
- **Acessibilidade:**
  - Link "Pular para o conteúdo" e `aria-current` em cada página.
  - Menu com `inert`, Esc e retorno de foco.
  - Foco sempre visível e contraste AA medido. O verde-escuro puro sobre preto dá 1,6:1, por isso é
    usado só em planos, e o texto em verde usa o tom derivado `--green-bright`.
- **Contato:** o formulário não envia nada a servidor. Ele abre o app de e-mail da pessoa com a mensagem
  pronta (`mailto:`), e o botão "Copiar" serve de alternativa. A mensagem tem limite de 800 caracteres
  para o link não passar do tamanho que alguns apps de e-mail ainda truncam.

## Créditos e licenças

- **Fontes** (SIL Open Font License 1.1; os textos estão em `assets/fonts/OFL-*.txt`):
  - Castoro Titling — Tiro Typeworks
  - Hanken Grotesk — Alfredo Marco Pradil
  - JetBrains Mono — JetBrains
- **Ícones:** desenhados para este site no estilo de traço fino (inclusive o de WhatsApp, que é um
  balão de conversa, não a logo oficial). O ícone do Discord foi adaptado do
  [Simple Icons](https://simpleicons.org) (CC0).
- **Dados astronômicos:** [SIMBAD](https://simbad.cds.unistra.fr) (CDS, Estrasburgo).
