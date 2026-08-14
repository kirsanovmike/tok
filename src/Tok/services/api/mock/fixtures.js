/**
 * Фикстуры ответов ассистента.
 *
 * Покрывают контракт целиком: каждый `reply.kind`, каждый `workflow.status`,
 * каждый тип блока `contents[]`, ответ из нескольких блоков и неизвестный тип блока.
 * Полная решётка `kind × status` (35 сочетаний) достраивается генератором ниже —
 * руками она бессмысленна, но UI обязан пережить любое сочетание.
 *
 * Данные вымышленные, но в терминах предметной области: договор, период,
 * тариф (`cost`), объём (`volume`), стоимость (`price`).
 */
import { REPLY_KIND, WORKFLOW_STATUS, CONTENT_TYPE } from '../contract';

const CONTRACT = 'ЭС-2024/117 «Чебоксарский трубный завод»';

function reply(kind, text) {
  return { kind, text };
}

function workflow(status, extra) {
  return {
    status,
    intent: null,
    domain: 'contracts',
    awaitingConfirmation: false,
    ...(extra || {}),
  };
}

const TABLE_BLOCK = {
  type: CONTENT_TYPE.TABLE,
  columns: [
    { key: 'month', title: 'Месяц' },
    { key: 'volume', title: 'Объём, кВт·ч' },
    { key: 'cost', title: 'Тариф, ₽/кВт·ч' },
    { key: 'price', title: 'Стоимость, ₽' },
  ],
  rows: [
    { month: 'Январь', volume: 412500, cost: 6.42, price: 2648250 },
    { month: 'Февраль', volume: 388100, cost: 6.42, price: 2491602 },
    { month: 'Март', volume: 401900, cost: 6.55, price: 2632445 },
    { month: 'Апрель', volume: 356400, cost: 6.55, price: 2334420 },
    { month: 'Май', volume: 341800, cost: 6.71, price: 2293478 },
    { month: 'Июнь', volume: 372600, cost: 6.71, price: 2500146 },
  ],
};

const LINE_BLOCK = {
  type: CONTENT_TYPE.LINE,
  xField: 'month',
  yField: 'volume',
  series: [
    {
      name: 'Объём потребления, кВт·ч',
      data: [
        { month: 'Январь', volume: 412500 },
        { month: 'Февраль', volume: 388100 },
        { month: 'Март', volume: 401900 },
        { month: 'Апрель', volume: 356400 },
        { month: 'Май', volume: 341800 },
        { month: 'Июнь', volume: 372600 },
      ],
    },
  ],
};

const BAR_BLOCK = {
  type: CONTENT_TYPE.BAR,
  xField: 'month',
  yField: 'price',
  series: [
    {
      name: 'Стоимость, ₽',
      data: [
        { month: 'Апрель', price: 2334420 },
        { month: 'Май', price: 2293478 },
        { month: 'Июнь', price: 2500146 },
      ],
    },
  ],
};

const CIRCLE_BLOCK = {
  type: CONTENT_TYPE.CIRCLE,
  xField: 'component',
  yField: 'share',
  series: [
    {
      name: 'Структура цены',
      data: [
        { component: 'Электроэнергия и мощность', share: 61.4 },
        { component: 'Передача', share: 27.8 },
        { component: 'Сбытовая надбавка', share: 7.1 },
        { component: 'Инфраструктурные платежи', share: 3.7 },
      ],
    },
  ],
};

/**
 * Три ряда на одном графике — «Факт / План / Прогноз» из `Графики другие опции пример.png`.
 * На этой фикстуре проверяется легенда: у одного ряда она была бы шумом.
 */
const MULTI_SERIES_LINE_BLOCK = {
  type: CONTENT_TYPE.LINE,
  xField: 'month',
  yField: 'volume',
  series: ['Факт', 'План', 'Прогноз'].map((name, seriesIndex) => ({
    name,
    data: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь'].map((month, index) => ({
      month,
      volume: 340000 + index * 12000 + seriesIndex * 26000,
    })),
  })),
};

