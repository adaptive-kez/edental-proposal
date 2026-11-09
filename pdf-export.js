// Client-side PDF export. pdfmake 0.2.23 and Roboto are served from this site.
const PDF_VENDOR_BASE = 'vendor/pdfmake/';
let pdfEnginePromise;
let pdfFontsLoaded = false;
const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[↗↘↙↖↑↓↔]/g, '').replace(/[\t ]+/g, ' ').replace(/ *\n */g, '\n').trim();
const nodeText = node => clean(Array.from(node?.childNodes || []).map(child => child.nodeType === 3 ? child.textContent : child.tagName === 'BR' ? '\n' : nodeText(child)).join(' '));
const blocks = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DETAILS', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FOOTER', 'HEADER', 'LEGEND', 'LI', 'MAIN', 'OL', 'P', 'SECTION', 'SUMMARY', 'UL']);
const isHeading = node => /^H[1-6]$/.test(node.tagName);

function loadScript(source) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const cleanup = () => { clearTimeout(timer); script.onload = null; script.onerror = null; script.remove(); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Превышено время загрузки модуля PDF.')); }, 30000);
    script.src = source;
    script.onload = () => { cleanup(); resolve(); };
    script.onerror = () => { cleanup(); reject(new Error('Не удалось загрузить модуль PDF.')); };
    document.head.append(script);
  });
}

function engineStatus(message) {
  const status = document.getElementById('pdf-export-status');
  if (status) { status.hidden = false; status.textContent = message; }
}

async function compressedScript(name, attempt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(PDF_VENDOR_BASE + name + '.gz', { signal: controller.signal, cache: attempt ? 'reload' : 'default' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const bytes = new Uint8Array(await response.arrayBuffer());
    // Fetch can already decompress an HTTP Content-Encoding response. A .gz file
    // without that header still has the gzip magic bytes and is decoded here.
    const stream = bytes[0] === 0x1f && bytes[1] === 0x8b
      ? new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
      : new Blob([bytes]).stream();
    const source = await new Response(stream).text();
    if (!source || /^\s*</.test(source)) throw new Error('Получен некорректный файл PDF-модуля.');
    return new Blob([source], { type: 'text/javascript' });
  } finally { clearTimeout(timer); }
}

async function executeBlob(blob) {
  const url = URL.createObjectURL(blob);
  try { await loadScript(url); }
  finally { URL.revokeObjectURL(url); }
}

async function loadPdfEngine() {
  if (!pdfEnginePromise) pdfEnginePromise = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      engineStatus((attempt ? 'Повторяем загрузку файлов PDF' : 'Загружаем файлы PDF') + ' · попытка ' + (attempt + 1) + ' из 3…');
      try {
        const needsEngine = !window.pdfMake?.createPdf;
        if (typeof DecompressionStream === 'function') {
          const [engine, fonts] = await Promise.all([
            needsEngine ? compressedScript('pdfmake.min.js', attempt) : null,
            !pdfFontsLoaded ? compressedScript('vfs_fonts.js', attempt) : null
          ]);
          if (engine) await executeBlob(engine);
          if (!window.pdfMake?.createPdf) throw new Error('Не удалось запустить модуль PDF.');
          if (fonts) { await executeBlob(fonts); pdfFontsLoaded = true; }
        } else {
          if (needsEngine) await loadScript(PDF_VENDOR_BASE + 'pdfmake.min.js');
          if (!pdfFontsLoaded) { await loadScript(PDF_VENDOR_BASE + 'vfs_fonts.js'); pdfFontsLoaded = true; }
        }
        if (!window.pdfMake?.createPdf || !pdfFontsLoaded) throw new Error('Модуль PDF недоступен.');
        engineStatus('Файлы загружены. Формируем PDF с выбранным составом…');
        return window.pdfMake;
      } catch (error) {
        if (attempt === 2) throw new Error('Не удалось загрузить файлы PDF после трёх попыток. Проверьте соединение и повторите скачивание.');
        await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
  })().catch(error => { pdfEnginePromise = null; throw error; });
  return pdfEnginePromise;
}

function excluded(node) {
  if (node.matches('script,style,nav,button,textarea,input,.sr-only,.config-controls,.hero-actions,.total-actions,.rail-counter,.rail-progress,.slider-controls,.showcase-toolbar,.full-work-toggle,.quantity-control,.skip,#pdf-export-status,#download-proposal-pdf')) return true;
  if (node.matches('.offer-card') && !node.classList.contains('is-selected')) return true;
  if (node.matches('.option-row') && node.querySelector('input[type="checkbox"]:not(:checked)')) return true;
  if (node.matches('.material-row') && Number(node.querySelector('input[data-quantity]')?.value ?? 1) === 0) return true;
  // Closed details and FAQ answers belong in the PDF. Unselected package panels do not.
  if (node.hidden && !node.matches('.rank-panel,.faq-list [role="region"]')) return true;
  return false;
}

