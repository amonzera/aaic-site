/* AAIC · UFF — interações comuns a todas as páginas.
   Sem dependências. Cada recurso só roda se os elementos dele existirem.
   O JS encontra os elementos por atributos data-* (as classes são do CSS); as únicas classes
   que ele adiciona são de estado da animação de revelação (reveal-ready e is-visible). */
(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /* ── Menu (mobile/tablet) ─────────────────────────────────────────────── */
  const nav = document.querySelector('[data-nav]');
  const toggle = document.querySelector('[data-nav-toggle]');
  const panel = document.querySelector('[data-nav-panel]');

  if (nav && toggle && panel) {
    const desktop = matchMedia('(min-width: 64rem)');
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    const setMenu = (open, { restoreFocus = false } = {}) => {
      toggle.setAttribute('aria-expanded', String(open));
      root.toggleAttribute('data-menu-open', open);
      // Com o menu aberto, todo o resto da página fica inerte (fora do foco e do leitor de tela).
      for (const el of document.body.children) {
        if (el !== nav && !el.contains(nav)) el.inert = open;
      }
      if (open) panel.querySelector('a')?.focus();
      else if (restoreFocus) toggle.focus();
    };

    toggle.addEventListener('click', () => setMenu(!isOpen(), { restoreFocus: isOpen() }));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) setMenu(false, { restoreFocus: true });
    });

    panel.addEventListener('click', (event) => {
      if (event.target.closest('a') && isOpen()) setMenu(false);
    });

    desktop.addEventListener('change', (event) => {
      if (event.matches && isOpen()) setMenu(false);
    });

    // Ao sair (ou voltar pelo histórico), a página nunca reaparece com o menu aberto.
    addEventListener('pagehide', () => {
      if (isOpen()) setMenu(false);
    });
  }

  /* ── Revelação no scroll (IntersectionObserver; nunca listener de scroll) ── */
  const revealables = document.querySelectorAll('[data-reveal]');

  if (revealables.length && 'IntersectionObserver' in window && !reducedMotion.matches) {
    // Escalonamento entre irmãos revelados juntos.
    for (const el of revealables) {
      const siblings = [...el.parentElement.children].filter((child) => child.hasAttribute('data-reveal'));
      el.style.setProperty('--i', String(siblings.indexOf(el) % 4));
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    root.classList.add('reveal-ready');
    revealables.forEach((el) => observer.observe(el));
  }

  /* ── Copiar para a área de transferência ──────────────────────────────── */
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      window.prompt('Copie o endereço:', text);
      return false;
    }
  };

  const copyStatus = document.querySelector('[data-copy-status]'); // região "status" invisível, para leitor de tela
  const copyTimers = new WeakMap();

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;
    const copied = await copyText(button.dataset.copy);
    if (!copied) return;
    if (copyStatus) copyStatus.textContent = `Endereço ${button.dataset.copy} copiado.`;
    const label = button.querySelector('[data-copy-label]');
    if (!label) return;
    label.dataset.original ??= label.textContent; // guarda o rótulo original uma única vez
    label.textContent = 'Copiado';
    clearTimeout(copyTimers.get(label));
    copyTimers.set(label, setTimeout(() => { label.textContent = label.dataset.original; }, 2200));
  });

  /* ── Contato: monta um e-mail pronto no app de e-mail da pessoa (mailto) ── */
  const form = document.querySelector('[data-contact-form]');

  if (form) {
    const status = form.querySelector('[data-contact-status]');
    const address = form.dataset.mailto;
    form.noValidate = true; // validação própria, com o erro junto de cada campo

    const showError = (field) => {
      // "required" aceita só espaços; aqui isso conta como campo vazio.
      if (field.required) field.setCustomValidity(field.value.trim() ? '' : 'Preencha este campo.');
      const error = form.querySelector(`[data-error-for="${field.name}"]`);
      const invalid = !field.validity.valid;
      field.setAttribute('aria-invalid', String(invalid));
      if (!error) return;
      error.hidden = !invalid;
      if (!invalid) return;
      if (field.validity.valueMissing) error.textContent = 'Preencha este campo.';
      else if (field.validity.typeMismatch) error.textContent = 'Digite um e-mail válido, como nome@exemplo.com.';
      else error.textContent = field.validationMessage;
    };

    form.addEventListener('input', (event) => {
      if (event.target.getAttribute('aria-invalid') === 'true') showError(event.target);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      status.replaceChildren();
      const fields = [...form.elements].filter((el) => el.name && el.willValidate);
      fields.forEach(showError);
      const firstInvalid = fields.find((el) => !el.validity.valid);
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      const data = new FormData(form);
      const subject = `[Site] ${String(data.get('assunto') || '').trim() || 'Contato'}`;
      const body = [
        String(data.get('mensagem')).trim(),
        '',
        '—',
        String(data.get('nome')).trim(),
        String(data.get('email')).trim(),
      ].join('\r\n'); // quebras de linha no formato da RFC 6068

      // A mensagem tem no máximo 800 caracteres (maxlength) para o link mailto não passar
      // do limite de ~2000 caracteres que alguns apps de e-mail ainda truncam sem avisar.
      window.location.href = `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      const message = document.createElement('p');
      message.textContent = 'Abrimos o seu app de e-mail com a mensagem pronta. Se nada abriu, copie o endereço e envie por onde preferir.';
      status.append(message);
      const copy = form.querySelector('[data-copy-template]')?.content.cloneNode(true);
      if (copy) status.append(copy);
    });
  }

  /* ── Ano corrente no rodapé ───────────────────────────────────────────── */
  const year = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = year; });

  /* ── Pré-carregamento das páginas internas ao passar o mouse (Chromium) ── */
  if (HTMLScriptElement.supports?.('speculationrules')) {
    const rules = document.createElement('script');
    rules.type = 'speculationrules';
    rules.textContent = JSON.stringify({
      prefetch: [{ where: { href_matches: '/*' }, eagerness: 'moderate' }],
    });
    document.head.append(rules);
  }

  /* ── Para quem abre o console ─────────────────────────────────────────── */
  console.log(
    '%c∇ AAIC · UFF%c\nCurioso(a)? O limbo do astrolábio da página inicial guarda uma mensagem em hexadecimal.\nQuer ajudar a manter este site? Fale com a diretoria: diretoria@aaic.com.br',
    'font: 600 15px/2 "JetBrains Mono", monospace; color: #6FC5A8',
    'font: 12px/1.6 "JetBrains Mono", monospace'
  );
})();