/** Тридцать точек: на такой длине нужен зум-скроллбар, иначе день неразличим. */
const DAILY_LINE_BLOCK = {
  type: CONTENT_TYPE.LINE,
  xField: 'day',
  yField: 'volume',
  series: [
    {
      name: 'Объём потребления, кВт·ч',
      data: Array.from({ length: 30 }, (unused, index) => ({
        day: `${String(index + 1).padStart(2, '0')}.06`,
        volume: 11800 + ((index * 137) % 2600),
      })),
    },
  ],
};

const STAT_BLOCK = {
  type: CONTENT_TYPE.STAT,
  label: 'Стоимость электроэнергии за июнь',
  value: '2 500 146',
  unit: '₽',
};

const LIST_BLOCK = {
  type: CONTENT_TYPE.LIST,
  items: [
    'Электроэнергия и мощность — 1 535 089 ₽',
    'Услуги по передаче — 695 040 ₽',
    'Сбытовая надбавка — 177 510 ₽',
    'Инфраструктурные платежи — 92 507 ₽',
  ],
};

const TEXT_BLOCK = {
  type: CONTENT_TYPE.TEXT,
  text:
    'Объём потребления в июне вырос к маю на 9%, а тариф остался прежним — ' +
    'весь прирост стоимости пришёлся на объём.',
};

// Многострочный текст с пустой строкой (граница абзаца), одиночным переносом
// внутри абзаца и HTML-разметкой: она обязана остаться текстом, а не тегом.
const MULTILINE_TEXT_BLOCK = {
  type: CONTENT_TYPE.TEXT,
  text:
    'За полугодие сложилась такая картина:\nобъём снизился, тариф вырос.\n\n' +
    'Итог по стоимости <b>вырос</b> на 2,4% — рост тарифа перекрыл экономию объёма.',
};

// Список чисел, а не строк: контракт допускает и то и другое.
const NUMERIC_LIST_BLOCK = {
  type: CONTENT_TYPE.LIST,
  items: [2648250, 2491602, 2632445, 2334420, 2293478, 2500146],
};

// `unit` не обязателен: процент уже содержится в значении.
const STAT_WITHOUT_UNIT_BLOCK = {
  type: CONTENT_TYPE.STAT,
  label: 'Изменение стоимости к маю',
  value: '+9,0%',
};

/** Таблица на 8 колонок и 50 строк — проверка, что панель не растягивается. */
function createWideTable() {
  const columns = [
    { key: 'day', title: 'Дата' },
    { key: 'contract', title: 'Договор' },
    { key: 'point', title: 'Точка поставки' },
    { key: 'volume', title: 'Объём, кВт·ч' },
    { key: 'peak', title: 'Пик, кВт' },
    { key: 'cost', title: 'Тариф, ₽/кВт·ч' },
    { key: 'price', title: 'Стоимость, ₽' },
    { key: 'delta', title: 'Изменение к предыдущему дню' },
  ];

  const rows = [];
  for (let i = 0; i < 50; i += 1) {
    const volume = 11800 + i * 137;
    rows.push({
      day: `${String((i % 30) + 1).padStart(2, '0')}.06.2026`,
      contract: 'ЭС-2024/117',
      point: `ПС «Заводская», фидер ${(i % 6) + 1}`,
      volume,
      peak: 640 + (i % 11) * 7,
      cost: 6.71,
      price: Math.round(volume * 6.71),
      delta: `${i % 2 ? '+' : '−'}${(i % 9) + 1},${i % 10}%`,
    });
  }

  return { type: CONTENT_TYPE.TABLE, columns, rows };
}

const WIDE_TABLE_BLOCK = createWideTable();

/**
 * Слово без единого пробела и переноса: 120 символов, которые браузер
 * по своей воле не разорвёт нигде. Ровно на этом ломается вёрстка, если
 * где-то забыт `overflow-wrap` или `min-width: 0` у флекс-потомка.
 * Термин выдуманный, но собран по правилам языка — в энергетике такие бывают.
 */
