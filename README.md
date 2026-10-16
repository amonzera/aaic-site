# AAIC · UFF — site oficial

Site da **Associação Atlética do Instituto de Computação da UFF** ([aaic.com.br](https://aaic.com.br)).
É um site estático publicado pelo **GitHub Pages a partir da raiz do branch `main`**. Usa só HTML, CSS e
JavaScript puros: não tem build, framework ou dependências para instalar.

A identidade visual (astronomia, constelações, matemática, código e antiguidade clássica, com a mascote
**Hipátia de Alexandria**) ainda está sendo fechada. Tudo o que falta definir está marcado no código e
listado em [Pendências da identidade](#pendências-da-identidade).

## Estrutura

```
.
├── index.html, sobre.html, times.html, campeonatos.html,
│   trotes.html, loja.html, eventos.html, contato.html   ← as 8 páginas (mesmas URLs de sempre)
├── 404.html          ← página de erro (usa caminhos absolutos: o Pages a serve em qualquer URL)
├── style.css         ← folha de estilo única; o bloco IDENTIDADE fica no topo
├── script.js         ← menu, revelação no scroll, contato (mailto), ano do rodapé
├── astrolabio.js     ← o astrolábio vivo da página inicial
├── assets/
│   ├── fonts/        ← fontes self-hosted (woff2) + licenças OFL
│   ├── img/          ← imagens WebP (1200 e 640 px), limbo.svg, astrolabio.svg (sem JS)
│   ├── icons.svg     ← sprite de ícones e pictogramas dos times
│   └── favicon.svg
├── CNAME             ← domínio aaic.com.br (não mexer)
└── .nojekyll         ← o Pages publica os arquivos como estão, sem passar pelo Jekyll
```

## Como editar e publicar

1. **Editar:** os arquivos HTML do repositório são a fonte da verdade (não existe gerador nem build).
   Dá para editar pelo navegador abrindo o repositório no GitHub e apertando `.` (abre o github.dev).
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
- **Time** (`times.html`): duplique um `<li class="team-row" data-reveal>…</li>` e escolha o
  pictograma (`#p-futsal`, `#p-basquete`, `#p-volei`, `#p-handebol`, `#p-esports`, `#p-cheer`).
- **Produto** (`loja.html`): duplique um `<li data-reveal>…</li>` da `.product-grid`.
- **Campeonato** (`campeonatos.html`): já existe um bloco do InterUFF comentado; descomente e preencha.
- **Imagens:**
  - Gere WebP em 1200 e 640 px de largura, com nomes em minúsculas (o Pages diferencia `.JPG` de `.jpg`).
  - Use `srcset` e sempre informe `width` e `height` reais, para a página não "pular" ao carregar.
  - Remova os metadados (EXIF/GPS) das fotos.
  - Exemplo sem instalar nada no projeto:
    `npx -y sharp-cli@6.1.0 -i foto.jpg -o assets/img/ --autoOrient -f webp -q 72 resize 1200 --withoutEnlargement`
    (o arquivo sai com o nome da foto; renomeie para `foto-1200.webp`)

## Pendências da identidade

Liste tudo que falta com:

```
grep -rn "TODO(identidade)\|TODO(conteúdo)\|data-placeholder" --include=*.html --include=*.css --include=*.js .
```

Os espaços reservados aparecem no site como uma "planta técnica": quadriculado com cruzetas nos cantos e
o formato recomendado escrito no centro.

| Item | Onde | Como trocar | Formato |
|---|---|---|---|
| **Cores oficiais** | `style.css`, bloco IDENTIDADE: `--brand-black`, `--brand-green`, `--brand-white` | Troque os 3 hex; os outros tons se recalculam. Atualize também o valor de reserva de `--green-bright` (logo abaixo), a `theme-color` dos HTML e as cores de `assets/favicon.svg` e `assets/img/limbo.svg` | hex |
| **Tipografia** | `style.css`: `@font-face` e `--font-display`, `--font-text`, `--font-mono` | Substitua os woff2 em `assets/fonts/` (com a licença) e os nomes | woff2, subset latino |
| **Logo na navegação** | `data-placeholder="logo-nav"` (todas as páginas) | Troque o conteúdo do link pela logo | SVG, ~28 px de altura |
| **Logo no rodapé** | `data-placeholder="logo-footer"` (todas as páginas) | Idem, na versão para fundo verde-escuro | SVG |
| **Logo no astrolábio** | `astrolabio.js`, grupo `data-placeholder="logo-astrolabio"` (eixo central) | Troque o `▽` por um `<path>` ou `<image>` | SVG simples, monocromático |
| **Favicon e ícone iOS** | `assets/favicon.svg`, `assets/img/apple-touch-icon.png` | Substitua os arquivos | SVG + PNG 180×180 |
| **Imagem de compartilhamento** | `assets/img/og.jpg` (provisória) | Substitua o arquivo | JPG ou PNG 1200×630 |
| **Mascote (home)** | `data-placeholder="mascote-home"` em `index.html` | Troque o `.placeholder` por `<img>` | PNG/WebP transparente, 1200×1500 |
| **Mascote (sobre)** | `data-placeholder="mascote-sobre"` em `sobre.html` | Idem | PNG/WebP transparente, 1200×1500 |
| **Fotos dos times** | `data-placeholder="time-*"` em `times.html` | Troque o `.placeholder` por `<img>` | 1600×1200 |
| **Fotos dos produtos** | `data-placeholder="produto-*"` em `loja.html` | Idem | 1200×1200, fundo neutro |
| **Arte do campeonato** | `lleague-*.webp` (Lovelace League, identidade antiga roxa) em `campeonatos.html` e na home | Hoje aparece em duotone verde; troque pela arte nova | WebP 1200 e 640 |

### Pendências de conteúdo (`TODO(conteúdo)`)

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
do acesso**. Hipátia orientou a construção de um astrolábio, segundo as cartas de seu aluno Sinésio.

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

## Decisões técnicas

- **Sem build e sem bibliotecas:** o deploy continua sendo "os arquivos da raiz". Não há dependência
  externa em tempo de execução: as fontes são locais e não existe CDN.
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
- **Ícones:** desenhados para este site no estilo de traço fino. O ícone do Discord foi adaptado do
  [Simple Icons](https://simpleicons.org) (CC0).
- **Dados astronômicos:** [SIMBAD](https://simbad.cds.unistra.fr) (CDS, Estrasburgo).
