(() => {
const pricing = {"website":{"baseCents":91270500,"fullCents":151950500,"basePages":["Главная","Услуги: общий раздел","Направление услуг","Детальная страница услуги","Цены","Портфолио","Страница кейса","Блог","Статья","О клинике","Контакты","Юридическая информация","Страница ошибки"],"features":[{"id":"doctors","name":"Врачи","description":"Раздел врачей и отдельная страница специалиста.","stage":1,"pages":2,"priceCents":8524000},{"id":"reviews","name":"Отзывы","description":"Раздел отзывов и страница отдельного отзыва.","stage":1,"pages":2,"priceCents":5685000},{"id":"promos","name":"Акции","description":"Раздел акций и отдельная страница предложения.","stage":1,"pages":2,"priceCents":5104000},{"id":"faq","name":"Вопросы и ответы","description":"FAQ и отдельная страница вопроса.","stage":2,"pages":2,"priceCents":4652000},{"id":"equipment","name":"Оборудование","description":"Каталог оборудования и отдельная карточка.","stage":2,"pages":2,"priceCents":5685000},{"id":"career","name":"Карьера и вакансии","description":"Страница карьеры, список вакансий и карточка вакансии.","stage":2,"pages":3,"priceCents":13287000},{"id":"documents","name":"Документы и сертификаты","description":"Отдельный раздел документов клиники.","stage":2,"pages":1,"priceCents":2456000},{"id":"health","name":"Анкета о состоянии здоровья","description":"Анкета о первичном состоянии здоровья пациента. Поля и обработку ответов согласуем в задании.","stage":2,"pages":1,"priceCents":3879000}],"fees":[{"id":"stage2","stage":1,"name":"Подготовка и сопровождение второго этапа","priceCents":5594000},{"id":"stage3","stage":2,"name":"Подготовка и сопровождение третьего этапа","priceCents":5814000}]},"identity":{"baseCents":31000000,"premiumCoreCents":33000000,"fullCents":44500000,"bundleDiscountCents":6000000,"stages":[{"title":"Константы фирменного стиля","description":"Формирование смысловой концепции бренда, метафор для последующей разработки визуального образа. Доработка логотипа и создание основных элементов фирменного стиля, отражающих концепцию: цветовой палитры, шрифтовых сочетаний, графики и композиционных приёмов. Объединение элементов в целостную систему и проверка их взаимодействия в разных форматах. Результат этапа — согласованный набор визуальных элементов, формирующих узнаваемый образ компании.","priceCents":12000000},{"title":"Визуализация фирменных носителей","description":"Демонстрация применения разработанного стиля на носителях различного формата: полиграфия, визуальные коммуникации, рекламные материалы. Подготовка визуализаций, отражающих использование логотипа, цветов, типографики и графики в реальных сценариях. Результат этапа — презентация фирменных носителей для оценки целостности и практического применения стиля. Материалы будут использованы в брендбуке для демонстрации применения айдентики.","priceCents":10000000},{"title":"Брендбук и исходные файлы","description":"Объединение визуальной системы в единое руководство по работе с брендом. Описание правил использования логотипа, цветов, шрифтов, графики и композиционных приёмов с примерами на носителях. Результат этапа — брендбук и комплект исходных файлов разработанных элементов для передачи команде ","priceCents":9000000}],"features":[{"id":"templates","name":"Шаблоны коммуникаций","description":"Шаблоны постов и сторис для соцсетей, баннеров для рекламы офлайн и онлайн.","priceCents":6000000},{"id":"merch","name":"Корпоративный мерч","description":"Дизайн и предпечатная подготовка: календарь, ежедневник, плед, кружка и подарочные пакеты. Перечень уточняем перед работой.","priceCents":11500000}],"premiumCoreExplanation":"Визуальный стиль, визуализации и брендбук по стоимости премиум-пакета."}};

const rubles = cents => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(cents / 100) + ' ₽';
function websiteTotal(ids = []) {
  const selected = new Set(ids);
  const items = pricing.website.features.filter(item => selected.has(item.id));
  const fees = pricing.website.fees.filter(fee => items.some(item => item.stage === fee.stage));
  const optionsCents = items.reduce((sum, item) => sum + item.priceCents, 0);
  const feesCents = fees.reduce((sum, item) => sum + item.priceCents, 0);
  return { totalCents: pricing.website.baseCents + optionsCents + feesCents, optionsCents, feesCents, items, fees, pages: 13 + items.reduce((sum, item) => sum + item.pages, 0) };
}
function identityTotal(premium = false, ids = []) {
  if (!premium) return { totalCents: pricing.identity.baseCents, optionsCents: 0, discountCents: 0, items: [] };
  const selected = new Set(ids);
  const items = pricing.identity.features.filter(item => selected.has(item.id));
  const optionsCents = items.reduce((sum, item) => sum + item.priceCents, 0);
  const discountCents = items.length === pricing.identity.features.length ? pricing.identity.bundleDiscountCents : 0;
  return { totalCents: pricing.identity.premiumCoreCents + optionsCents - discountCents, optionsCents, discountCents, items };
}

if (typeof document !== 'undefined') {
  const state = { websitePremium: false, identityPremium: false };
  const money = (key, amount) => document.querySelectorAll(`[data-price="${key}"]`).forEach(el => { el.textContent = rubles(amount); });
  const inputs = type => [...document.querySelectorAll(`input[data-option="${type}"]`)];
  const ids = type => inputs(type).filter(input => input.checked).map(input => input.value);
  let websiteSelection = websiteTotal();
  let identitySelection = identityTotal();
  function updateStrip() {
    document.querySelector('.selection-strip').hidden = document.querySelector('#website').getBoundingClientRect().top >= innerHeight / 2;
  }

  function update() {
    websiteSelection = websiteTotal(state.websitePremium ? ids('website') : []);
    identitySelection = identityTotal(state.identityPremium, state.identityPremium ? ids('identity') : []);
    money('website', websiteSelection.totalCents);
    money('identity', identitySelection.totalCents);
    money('combined', websiteSelection.totalCents + identitySelection.totalCents);
    money('website-options', websiteSelection.optionsCents);
    money('website-fees', websiteSelection.feesCents);
    money('identity-options', identitySelection.optionsCents);
    money('identity-discount', identitySelection.discountCents);
    document.querySelector('#website-pages').textContent = websiteSelection.pages;
    document.querySelector('#website-fees-list').innerHTML = websiteSelection.fees.map(item => `<div><dt>${item.name}</dt><dd>${rubles(item.priceCents)}</dd></div>`).join('');
    document.querySelector('#identity-discount').hidden = !identitySelection.discountCents;
    document.querySelector('#website-summary-mode').textContent = state.websitePremium ? 'Премиум · выбранные разделы' : 'Базовый · MVP';
    document.querySelector('#identity-summary-mode').textContent = state.identityPremium ? 'Премиум · выбранные дополнения' : 'Базовый';
    document.querySelector('#identity-core-price').textContent = rubles(state.identityPremium ? pricing.identity.premiumCoreCents : pricing.identity.baseCents);
    document.querySelector('#configuration-status').textContent = `Сайт: ${rubles(websiteSelection.totalCents)}. Айдентика: ${rubles(identitySelection.totalCents)}. Итого: ${rubles(websiteSelection.totalCents + identitySelection.totalCents)}.`;
    for (const type of ['website', 'identity']) {
      const premium = state[`${type}Premium`];
      document.querySelector(`#${type}-options`).hidden = !premium;
      document.querySelectorAll(`[data-mode-for="${type}"]`).forEach(button => {
        const active = (button.dataset.mode === 'premium') === premium;
        button.setAttribute('aria-pressed', String(active));
        button.closest('.offer-card').classList.toggle('is-selected', active);
        button.textContent = active ? 'Пакет выбран' : button.dataset.mode === 'premium' ? 'Настроить премиум' : 'Выбрать базовый';
      });
    }
  }
  document.querySelectorAll('[data-mode-for]').forEach(button => button.addEventListener('click', () => {
    state[`${button.dataset.modeFor}Premium`] = button.dataset.mode === 'premium';
    update();
  }));
  inputs('website').concat(inputs('identity')).forEach(input => input.addEventListener('change', update));
  document.querySelectorAll('[data-select-options]').forEach(button => button.addEventListener('click', () => {
    inputs(button.dataset.selectOptions).forEach(input => { input.checked = button.dataset.value === 'all'; });
    update();
  }));
  document.querySelector('#print-proposal').addEventListener('click', () => window.print());
  document.querySelector('#copy-selection').addEventListener('click', async event => {
    const button = event.currentTarget;
    const lines = ['Эденталь × AffArts', '', `Сайт: ${rubles(websiteSelection.totalCents)}`, `Пакет: ${state.websitePremium ? 'Премиум' : 'Базовый'}`, ...websiteSelection.items.map(item => '• ' + item.name), ...websiteSelection.fees.map(item => `• ${item.name}: ${rubles(item.priceCents)}`), '', `Айдентика: ${rubles(identitySelection.totalCents)}`, `Пакет: ${state.identityPremium ? 'Премиум' : 'Базовый'}`, ...identitySelection.items.map(item => '• ' + item.name), ...(identitySelection.discountCents ? [`Пакетная скидка: ${rubles(identitySelection.discountCents)}`] : []), '', `Итого: ${rubles(websiteSelection.totalCents + identitySelection.totalCents)}`];
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Состав скопирован';
    } catch {
      const output = document.querySelector('#selection-text');
      output.value = text;
      output.hidden = false;
      output.focus();
      output.select();
      button.textContent = 'Выделите и скопируйте состав';
    }
  });
  update();
  window.addEventListener('scroll', updateStrip, { passive: true });
  window.addEventListener('resize', updateStrip);
  updateStrip();
}

})();
