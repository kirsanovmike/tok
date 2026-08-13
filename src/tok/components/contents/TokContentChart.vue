<template>
  <div class="tok-chart">
    <div v-if="hasData" class="tok-chart__toolbar" role="group" aria-label="Тип графика">
      <button
        v-for="option in kinds"
        :key="option.kind"
        type="button"
        class="tok-chart__switch"
        :class="{ 'tok-chart__switch--active': option.kind === kind }"
        :aria-pressed="String(option.kind === kind)"
        @click="kind = option.kind"
      >
        {{ option.title }}
      </button>
    </div>

    <!--
      Подпись оси значений — обычный HTML над холстом, а не элемент amCharts.
      Развёрнутая на 0° подпись внутри графика резервировала под себя горизонтальную
      полосу во всю ширину текста и ужимала график вдвое (docs/charterr.png).
    -->
    <p v-if="yTitle" class="tok-chart__caption">{{ yTitle }}</p>

    <div v-if="hasData" ref="canvas" class="tok-chart__canvas" />

    <p v-else class="tok-chart__empty">По этому графику данных не пришло.</p>
  </div>
</template>

<script>
import { createChart } from '../../charts/createChart';
import { resolveChartPalette } from '../../charts/palette';
import { normalizeSeries } from '../../api/contentShape';
import { CONTENT_TYPE } from '../../api/contract';

/**
 * Блок графика: `line`, `bar` и `circle` — один компонент на три вида.
 *
 * Компонент отвечает только за жизненный цикл: создать, пересобрать, утилизировать.
 * Как именно настроен каждый вид — в `charts/createChart.js`.
 *
 * Инстанс amCharts намеренно **не** лежит в `data`: Vue сделал бы реактивным весь
 * граф объектов библиотеки — это и медленно, и ломает саму библиотеку.
 */
const KINDS = [
  { kind: CONTENT_TYPE.LINE, title: 'Линия' },
  { kind: CONTENT_TYPE.BAR, title: 'Столбцы' },
  { kind: CONTENT_TYPE.CIRCLE, title: 'Круг' },
];

export default {
  name: 'TokContentChart',

  inject: {
    // Панель раздаёт конфигурацию через provide; при отдельном рендере её нет.
    tokConfig: { default: () => null },
  },

  props: {
    block: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      kinds: KINDS,
      // Вид из ответа — начальный, дальше им управляет пользователь.
      kind: this.block.type,
    };
  },

  computed: {
    series() {
      return normalizeSeries(this.block);
    },

    hasData() {
      return this.series.length > 0;
    },

    // Подпись осмысленна, только когда ряд один: у нескольких эту роль играет
    // легенда. Рисуется в HTML над холстом — см. комментарий в шаблоне.
    yTitle() {
      return this.series.length === 1 ? this.series[0].name : '';
    },

    isDark() {
      const vuetify = this.$vuetify;
      return Boolean(vuetify && vuetify.theme && vuetify.theme.dark);
    },
  },

  watch: {
    // Данные при переключении вида не трогаются: пересобирается только график.
    kind: 'rebuild',
    // Тема переключилась — цвета берутся заново, без перезагрузки страницы.
    isDark: 'rebuild',
    block: 'onBlockChanged',
  },

  mounted() {
    this.build();
  },

  beforeDestroy() {
    this.disposeChart();
  },

  methods: {
    build() {
      if (!this.hasData) return;

      const element = this.$refs.canvas;
      if (!element) return;

      const config = this.tokConfig || {};

      this.chart = createChart(element, {
        kind: this.kind,
        series: this.series,
        palette: resolveChartPalette(element, this.isDark),
        licensed: config.amchartsLicensed === true,
      });
    },

    disposeChart() {
      // Без этого инстанс остаётся в `am4core.registry.baseSprites` вместе со всеми
      // слушателями и таймерами анимации: панель открывают и закрывают десятки раз
      // за сессию, и утечка накапливается молча.
      if (this.chart && !this.chart.isDisposed()) this.chart.dispose();
      this.chart = null;
    },

    rebuild() {
      this.disposeChart();
      this.$nextTick(this.build);
    },

    onBlockChanged() {
      this.kind = this.block.type;
      this.rebuild();
    },
  },
};
</script>

<style lang="scss">
.tok-chart {
  // Отступ меньше прежнего: в панели 480px каждые 8px по краям — это 8px,
  // которых не хватает подписям оси.
  padding: $tok-space-sm $tok-space-sm $tok-space-md;
  overflow: hidden;
  background-color: tok-color(surface);
  border: 1px solid tok-color(border);
  border-radius: $tok-radius-md;

  &__toolbar {
    display: inline-flex;
    gap: 2px;
    margin-bottom: $tok-space-sm;
    padding: 2px;
    background-color: tok-color(surface-muted);
    border-radius: $tok-radius-sm;
  }

  &__switch {
    padding: 4px 10px;
    font-family: inherit;
    font-size: 12px;
    background: none;
    border: 0;
    border-radius: $tok-radius-sm - 4px;
    cursor: pointer;

    // График приезжает отдельным чанком, его CSS подключается позже сброса хоста
    // и потому уцелел бы и без миксина — но полагаться на порядок загрузки чанков
    // нельзя: он меняется от сборки к сборке.
    @include tok-button-color(text-muted);

    &--active {
      background-color: tok-color(accent);

      @include tok-button-color(text-inverse);
    }

    &:focus-visible {
      outline: 2px solid tok-color(accent);
      outline-offset: 2px;
    }
  }

  &__caption {
    margin: 0 0 $tok-space-xs;
    color: tok-color(text-muted);
    font-size: 12px;
    line-height: 1.3;
  }

  &__canvas {
    width: 100%;
    // Выше прежних 240px: легенда и скроллбар теперь снизу, и им нужна собственная
    // высота, не отнятая у самого графика.
    height: 260px;
  }

  &__empty {
    margin: 0;
    color: tok-color(text-muted);
    font-size: 14px;
  }
}

// На узкой панели график ниже: на телефоне важнее видеть ленту, чем один блок
// во весь экран.
@media (max-width: 599px) {
  .tok-chart__canvas {
    height: 220px;
  }
}
</style>