function textBlock(text, options = {}) {
  text = clean(text);
  return text ? { text, margin: [0, 0, 0, 6], ...options } : null;
}

function flow(node) {
  if (node.nodeType === 3) return [textBlock(node.textContent)].filter(Boolean);
  if (node.nodeType !== 1 || excluded(node)) return [];
  if (node.matches('a[data-gantt-link]')) return [{ text: nodeText(node), link: new URL(node.getAttribute('href'), location.href).href, color: '#28594b', margin: [0, 4, 0, 9] }];
  if (node.matches('.option-row')) {
    return [
      textBlock(nodeText(node.querySelector('strong')), { bold: true, margin: [0, 6, 0, 3] }),
      textBlock(nodeText(node.querySelector('small')), { fontSize: 9, color: '#555555' }),
      textBlock(nodeText(node.querySelector('.option-price')), { fontSize: 9 })
    ].filter(Boolean);
  }
  if (node.matches('.material-row')) {
    const name = nodeText(node.querySelector('h5'));
    const unit = nodeText(node.querySelector('.material-info p'));
    const quantity = node.querySelector('input[data-quantity]')?.value;
    const fixed = nodeText(node.querySelector('.quantity-fixed'));
    const price = nodeText(node.querySelector('[data-line-price]'));
    return [{ table: { widths: ['*', 150, 62, 78], body: [[{ text: name, bold: true }, unit, quantity === undefined ? fixed : quantity + ' шт.', { text: price, alignment: 'right' }]] }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 6], fontSize: 9 }];
  }
  if (isHeading(node)) {
    const level = Number(node.tagName[1]);
    return [textBlock(nodeText(node), { style: level <= 2 ? 'heading' : level === 3 ? 'subheading' : 'minorHeading' })].filter(Boolean);
  }
  if (node.tagName === 'IMG') {
    // Images in portfolio/team are handled by compact cards; logos keep meaningful alternative text.
    return [textBlock(node.alt, { color: '#646464', fontSize: 8 })].filter(Boolean);
  }
  if (node.tagName === 'UL' || node.tagName === 'OL') {
    const list = Array.from(node.children).filter(child => child.tagName === 'LI' && !excluded(child)).map(child => nodeText(child)).filter(Boolean);
    return list.length ? [{ [node.tagName === 'OL' ? 'ol' : 'ul']: list, margin: [0, 0, 0, 8] }] : [];
  }
  if (node.tagName === 'DL') {
    const rows = Array.from(node.querySelectorAll(':scope > div')).map(row => [nodeText(row.querySelector('dt')), nodeText(row.querySelector('dd'))]).filter(row => row.some(Boolean) && !/^0\s*₽$/.test(row[1]));
    if (rows.length) return [{ table: { widths: ['*', 180], body: rows }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 9] }];
  }
  if (node.tagName === 'P' || node.tagName === 'SUMMARY' || node.tagName === 'LEGEND' || node.tagName === 'ADDRESS') {
    const text = nodeText(node);
    const links = Array.from(node.querySelectorAll('a[href]')).filter(link => /^(https?:|mailto:|tel:)/.test(link.getAttribute('href')));
    const result = [textBlock(text, node.tagName === 'SUMMARY' || node.tagName === 'LEGEND' ? { bold: true, margin: [0, 8, 0, 6] } : {})].filter(Boolean);
    for (const link of links) result.push({ text: link.href, link: link.href, color: '#525252', fontSize: 8, margin: [0, 0, 0, 5] });
    return result;
  }
  const result = [];
  let inline = [];
  const flush = () => { const block = textBlock(inline.join(' ')); if (block) result.push(block); inline = []; };
  for (const child of node.childNodes) {
    if (child.nodeType === 3) { inline.push(child.textContent); continue; }
    if (child.nodeType !== 1 || excluded(child)) continue;
    if (blocks.has(child.tagName) || isHeading(child) || child.matches('.material-row,.option-row,a[data-gantt-link]')) { flush(); result.push(...flow(child)); }
    else if (child.tagName === 'IMG') { flush(); result.push(...flow(child)); }
    else if (child.querySelector('h1,h2,h3,h4,h5,h6,p,div,article,ul,ol')) { flush(); result.push(...flow(child)); }
    else inline.push(nodeText(child));
  }
  flush();
  return result;
}

