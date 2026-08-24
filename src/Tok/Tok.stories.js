/**
 * Storybook 6.2 · истории компонента Ток.
 *
 * Ток — не карточка, а целый экран: плавающая кнопка-звёздочка внизу справа и
 * шторка, которая выезжает поверх страницы через портал в `<body>`. Поэтому
 * истории отличаются не «внешним видом», а состоянием: закрыт / открыт / чем
 * именно ответил ассистент.
 *
 * Что нужно от окружения Storybook:
 *   1. SCSS-контракт — `tok-color()`, миксины, `$tok-*`. Приходит из
 *      `@tne-ui/core` вместе со стилями библиотеки. Если Storybook собирается
 *      в отрыве от них, партиал (или копию `styles/_tokens.scss` этой папки)
 *      нужно прокинуть sass-loader в `.storybook/main.js`;
 *   2. Переменные `--v-tok-*`. Штатно их объявляет `@tne-ui/core`. Если стилей
 *      библиотеки в Storybook нет, их раскладывает контрол `theme` ниже —
 *      поверх объявлений core он не пишет (см. `theme/applyTokTheme.js`);
 *   3. Ничего устанавливать не нужно: `portal-vue` зарегистрирован локально
 *      в `Tok.vue`, Vuetify компоненту не требуется вовсе.
 */
// Импорт по умолчанию и именованный `Tok` — один и тот же компонент (index.js),
// поэтому предупреждение правила здесь ложное.
// eslint-disable-next-line import/no-named-as-default
import Tok, { applyTokTheme } from './index';
import { fixtures } from './services/api/mock/fixtures';

/**
 * Фикстуры мок-слоя как список для селекта: ключ — подпись, значение — id.
 * Пустая строка означает «мок сам подберёт ответ по тексту вопроса».
 */
const FIXTURE_OPTIONS = fixtures.reduce(
  (acc, fixture) => ({ ...acc, [`${fixture.id} — ${fixture.title}`]: fixture.id }),
  { 'подбор по вопросу': '' },
);

export default {
  title: 'Tok',
  component: Tok,
  // Шторка позиционируется от края окна — рамка и отступы Storybook только мешают.
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    // Настоящий проп компонента: объект целиком редактировать неудобно,
    // поэтому он собирается ниже из отдельных контролов.
    config: {
      table: { disable: true },
      control: false,
    },
    theme: {
      description:
        'Тема для изолированного просмотра. Если переменные объявил @tne-ui/core, контрол ничего не меняет',
      control: { type: 'inline-radio', options: ['light', 'dark'] },
    },
    open: {
      description: 'Открыть шторку сразу после монтирования (состояние истории, не проп)',
      control: { type: 'boolean' },
    },
    fixtureId: {
      description: 'Готовый ответ мока на любой вопрос — вся матрица контракта',
      control: { type: 'select', options: FIXTURE_OPTIONS },
    },
    mockDelayMs: {
      description: 'Задержка ответа мока, мс — на ней видно индикатор загрузки',
      control: { type: 'number', min: 0, step: 100 },
    },
    voiceEnabled: {
      description: 'Микрофон в поле ввода',
      control: { type: 'boolean' },
    },
    showSource: {
      description: 'Кнопка «Источник» под ответом (по постановке скрыта)',
      control: { type: 'boolean' },
    },
    persistHistory: {
      description: 'Хранить переписку в localStorage',
      control: { type: 'boolean' },
    },
    amchartsLicensed: {
      description: 'Прятать логотип amCharts (только при коммерческой лицензии)',
      control: { type: 'boolean' },
    },
  },
};

/**
 * Фон страницы-хоста в историях.
 *
 * Собран на переменных Тока намеренно: во-первых, hex внутри `src/Tok/`
 * допустим только в `theme/tokens.js`; во-вторых, так сразу видно, доехали ли
 * переменные до документа, — если нет, страница останется прозрачной.
 */
const STORY_HOST_STYLE_ID = 'tok-story-host-style';

