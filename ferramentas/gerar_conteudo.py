#!/usr/bin/env python3
"""Gera os trechos de produtos, campeonatos e times a partir de dados/*.json.

Uso, na raiz do site:
    python3 ferramentas/gerar_conteudo.py              reescreve as páginas
    python3 ferramentas/gerar_conteudo.py --verificar  só confere se estão em dia

O script troca o que fica entre os comentários <!-- gerado:NOME --> e <!-- /gerado:NOME -->
e as descrições (meta description e og:description) de loja.html, times.html e
campeonatos.html. Fora desses trechos, nada é alterado. Usa só a biblioteca padrão.
"""

import argparse
import html
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
IMG = RAIZ / "assets" / "img"
INSTITUICAO = "Atlética do Instituto de Computação da UFF"

# Status aceitos em cada lista: rótulo do chip e se ele aparece "aceso" (chip--live).
STATUS_PRODUTO = {
    "a-venda": ("À venda", True),
    "pre-venda": ("Pré-venda", True),
    "em-breve": ("Em breve", False),
    "esgotado": ("Esgotado", False),
}
STATUS_CAMPEONATO = {
    "inscricoes-abertas": ("Inscrições abertas", True),
    "em-andamento": ("Em andamento", True),
    "em-breve": ("Em breve", False),
    "encerrado": ("Encerrado", False),
}
STATUS_TIME = {
    "treinos-abertos": ("Treinos abertos", True),
    "seletiva-aberta": ("Seletiva aberta", True),
    "em-atividade": ("Em atividade", True),
    "em-breve": ("Em breve", False),
}
EM_VENDA = ("a-venda", "pre-venda")
NUMEROS = ["zero", "uma", "duas", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
           "dez", "onze", "doze"]


class ErroDeDados(Exception):
    pass


# ── Texto ───────────────────────────────────────────────────────────────────

def esc(texto):
    return html.escape(texto, quote=False)


def attr(texto):
    return html.escape(texto, quote=True)


def maiuscula(texto):
    return texto[:1].upper() + texto[1:]


def minuscula(texto):
    return texto[:1].lower() + texto[1:]


def junta(itens):
    itens = list(itens)
    if len(itens) <= 1:
        return "".join(itens)
    return ", ".join(itens[:-1]) + " e " + itens[-1]


def por_extenso(n):
    return NUMEROS[n] if n < len(NUMEROS) else str(n)


def modalidades(n):
    return f"{por_extenso(n)} modalidade" + ("" if n == 1 else "s")


# ── Imagens ─────────────────────────────────────────────────────────────────