const LONG_WORD =
  'энергосбытоснабжениеэлектротеплогазоводоснабжениямногоквартирногожилищнокоммунальногохозяйствагородскогоокруга';

const LONG_WORD_TEXT_BLOCK = {
  type: CONTENT_TYPE.TEXT,
  text: `Договор отнесён к категории ${LONG_WORD}, поэтому тариф считается по отдельной методике.`,
};

// Длинная строка и в списке: у списка своя разметка и свой маркер,
// и переносится он не тем же кодом, что абзац.
const LONG_WORD_LIST_BLOCK = {
  type: CONTENT_TYPE.LIST,
  items: [
    `Категория: ${LONG_WORD}`,
    'Услуги по передаче — 695 040 ₽',
    `https://transfera.example.com/contracts/${LONG_WORD}/tariff?period=2026-06`,
  ],
};

/**
 * Число, которое заведомо шире панели: у `stat` крупный кегль,
 * и триллионы в нём занимают больше места, чем кажется.
 */
const HUGE_STAT_BLOCK = {
  type: CONTENT_TYPE.STAT,
  label: `Стоимость по группе договоров ${LONG_WORD}`,
  value: '1 234 567 890 123 456,78',
  unit: 'рублей и ещё немного копеек',
};

/**
 * @typedef {object} Fixture
 * @property {string} id       — идентификатор для `?tokFixture=<id>`
 * @property {string} title    — как фикстура называется в списке
 * @property {string[]} match  — подстроки вопроса, на которые фикстура отвечает
 * @property {object} response — тело ответа сервера
 */