function ensureStoryHostStyle() {
  if (typeof document === 'undefined' || document.getElementById(STORY_HOST_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STORY_HOST_STYLE_ID;
  style.textContent = `
    .tok-story-host {
      min-height: 100vh;
      padding: 32px;
      color: var(--v-tok-text);
      background-color: var(--v-tok-surface);
    }
  `;
  document.head.appendChild(style);
}

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),

  components: { Tok },

  computed: {
    // Имя `tokConfig`, а не `config`: Storybook подставляет в `props` историю
    // все ключи `argTypes`, включая настоящий проп `config` компонента, —
    // одноимённое вычисляемое свойство конфликтовало бы с ним.
    /** Конфигурация Тока, собранная из контролов истории. */
    tokConfig() {
      return {
        fixtureId: this.fixtureId,
        mockDelayMs: this.mockDelayMs,
        voiceEnabled: this.voiceEnabled,
        showSource: this.showSource,
        persistHistory: this.persistHistory,
        amchartsLicensed: this.amchartsLicensed,
        // Своё пространство имён в localStorage: переписка из Storybook не
        // должна попадаться на глаза в приложении-хосте и наоборот.
        storageNamespace: 'storybook',
      };
    },

    /**
     * Ключ для пересоздания компонента.
     *
     * Ток читает `config` один раз в `beforeCreate` — менять его на лету
     * бессмысленно (транспорт и стор уже собраны). Чтобы контролы Storybook
     * всё-таки работали, при смене конфигурации компонент монтируется заново.
     */
    configKey() {
      return JSON.stringify(this.tokConfig);
    },
  },

  watch: {
    open: 'syncOpen',
    theme: 'syncTheme',
  },

  mounted() {
    this.syncTheme();
    this.syncOpen();
  },

  // После смены `configKey` дочерний Ток монтируется заново и закрывается —
  // возвращаем ему состояние, выбранное в контролах.
  updated() {
    this.syncOpen();
  },

  methods: {
    /**
     * Разложить переменные темы для изолированного просмотра.
     *
     * Если `@tne-ui/core` их уже объявил, `applyTokTheme` ничего не делает —
     * библиотека главнее историй.
     */
    syncTheme() {
      ensureStoryHostStyle();
      applyTokTheme(this.theme === 'dark' ? 'dark' : 'light');
    },

    /** Привести состояние шторки к значению контрола `open`. */
    syncOpen() {
      const { tok } = this.$refs;
      if (!tok) return;
      if (this.open) tok.openPanel();
      else tok.closePanel();
    },
  },

  template: `
    <div class="tok-story-host">
      <p>Страница приложения-хоста. Ток живёт поверх неё: кнопка внизу справа.</p>
      <Tok ref="tok" :key="configKey" :config="tokConfig" />
    </div>
  `,
});

/** Базовые значения: без них каждая история повторяла бы одно и то же. */
const BASE_ARGS = {
  theme: 'light',
  open: false,
  fixtureId: '',
  mockDelayMs: 700,
  voiceEnabled: true,
  showSource: false,
  // В Storybook истории переключаются в одной вкладке: сохранённая переписка
  // протекала бы из истории в историю. В Трансфере флаг поднят.
  persistHistory: false,
  amchartsLicensed: true,
};

/* ------------------------------------------------------------------ */
/* Состояния                                                           */
/* ------------------------------------------------------------------ */

export const Primary = Template.bind({});
Primary.storyName = 'Точка входа: кнопка на странице';
Primary.args = { ...BASE_ARGS };

export const Opened = Template.bind({});
Opened.storyName = 'Открытая шторка: пустой экран';
Opened.args = { ...BASE_ARGS, open: true };

/** Тёмная тема: в Трансфере её включает хост, здесь — контрол истории. */
export const OpenedDark = Template.bind({});
OpenedDark.storyName = 'Открытая шторка: тёмная тема';
OpenedDark.args = { ...BASE_ARGS, open: true, theme: 'dark' };

/**
 * Индикатор загрузки. Задержка нарочно большая — за 12 секунд успевают
 * смениться несколько фраз лоадера (пауза между ними 2700 мс) и разглядеться
 * вращение звёздочки вокруг вертикальной оси. Спросите что угодно.
 */
export const Loading = Template.bind({});
Loading.storyName = 'Ожидание ответа';
Loading.args = { ...BASE_ARGS, open: true, mockDelayMs: 12000 };

/**
 * Дальше — состояния, которые видно только после отправленного вопроса:
 * `fixtureId` заставляет мок ответить конкретной фикстурой на любой текст.
 */
export const ChartAnswer = Template.bind({});
ChartAnswer.storyName = 'Ответ графиком';
ChartAnswer.args = { ...BASE_ARGS, open: true, fixtureId: 'line' };

export const TableAnswer = Template.bind({});
TableAnswer.storyName = 'Ответ таблицей';
TableAnswer.args = { ...BASE_ARGS, open: true, fixtureId: 'table' };

/** Шаг машины состояний: `awaitingConfirmation` — под ответом «Да» / «Нет». */
export const Confirmation = Template.bind({});
Confirmation.storyName = 'Шаг подтверждения';
Confirmation.args = { ...BASE_ARGS, open: true, fixtureId: 'confirming' };

/** Сервис ответил ошибкой: `reply.kind = error`. */
export const ErrorReply = Template.bind({});
ErrorReply.storyName = 'Ошибка сервиса';
ErrorReply.args = { ...BASE_ARGS, open: true, fixtureId: 'error' };

/** Урезанная конфигурация хоста: микрофона нет, кнопка «Источник» показана. */
export const WithoutVoice = Template.bind({});
WithoutVoice.storyName = 'Без голосового ввода';
WithoutVoice.args = {
  ...BASE_ARGS,
  open: true,
  fixtureId: 'stat',
  voiceEnabled: false,
  showSource: true,
};