def dimensoes_webp(caminho):
    """Largura e altura de um WebP (VP8, VP8L ou VP8X), lidas do cabeçalho."""
    b = caminho.read_bytes()[:30]
    if b[:4] != b"RIFF" or b[8:12] != b"WEBP":
        raise ErroDeDados(f"{caminho.name} não é um WebP válido")
    bloco = b[12:16]
    if bloco == b"VP8X":
        return 1 + int.from_bytes(b[24:27], "little"), 1 + int.from_bytes(b[27:30], "little")
    if bloco == b"VP8 ":
        return int.from_bytes(b[26:28], "little") & 0x3FFF, int.from_bytes(b[28:30], "little") & 0x3FFF
    if bloco == b"VP8L":
        bits = int.from_bytes(b[21:25], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    raise ErroDeDados(f"{caminho.name}: formato WebP desconhecido")


def imagem(base):
    """Variações 640 e 1200 de assets/img/<base>-*.webp, com as larguras reais."""
    variacoes = []
    for tamanho in ("640", "1200"):
        arquivo = IMG / f"{base}-{tamanho}.webp"
        if arquivo.exists():
            variacoes.append((f"assets/img/{arquivo.name}", *dimensoes_webp(arquivo)))
    if not variacoes:
        raise ErroDeDados(f'imagem "{base}" não encontrada (esperado assets/img/{base}-1200.webp)')
    return variacoes


def tag_img(base, classe, sizes, alt, src="maior", antes_alt="", depois_alt='loading="lazy" decoding="async"'):
    variacoes = imagem(base)
    srcset = ", ".join(f"{caminho} {largura}w" for caminho, largura, _ in variacoes)
    origem = variacoes[-1][0] if src == "maior" else variacoes[0][0]
    _, largura, altura = variacoes[-1]
    return (f'<img class="{classe}" src="{origem}" srcset="{srcset}" sizes="{sizes}" '
            f'width="{largura}" height="{altura}" {antes_alt + " " if antes_alt else ""}alt="{attr(alt)}" {depois_alt}>')


# ── Dados ───────────────────────────────────────────────────────────────────

def carrega(nome, chave, status_validos, obrigatorios, icones):
    caminho = RAIZ / "dados" / nome
    try:
        itens = json.loads(caminho.read_text(encoding="utf-8"))[chave]
    except json.JSONDecodeError as erro:
        raise ErroDeDados(f"dados/{nome}: JSON inválido na linha {erro.lineno}: {erro.msg}")
    visiveis, ids = [], set()
    for i, item in enumerate(itens, 1):
        rotulo = f'dados/{nome}, item {i} ({item.get("id", "sem id")})'
        for campo in ("id", *obrigatorios):
            if not str(item.get(campo, "")).strip():
                raise ErroDeDados(f'{rotulo}: falta o campo "{campo}"')
        if item["id"] in ids:
            raise ErroDeDados(f'{rotulo}: id repetido')
        ids.add(item["id"])
        if item.get("status") not in status_validos:
            raise ErroDeDados(f'{rotulo}: status "{item.get("status")}" inválido. '
                              f'Use um destes: {", ".join(status_validos)}')
        if item.get("visivel", True):
            for campo in ("imagem", "foto"):
                if item.get(campo):
                    try:
                        imagem(item[campo])
                    except ErroDeDados as erro:
                        raise ErroDeDados(f"{rotulo}: {erro}")
            if item.get("icone") and item["icone"] not in icones:
                raise ErroDeDados(f'{rotulo}: ícone "{item["icone"]}" não existe em assets/icons.svg')
            visiveis.append(item)
    return visiveis


def chip(status, tabela, classe_extra=""):
    rotulo, aceso = tabela[status]
    classes = " ".join(c for c in ("chip", "chip--live" if aceso else "", classe_extra) if c)
    return f'<span class="{classes}">{esc(rotulo)}</span>'


def seta(versao, icone="i-arrow-right", classe="icon"):
    return (f'<svg class="{classe}" aria-hidden="true"><use href="assets/icons.svg?v={versao}#{icone}">'
            f'</use></svg>')


def botao_externo(rotulo, url, nome, versao, classe="btn"):
    externo = url.startswith("http")
    alvo = ' target="_blank" rel="noopener"' if externo else ""
    leitor = f'<span class="sr-only">: {esc(nome)} (abre em nova aba)</span>' if externo else ""
    return (f'<a class="{classe}" href="{attr(url)}"{alvo}>{esc(rotulo)}{leitor}'
            f'<span class="btn-icon" aria-hidden="true">{seta(versao, "i-arrow-up-right", "icon icon--sm")}'
            f'</span></a>')


# ── Loja ────────────────────────────────────────────────────────────────────

def frase_em_venda(produtos):
    """'A camisa da AAIC está em pré-venda', agrupando por status. Vazio se nada está à venda."""
    partes = []
    for status, singular, plural in (("a-venda", "está à venda", "estão à venda"),
                                     ("pre-venda", "está em pré-venda", "estão em pré-venda")):
        grupo = [p["chamada"] for p in produtos if p["status"] == status]
        if grupo:
            partes.append(f"{junta(grupo)} {singular if len(grupo) == 1 else plural}")
    return maiuscula(junta(partes)) if partes else ""


def produto_card(p, versao):
    linhas = ["<li data-reveal>", '  <article class="card product-card">', '    <div class="card-core">']
    if p.get("imagem"):
        linhas.append("      " + tag_img(p["imagem"], "product-card-img",
                                         "(min-width: 64rem) 18rem, (min-width: 48rem) 50vw, 100vw",
                                         p.get("alt", ""), src="menor"))
    else:
        linhas.append(f'      <!-- TODO(identidade): foto do produto "{p["nome"]}" (1200×1200, fundo neutro). -->')
        linhas.append(f'      <div class="placeholder placeholder--square" data-placeholder="produto-{p["id"]}"></div>')
    linhas += ['      <div class="product-card-body">', f'        <h3 class="product-card-title">{esc(p["nome"])}</h3>']
    if p.get("link") and p["status"] in EM_VENDA:
        rotulo = "Comprar" if p["status"] == "a-venda" else "Pré-venda"
        linhas.append("        " + botao_externo(rotulo, p["link"], p["nome"], versao, "btn btn--ghost"))
    else:
        linhas.append("        " + chip(p["status"], STATUS_PRODUTO))
    linhas += ["      </div>", "    </div>", "  </article>", "</li>"]
    return linhas


def loja_aviso(produtos):
    venda = frase_em_venda(produtos)
    tem_em_breve = any(p["status"] == "em-breve" for p in produtos)
    if not venda:
        frase = "Os produtos ainda não estão à venda."
    elif tem_em_breve:
        grupos = len({p["status"] for p in produtos if p["status"] in EM_VENDA})
        frase = (f"{venda} e os outros produtos chegam em breve." if grupos == 1
                 else f"{venda}. Os outros produtos chegam em breve.")
    else:
        frase = f"{venda}."
    return [f'<p class="store-cta-text">{esc(frase)} Acompanhe os lançamentos pelo Instagram da atlética.</p>']


def loja_meta(produtos):
    nomes = junta([produtos[0]["nome"]] + [minuscula(p["nome"]) for p in produtos[1:]]) if produtos else ""
    texto = f"Loja da {INSTITUICAO}: {minuscula(nomes)}." if nomes else f"Loja da {INSTITUICAO}."
    venda = frase_em_venda(produtos)
    return texto + (f" {venda}." if venda else " Em breve.")


def indice_abertura(produtos):
    venda = frase_em_venda(produtos)
    if venda:
        texto = f"{venda}. E ainda tem times, campeonatos, festas e o manual do calouro: escolha por onde começar."
    else:
        texto = "Times, campeonatos, festas, o manual do calouro e a loja da atlética. Escolha por onde começar."
    return [f'<p class="section-lede">{esc(texto)}</p>']


def card_indice(item_classe, href, titulo, chip_html, texto, cta, versao, img_html=None, extra_topo=None):
    """Card do índice da home: com mídia (imagem no topo) ou só texto."""
    linhas = [f'<div class="index-item {item_classe}" data-reveal>', f'  <a class="card index-card" href="{href}">']
    corpo = ([f"      {chip_html}"] if chip_html else []) + [
        f'      <h3 class="index-card-title">{esc(titulo)}</h3>',
        f'      <p class="index-card-text">{esc(texto)}</p>',
    ]
    link = f'<span class="index-card-cta">{esc(cta)}{seta(versao)}</span>'
    if img_html:
        linhas += ['    <div class="card-core index-card-core index-card-core--media">', img_html[0]]
        linhas += [f"      {l}" for l in img_html[1:]]
        linhas += ['      <div class="index-card-body">'] + [f"  {l}" for l in corpo] + [f"        {link}", "      </div>"]
    else:
        linhas += ['    <div class="card-core index-card-core">'] + (extra_topo or [])
        linhas += ['      <div class="index-card-body">'] + [f"  {l}" for l in corpo] + ["      </div>", f"      {link}"]
    linhas += ["    </div>", "  </a>", "</div>"]
    return linhas


def midia_indice(base, duotone):
    classe_div = "index-card-media duotone" if duotone else "index-card-media"
    classe_img = "index-card-img duotone-img" if duotone else "index-card-img"
    return [f'      <div class="{classe_div}">',
            "  " + tag_img(base, classe_img, "(min-width: 64rem) 40vw, 100vw", ""),
            "</div>"]


def indice_loja(produtos, versao):
    em_venda = [p for p in produtos if p["status"] in EM_VENDA]
    destaque = em_venda[0] if em_venda else (produtos[0] if produtos else None)
    if destaque is None:
        return card_indice("index-item--store", "loja.html", "Loja", chip("em-breve", STATUS_PRODUTO),
                           "Os produtos da atlética aparecem aqui.", "Ver produtos", versao)
    rotulo = {"pre-venda": "Pré-venda aberta", "a-venda": "À venda"}.get(destaque["status"])
    chip_html = (f'<span class="chip chip--live">{rotulo}</span>' if rotulo
                 else chip(destaque["status"], STATUS_PRODUTO))
    em_breve = [p["chamada"] for p in produtos if p["status"] == "em-breve" and p is not destaque]
    if destaque in em_venda:
        verbo = "está à venda" if destaque["status"] == "a-venda" else "está em pré-venda"
        sujeito = maiuscula(destaque.get("descricao") or destaque["chamada"])
        # Descrição com aposto ("a camisa, com Hipátia nas costas") fecha com vírgula antes do verbo.
        texto = f'{sujeito}{"," if "," in sujeito else ""} {verbo}.'
        outros = [p["chamada"] for p in em_venda[1:]]
        if outros:
            texto += f" {maiuscula(junta(outros))} também."
        if em_breve:
            texto += f' {maiuscula(junta(em_breve))} {"vem" if len(em_breve) == 1 else "vêm"} aí.'
        padrao = "Comprar agora" if destaque["status"] == "a-venda" else "Garantir na pré-venda"
        cta = destaque.get("cta") or padrao
    else:
        todos = [p["chamada"] for p in produtos if p["status"] == "em-breve"]
        texto = (f'{maiuscula(junta(todos))} {"vem" if len(todos) == 1 else "vêm"} aí.' if todos
                 else "Os produtos da atlética aparecem aqui.")
        cta = "Ver produtos"
    com_imagem = destaque if destaque.get("imagem") else next((p for p in produtos if p.get("imagem")), None)
    midia = None
    if com_imagem:
        midia = ['      <div class="index-card-media">',
                 "  " + tag_img(com_imagem["imagem"], "index-card-img", "(min-width: 64rem) 56vw, 100vw", ""),
                 "</div>"]
    return card_indice("index-item--store", "loja.html", "Loja", chip_html, texto, cta, versao, midia)


# ── Campeonatos ─────────────────────────────────────────────────────────────

def campeonato_card(c, versao, primeiro):
    linhas = ['<article class="card champ-card" data-reveal>', '  <div class="card-core champ-card-core">']
    if c.get("imagem"):
        duotone = c.get("duotone", False)
        linhas.append(f'    <div class="champ-card-media{" duotone" if duotone else ""}">')
        if c.get("pendencia"):
            linhas.append(f'      <!-- TODO(identidade): {c["pendencia"]} -->')
        img = tag_img(c["imagem"], "champ-card-img duotone-img" if duotone else "champ-card-img",
                      "(min-width: 64rem) 55vw, 100vw", c.get("alt", ""),
                      antes_alt='fetchpriority="high"' if primeiro else "",
                      depois_alt='decoding="async"' if primeiro else 'loading="lazy" decoding="async"')
        linhas += [f"      {img}", "    </div>"]
    linhas += ['    <div class="champ-card-body">', '      <div class="champ-card-chips">',
               f'        {chip(c["status"], STATUS_CAMPEONATO)}']
    if c.get("frequencia"):
        linhas.append(f'        <span class="chip chip--plain">{esc(c["frequencia"])}</span>')
    linhas.append("      </div>")
    titulo_id = ' id="destaque-title"' if primeiro else ""
    linhas.append(f'      <h2 class="champ-card-title"{titulo_id}>{esc(c["nome"])}</h2>')
    if c.get("texto"):
        linhas.append(f'      <p class="champ-card-text">{esc(c["texto"])}</p>')
    if c.get("link"):
        linhas.append("      " + botao_externo(c["link"]["rotulo"], c["link"]["url"], c["nome"], versao))
    linhas += ["    </div>", "  </div>", "</article>"]
    return linhas


def campeonatos_lista(campeonatos, versao):
    if not campeonatos:
        return ['<h2 class="sr-only" id="destaque-title">Campeonatos</h2>']
    linhas = []
    for i, c in enumerate(campeonatos):
        if i:
            linhas.append("")
        linhas += campeonato_card(c, versao, i == 0)
    return linhas


def campeonatos_meta(campeonatos):
    if not campeonatos:
        return "Campeonatos da AAIC UFF. Acompanhe as novidades no Instagram da atlética."
    if len(campeonatos) == 1:
        c = campeonatos[0]
        situacao = {"inscricoes-abertas": "com inscrições abertas", "em-andamento": "em andamento",
                    "em-breve": "em breve", "encerrado": "encerrado"}[c["status"]]
        return f'Campeonatos da AAIC UFF, com {c.get("artigo", "o")} {c["nome"]} {situacao}.'
    return f'Campeonatos da AAIC UFF: {junta(c["nome"] for c in campeonatos)}.'


def indice_campeonatos(campeonatos, versao):
    if not campeonatos:
        return card_indice("index-item--champ", "campeonatos.html", "Campeonatos", chip("em-breve", STATUS_CAMPEONATO),
                           "Os próximos campeonatos aparecem aqui.", "Ver campeonatos", versao)
    # Na home, o destaque é o primeiro com status ativo (inscrições abertas, em andamento).
    c = next((c for c in campeonatos if STATUS_CAMPEONATO[c["status"]][1]), campeonatos[0])
    midia = midia_indice(c["imagem"], c.get("duotone", False)) if c.get("imagem") else None
    return card_indice("index-item--champ", "campeonatos.html", "Campeonatos", chip(c["status"], STATUS_CAMPEONATO),
                       c.get("resumo") or c["nome"], "Ver campeonatos", versao, midia)


# ── Times ───────────────────────────────────────────────────────────────────

def time_linha(t, versao):
    linhas = ['<li class="team-row" data-reveal>',
              f'  <svg class="team-picto" aria-hidden="true"><use href="assets/icons.svg?v={versao}#{t["icone"]}"></use></svg>',
              '  <div class="team-head">', f'    <h3 class="team-name">{esc(t["nome"])}</h3>']
    if t.get("detalhe"):
        linhas.append(f'    <p class="team-meta">{esc(t["detalhe"])}</p>')
    linhas += ["  </div>", "  " + chip(t["status"], STATUS_TIME, "team-status")]
    if t.get("foto"):
        linhas += ['  <div class="team-photo">',
                   "    " + tag_img(t["foto"], "team-photo-img", "11rem", t.get("alt", f'Time de {minuscula(t["nome"])}'),
                                    src="menor"),
                   "  </div>"]
    else:
        linhas.append(f'  <!-- TODO(identidade): foto do time de {minuscula(t["nome"])} (1600×1200). -->')
        linhas.append(f'  <div class="placeholder placeholder--landscape placeholder--compact team-photo" '
                      f'data-placeholder="time-{t["id"]}"><span class="placeholder-label">Foto do time</span></div>')
    linhas.append("</li>")
    return linhas


def times_rotulo(times):
    return [f'<h2 class="label" id="modalidades-title"><span class="label-mark" aria-hidden="true">◇</span> '
            f'{maiuscula(modalidades(len(times)))}</h2>']


def times_meta(times):
    if not times:
        return f"Times da {INSTITUICAO}."
    nomes = maiuscula(junta(minuscula(t["nome"]) for t in times))
    if len(times) == 1:
        return f"{nomes}: a modalidade da {INSTITUICAO}."
    return f"{nomes}: as {modalidades(len(times))} da {INSTITUICAO}."


def indice_times(times, versao):
    picto = ['      <div class="index-picto" aria-hidden="true">']
    picto += [f'        <svg class="icon"><use href="assets/icons.svg?v={versao}#{t["icone"]}"></use></svg>' for t in times]
    picto += ["      </div>"]
    nomes = junta(minuscula(t["nome"]) for t in times)
    texto = f"{maiuscula(modalidades(len(times)))}: {nomes}." if times else "As modalidades da atlética aparecem aqui."
    linhas = card_indice("index-item--teams", "times.html", "Times", None, texto, "Ver times", versao,
                         extra_topo=picto if times else None)
    # No card de Times, o link fica dentro do corpo, logo abaixo do texto.
    i = linhas.index("      </div>", linhas.index('      <div class="index-card-body">'))
    link = linhas.pop(i + 1)
    linhas.insert(i, "  " + link)
    return linhas


# ── Páginas ─────────────────────────────────────────────────────────────────

def versao_assets(texto):
    achado = re.search(r"assets/icons\.svg\?v=(\d{8})", texto)
    if not achado:
        raise ErroDeDados("não achei a versão dos assets (?v=AAAAMMDD) na página")
    return achado.group(1)


def troca_trecho(texto, nome, linhas, arquivo):
    padrao = re.compile(rf"^([ \t]*)(<!-- gerado:{nome} [^\n]*-->\n)(.*?)^([ \t]*<!-- /gerado:{nome} -->)",
                        re.M | re.S)
    achado = padrao.search(texto)
    if not achado:
        raise ErroDeDados(f"{arquivo}: marcador <!-- gerado:{nome} … --> não encontrado")
    recuo = achado.group(1)
    corpo = "".join((recuo + l if l else "") + "\n" for l in linhas)
    return texto[:achado.start(3)] + corpo + texto[achado.end(3):]


def troca_meta(texto, descricao):
    valor = attr(descricao)
    texto = re.sub(r'(<meta name="description" content=")[^"]*(">)', rf"\g<1>{valor}\g<2>", texto, count=1)
    return re.sub(r'(<meta property="og:description" content=")[^"]*(">)', rf"\g<1>{valor}\g<2>", texto, count=1)


def main():
    parser = argparse.ArgumentParser(description="Gera produtos, campeonatos e times a partir de dados/*.json.")
    parser.add_argument("--verificar", action="store_true",
                        help="não escreve nada; sai com erro se alguma página estiver desatualizada")
    args = parser.parse_args()

    try:
        icones = set(re.findall(r'id="([a-z0-9-]+)"', (RAIZ / "assets" / "icons.svg").read_text(encoding="utf-8")))
        produtos = carrega("loja.json", "produtos", STATUS_PRODUTO, ("nome", "chamada", "status"), icones)
        campeonatos = carrega("campeonatos.json", "campeonatos", STATUS_CAMPEONATO, ("nome", "status"), icones)
        times = carrega("times.json", "times", STATUS_TIME, ("nome", "icone", "status"), icones)

        paginas = {}
        for arquivo in ("index.html", "loja.html", "campeonatos.html", "times.html"):
            paginas[arquivo] = (RAIZ / arquivo).read_text(encoding="utf-8")
        novas = {}

        t = paginas["loja.html"]
        v = versao_assets(t)
        t = troca_trecho(t, "produtos", [l for p in produtos for l in produto_card(p, v)], "loja.html")
        t = troca_trecho(t, "loja-aviso", loja_aviso(produtos), "loja.html")
        novas["loja.html"] = troca_meta(t, loja_meta(produtos))

        t = paginas["campeonatos.html"]
        v = versao_assets(t)
        t = troca_trecho(t, "campeonatos", campeonatos_lista(campeonatos, v), "campeonatos.html")
        novas["campeonatos.html"] = troca_meta(t, campeonatos_meta(campeonatos))

        t = paginas["times.html"]
        v = versao_assets(t)
        t = troca_trecho(t, "times-rotulo", times_rotulo(times), "times.html")
        t = troca_trecho(t, "times", [l for tm in times for l in time_linha(tm, v)], "times.html")
        novas["times.html"] = troca_meta(t, times_meta(times))

        t = paginas["index.html"]
        v = versao_assets(t)
        t = troca_trecho(t, "indice-abertura", indice_abertura(produtos), "index.html")
        t = troca_trecho(t, "indice-loja", indice_loja(produtos, v), "index.html")
        t = troca_trecho(t, "indice-campeonatos", indice_campeonatos(campeonatos, v), "index.html")
        novas["index.html"] = troca_trecho(t, "indice-times", indice_times(times, v), "index.html")
    except ErroDeDados as erro:
        print(f"Erro: {erro}", file=sys.stderr)
        return 2

    mudadas = [arquivo for arquivo, texto in novas.items() if texto != paginas[arquivo]]
    if args.verificar:
        if mudadas:
            print("Desatualizadas (rode python3 ferramentas/gerar_conteudo.py): " + ", ".join(mudadas))
            return 1
        print("Tudo em dia.")
        return 0
    for arquivo in mudadas:
        (RAIZ / arquivo).write_text(novas[arquivo], encoding="utf-8")
    print(f"{len(produtos)} produtos, {len(campeonatos)} campeonatos e {len(times)} times visíveis.")
    print("Atualizadas: " + (", ".join(mudadas) if mudadas else "nenhuma (já estava tudo em dia)"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