export const fixtures = [
  {
    id: 'collecting-period',
    title: 'Уточнение: не хватает периода',
    match: ['сколько потратил', 'стоимость', 'потратил'],
    response: {
      reply: reply(
        REPLY_KIND.CLARIFICATION,
        `Уточните период по договору ${CONTRACT}: например, «за июнь» или «с 1 апреля по 30 июня».`,
      ),
      workflow: workflow(WORKFLOW_STATUS.COLLECTING, { intent: 'price.total' }),
      contents: [],
    },
  },
  {
    id: 'collecting-contract',
    title: 'Уточнение: не хватает договора',
    match: ['тариф', 'ставка'],
    response: {
      reply: reply(
        REPLY_KIND.CLARIFICATION,
        'По какому договору смотрим тариф? У вас их два: ЭС-2024/117 и ЭС-2023/044.',
      ),
      workflow: workflow(WORKFLOW_STATUS.COLLECTING, { intent: 'cost.value' }),
      contents: [],
    },
  },
  {
    id: 'confirming',
    title: 'Шаг подтверждения',
    match: ['подтверд', 'выгруз', 'отчёт', 'отчет'],
    response: {
      reply: reply(
        REPLY_KIND.CONFIRMATION,
        `Посчитать стоимость по договору ${CONTRACT} за период с 1 января по 30 июня 2026 года?`,
      ),
      workflow: workflow(WORKFLOW_STATUS.CONFIRMING, {
        intent: 'price.total',
        awaitingConfirmation: true,
      }),
      contents: [],
    },
  },
  {
    id: 'executing',
    title: 'Запрос принят в работу',
    match: ['считай', 'посчитай'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Считаю по договору за выбранный период.'),
      workflow: workflow(WORKFLOW_STATUS.EXECUTING, { intent: 'price.total' }),
      contents: [],
    },
  },
  {
    id: 'stat',
    title: 'Ответ одним значением (stat)',
    match: ['за июнь', 'одним числом'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Стоимость электроэнергии за июнь 2026 года:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'price.total' }),
      contents: [STAT_BLOCK],
    },
  },
  {
    id: 'text',
    title: 'Текстовый ответ',
    match: ['почему', 'объясни'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Коротко о том, что изменилось за месяц.'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'price.delta' }),
      contents: [TEXT_BLOCK],
    },
  },
  {
    id: 'list',
    title: 'Перечисление (list)',
    match: ['из чего', 'состав', 'складывается'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Стоимость за июнь складывается так:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'price.breakdown' }),
      contents: [LIST_BLOCK],
    },
  },
  {
    id: 'table',
    title: 'Таблица',
    match: ['таблиц', 'помесячно', 'по месяцам'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Помесячные показатели за первое полугодие 2026 года:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'price.table' }),
      contents: [TABLE_BLOCK],
    },
  },
  {
    id: 'line',
    title: 'График динамики (line)',
    match: ['динамик', 'график', 'потреблен'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Динамика объёма потребления за первое полугодие:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'volume.dynamics' }),
      contents: [LINE_BLOCK],
    },
  },
  {
    id: 'bar',
    title: 'Столбчатый график (bar)',
    match: ['столбчат', 'сравни месяц'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Стоимость по месяцам второго квартала:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'price.dynamics' }),
      contents: [BAR_BLOCK],
    },
  },
  {
    id: 'circle',
    title: 'Круговой график (circle)',
    match: ['доля', 'структур'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Структура цены за июнь:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'price.structure' }),
      contents: [CIRCLE_BLOCK],
    },
  },
  {
    id: 'multi',
    title: 'Несколько блоков в одном ответе',
    match: ['подробно', 'всё сразу', 'все сразу'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Собрал всё по договору за первое полугодие:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'price.report' }),
      contents: [TEXT_BLOCK, STAT_BLOCK, LINE_BLOCK, TABLE_BLOCK],
    },
  },
  {
    id: 'informational',
    title: 'Справка без обращения к данным',
    match: ['что ты умеешь', 'умеешь', 'помощь'],
    response: {
      reply: reply(
        REPLY_KIND.SUCCESS,
        'Отвечаю на вопросы по вашим договорам: тариф, объём потребления и стоимость. ' +
          'Могу показать значение за период, динамику графиком или изменение в процентах.',
      ),
      workflow: workflow(WORKFLOW_STATUS.INFORMATIONAL),
      contents: [],
    },
  },
  {
    id: 'fallback',
    title: 'Вопрос вне скоупа',
    match: ['погода', 'анекдот'],
    response: {
      reply: reply(
        REPLY_KIND.FALLBACK,
        'Пока умею отвечать только на вопросы по договорам: тариф, объём потребления и стоимость.',
      ),
      workflow: workflow(WORKFLOW_STATUS.FALLBACK),
      contents: [],
    },
  },
  {
    id: 'error',
    title: 'Ошибка на стороне ассистента',
    match: ['ошибка'],
    response: {
      reply: reply(
        REPLY_KIND.ERROR,
        'Не смог получить данные по договору. Попробуйте повторить вопрос через минуту.',
      ),
      workflow: workflow(WORKFLOW_STATUS.FALLBACK),
      contents: [],
    },
  },
  {
    id: 'forbidden',
    title: 'Нет доступа к договору',
    match: ['чужой договор', 'запрещ'],
    response: {
      reply: reply(
        REPLY_KIND.ERROR,
        'У вашей учётной записи нет доступа к этому договору. Обратитесь к администратору Трансферы.',
      ),
      workflow: workflow(WORKFLOW_STATUS.FORBIDDEN, { intent: 'price.total' }),
      contents: [],
    },
  },
  {
    id: 'unknown-content',
    title: 'Неизвестный тип блока',
    match: ['неизвестн'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Ответ содержит блок, которого Ток ещё не знает:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED),
      contents: [{ type: 'unknown_future_type', payload: { any: 'thing' } }, TEXT_BLOCK],
    },
  },
  {
    id: 'contents-order',
    title: 'Три разнотипных блока: порядок значим',
    match: ['по порядку', 'разбор'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Разбор по июню:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'price.report' }),
      contents: [STAT_BLOCK, TEXT_BLOCK, TABLE_BLOCK],
    },
  },
  {
    id: 'text-multiline',
    title: 'Многострочный текст и HTML в строке',
    match: ['абзац', 'многострочн'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Коротко за полугодие:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'price.delta' }),
      contents: [MULTILINE_TEXT_BLOCK],
    },
  },
  {
    id: 'list-numeric',
    title: 'Список из чисел',
    match: ['помесячные значения', 'числами'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Стоимость по месяцам, ₽:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'price.list' }),
      contents: [NUMERIC_LIST_BLOCK],
    },
  },
  {
    id: 'stat-no-unit',
    title: 'Значение без единицы измерения',
    match: ['на сколько процент', 'в процентах'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Стоимость изменилась так:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'price.delta' }),
      contents: [STAT_WITHOUT_UNIT_BLOCK],
    },
  },
  {
    id: 'line-multi',
    title: 'График с тремя рядами и легендой',
    match: ['план и факт', 'прогноз'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Факт, план и прогноз по объёму за полугодие:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'volume.dynamics' }),
      contents: [MULTI_SERIES_LINE_BLOCK],
    },
  },
  {
    id: 'line-daily',
    title: 'График на 30 точек: нужен зум',
    match: ['по суткам', 'за месяц по дням'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Посуточная динамика объёма за июнь:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'volume.dynamics' }),
      contents: [DAILY_LINE_BLOCK],
    },
  },
  {
    id: 'table-wide',
    title: 'Широкая таблица: 8 колонок, 50 строк',
    match: ['посуточно', 'по дням'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, 'Посуточная детализация за июнь 2026 года:'),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'price.table' }),
      contents: [WIDE_TABLE_BLOCK],
    },
  },
  {
    id: 'long-content',
    title: 'Длинный контент: слово без пробелов, широкая таблица, большая цифра',
    match: ['длинн', 'переполнен'],
    response: {
      reply: reply(REPLY_KIND.SUCCESS, `Данные по группе ${LONG_WORD} за июнь 2026 года:`),
      workflow: workflow(WORKFLOW_STATUS.COMPLETED, { intent: 'price.report' }),
      contents: [HUGE_STAT_BLOCK, LONG_WORD_TEXT_BLOCK, LONG_WORD_LIST_BLOCK, WIDE_TABLE_BLOCK],
    },
  },
];