async function thumbnail(image) {
  if (!image?.getAttribute('src')) return null;
  try {
    const copy = new Image();
    copy.src = image.currentSrc || new URL(image.getAttribute('src'), location.href).href;
    await Promise.race([copy.decode(), new Promise((_, reject) => setTimeout(() => reject(new Error('image timeout')), 6000))]);
    const ratio = Math.min(1, 480 / copy.naturalWidth, 300 / copy.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(copy.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(copy.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(copy, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.75);
  } catch { return null; }
}

async function compactCards(section, selector) {
  const content = [];
  const header = section.querySelector('.section-head');
  if (header) content.push(...flow(header));
  const cards = Array.from(section.querySelectorAll(selector));
  const images = await Promise.all(cards.map(card => thumbnail(card.querySelector('img'))));
  for (let index = 0; index < cards.length; index++) {
    const card = cards[index];
    const copy = card.cloneNode(true);
    copy.querySelectorAll('img').forEach(image => image.remove());
    const text = flow(copy);
    const image = images[index];
    const link = card.matches('a[href]') ? card.href : card.querySelector('a[href]')?.href;
    if (link) text.push({ text: link, link, fontSize: 8, color: '#646464' });
    content.push(image ? { columns: [{ image, fit: [110, 75], width: 110 }, { stack: text, width: '*' }], columnGap: 14, margin: [0, 8, 0, 14], unbreakable: true } : { stack: text, margin: [0, 8, 0, 14], unbreakable: true });
  }
  const note = section.querySelector('.team-note');
  if (note) content.push(...flow(note));
  return content;
}

function selectedSnapshot(documentRoot, selection) {
  const snapshot = documentRoot.documentElement ? documentRoot.documentElement.cloneNode(true) : documentRoot.cloneNode(true);
  const originals = Array.from(documentRoot.querySelectorAll('input'));
  Array.from(snapshot.querySelectorAll('input')).forEach((input, index) => {
    input.value = originals[index]?.value ?? input.value;
    input.checked = originals[index]?.checked ?? input.checked;
  });
  if (!selection?.websiteSelection || !selection?.identitySelection) throw new Error('Не удалось прочитать текущий выбранный состав. Обновите страницу и повторите.');
  const money = (min, max = min) => {
    const format = cents => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(cents / 100) + ' ₽';
    return format(min) + (min === max ? '' : ' – ' + format(max));
  };
  const web = selection.websiteSelection;
  const identity = selection.identitySelection;
  const identityPrice = snapshot.querySelector('#identity .offer-card.is-selected .offer-price');
  const websitePrice = snapshot.querySelector('#website .offer-card.is-selected .offer-price');
  if (identityPrice) identityPrice.textContent = money(identity.totalCents);
  if (websitePrice) websitePrice.textContent = money(web.totalCents, web.maxCents);
  const replaceCardOverview = (selector, description, lines) => {
    const card = snapshot.querySelector(selector);
    if (!card) return;
    const lead = card.querySelector(':scope > p:not(.offer-duration)');
    if (lead) lead.textContent = description;
    const list = card.querySelector('ul');
    if (list) list.replaceChildren(...lines.filter(Boolean).map(text => { const item = document.createElement('li'); item.textContent = text; return item; }));
  };
  const merchCount = identity.items.filter(item => item.group === 'merch').reduce((sum, item) => sum + item.quantity, 0);
  replaceCardOverview('#identity .offer-card.is-selected', 'Выбранный состав айдентики.', [
    'Доработка логотипа и фирменных элементов',
    identity.carrierCount ? identity.carrierCount + ' макетов носителей' : null,
    'Брендбук в PDF/Figma и исходные файлы',
    identity.featureIds.includes('templates') ? '14 редактируемых шаблонов' : null,
    identity.featureIds.includes('animation') ? 'Анимация логотипа' : null,
    merchCount ? merchCount + ' вариантов дизайна мерча' : null
  ]);
  replaceCardOverview('#website .offer-card.is-selected', 'Сайт с выбранным составом страниц и разделов.', [
    web.pages + ' страниц и шаблонов',
    'Проектирование и дизайн с мобильной адаптацией',
    'Разработка на Astro и WordPress, аналитика и запуск',
    ...web.items.map(item => item.name)
  ]);
  const websiteDuration = snapshot.querySelector('#website .offer-card.is-selected .offer-duration strong');
  if (websiteDuration) websiteDuration.textContent = web.minWeeks + (web.minWeeks === web.maxWeeks ? '' : '–' + web.maxWeeks) + ' нед.';
  for (const detail of snapshot.querySelectorAll('.website-stage-detail')) {
    const stage = web.stages.find(item => detail.id === 'website-' + item.id);
    if (!stage) { detail.remove(); continue; }
    const selectedItems = web.items.filter(item => item.stage === stage.optionStage);
    const fees = web.fees.filter(item => item.stage === stage.optionStage);
    const allFeatures = (selection.websiteFeatures || []).filter(item => item.stage === stage.optionStage);
    const partial = stage.number > 1 && selectedItems.length < allFeatures.length;
    const min = stage.number === 1 ? stage.priceCents : [...selectedItems, ...fees].reduce((sum, item) => sum + item.priceCents, 0);
    const max = stage.number === 1 ? stage.maxCents : [...selectedItems, ...fees].reduce((sum, item) => sum + item.maxCents, 0);
    const stagePrice = detail.querySelector('.stage-meta strong');
    if (stagePrice) stagePrice.textContent = money(min, max);
    let pages = stage.pages;
    if (stage.number > 1) {
      let offset = 0;
      pages = allFeatures.flatMap(feature => {
        const own = stage.pages.slice(offset, offset + feature.pages);
        offset += feature.pages;
        return selectedItems.some(item => item.id === feature.id) ? own : [];
      });
    }
    const caption = detail.querySelector('summary small');
    if (caption) caption.textContent = 'Выбранный состав этапа · ' + pages.length + ' страниц и шаблонов';
    const pageList = detail.querySelector('.stage-pages ul');
    if (pageList) {
      pageList.replaceChildren(...pages.map(title => { const item = document.createElement('li'); item.textContent = title; return item; }));
    }
    if (partial) {
      const breakdown = detail.querySelector('.stage-deliverables');
      if (breakdown) breakdown.replaceChildren(...[...selectedItems, ...fees].map(item => {
        const article = document.createElement('article');
        const heading = document.createElement('h4'); heading.textContent = item.name;
        const description = document.createElement('p'); description.textContent = item.description || '';
        const price = document.createElement('strong'); price.textContent = money(item.priceCents, item.maxCents);
        article.append(heading, description, price);
        return article;
      }));
    }
  }
  return snapshot;
}

async function createPdfDefinition(documentRoot = document, selection) {
  documentRoot = selectedSnapshot(documentRoot, selection);
  const content = [];
  const sections = Array.from(documentRoot.querySelectorAll('main > section'));
  for (const section of sections) {
    let items;
    if (section.id === 'cases') items = await compactCards(section, '.case');
    else if (section.id === 'team') items = await compactCards(section, '.team-card');
    else items = flow(section);
    if (items.length && ['identity', 'website', 'pricing', 'team', 'faq', 'contacts'].includes(section.id)) items[0] = { ...items[0], pageBreak: 'before' };
    content.push(...items);
  }
  const footer = documentRoot.querySelector('footer.footer');
  if (footer) content.push(...flow(footer));
  if (!content.length) throw new Error('Не удалось прочитать состав коммерческого предложения.');
  return {
    info: { title: 'Эденталь × AffArts — коммерческое предложение', author: 'AffArts', subject: 'Айдентика и сайт — выбранный состав' },
    pageSize: 'A4', pageMargins: [42, 48, 42, 46],
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.25, color: '#171717' },
    styles: {
      heading: { fontSize: 23, bold: true, margin: [0, 16, 0, 12] },
      subheading: { fontSize: 14, bold: true, margin: [0, 12, 0, 7] },
      minorHeading: { fontSize: 11, bold: true, margin: [0, 9, 0, 5] }
    },
    header: { text: 'AFFARTS × ЭДЕНТАЛЬ', fontSize: 8, color: '#717171', margin: [42, 22, 42, 0] },
    footer: (current, total) => ({ columns: [{ text: 'Коммерческое предложение · Айдентика и сайт', fontSize: 8 }, { text: current + ' / ' + total, alignment: 'right', fontSize: 8 }], margin: [42, 18, 42, 0], color: '#717171' }),
    content
  };
}

async function exportProposalPdf(documentRoot = document, selection) {
  const pdfMake = await loadPdfEngine();
  const definition = await createPdfDefinition(documentRoot, typeof selection === 'function' ? selection() : selection);
  const blob = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Подготовка PDF заняла слишком много времени. Повторите скачивание.')), 60000);
    try { pdfMake.createPdf(definition).getBlob(result => { clearTimeout(timer); resolve(result); }); }
    catch (error) { clearTimeout(timer); reject(error); }
  });
  if (!(blob instanceof Blob) || blob.size < 1000) throw new Error('Не удалось сформировать PDF.');
  return { blob, url: URL.createObjectURL(blob), filename: 'Edental-AffArts-' + new Date().toISOString().slice(0, 10) + '.pdf' };
}

if (typeof window !== 'undefined') window.EdentalPdf = { createPdfDefinition, exportProposalPdf };