/** Ответ по умолчанию: вопрос не совпал ни с одной фикстурой. */
export const DEFAULT_FIXTURE_ID = 'collecting-period';

/**
 * Полная решётка `kind × status`: 35 фикстур с идентификаторами `matrix-<kind>-<status>`.
 * Нужны, чтобы проверить, что UI отражает любое сочетание, включая заведомо
 * нежизненные (`error` + `completed`), — сервер не обязан беречь наши ожидания.
 */
export function createMatrixFixtures() {
  const kinds = Object.keys(REPLY_KIND).map((key) => REPLY_KIND[key]);
  const statuses = Object.keys(WORKFLOW_STATUS).map((key) => WORKFLOW_STATUS[key]);

  return kinds.reduce((acc, kind) => {
    statuses.forEach((status) => {
      acc.push({
        id: `matrix-${kind}-${status}`,
        title: `Решётка: ${kind} × ${status}`,
        match: [],
        response: {
          reply: reply(kind, `Сочетание kind=${kind}, status=${status}.`),
          workflow: workflow(status, {
            awaitingConfirmation: status === WORKFLOW_STATUS.CONFIRMING,
          }),
          contents: [TEXT_BLOCK],
        },
      });
    });
    return acc;
  }, []);
}

export const allFixtures = fixtures.concat(createMatrixFixtures());

export function findFixtureById(id) {
  return allFixtures.filter((fixture) => fixture.id === id)[0] || null;
}

/** Подбор фикстуры по тексту вопроса. Совпадений нет — фикстура по умолчанию. */
export function matchFixture(message) {
  const text = String(message || '').toLowerCase();

  const matched = fixtures.filter((fixture) =>
    fixture.match.some((keyword) => text.indexOf(keyword) !== -1),
  );

  return matched[0] || findFixtureById(DEFAULT_FIXTURE_ID);
}
