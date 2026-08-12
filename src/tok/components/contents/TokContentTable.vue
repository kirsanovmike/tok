<template>
  <div class="tok-table">
    <div ref="scroller" class="tok-table__scroller" @scroll="measure">
      <table class="tok-table__grid">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" scope="col">{{ column.title }}</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(row, index) in pageRows" :key="pageStart + index">
            <td v-for="column in columns" :key="column.key">{{ cell(row, column) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!--
      Индикатор горизонтальной прокрутки (серая полоска под таблицей в макете).
      Нативную полосу прокрутки в macOS не видно, пока её не тронешь, — а понять,
      что таблица шире панели, нужно сразу.
    -->
    <div v-if="overflows" class="tok-table__indicator" aria-hidden="true">
      <span class="tok-table__thumb" :style="thumbStyle" />
    </div>

    <div v-if="hasPages || hasActions" class="tok-table__footer">
      <!--
        Выгрузка в Excel — вне v1. Слот оставлен, чтобы кнопка встала сюда,
        не переписывая подвал таблицы.
      -->
      <div class="tok-table__actions"><slot name="actions" /></div>

      <div v-if="hasPages" class="tok-table__pager">
        <button
          type="button"
          class="tok-table__page-button"
          :disabled="page === 0"
          aria-label="Предыдущая страница"
          @click="flip(-1)"
        >
          <TokIcon name="chevron-left" :size="18" />
        </button>

        <span class="tok-table__page-counter">{{ page + 1 }} / {{ pageCount }}</span>

        <button
          type="button"
          class="tok-table__page-button"
          :disabled="page === pageCount - 1"
          aria-label="Следующая страница"
          @click="flip(1)"
        >
          <TokIcon name="chevron-right" :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import TokIcon from '../icons/TokIcon.vue';
import { normalizeColumns, normalizeRows } from '../../api/contentShape';
import { formatValue } from '../../utils/format';

/**
 * Блок `table` — колонки и строки в узкой панели (`Пример когда ответ таблица.png`).
 *
 * Две вещи, ради которых таблица не просто `<table>`:
 *   — страницы по 10 строк: полсотни строк в панели шириной 480px пролистывать
 *     колесом бессмысленно, а лента при этом теряет остальные блоки ответа;
 *   — собственный индикатор горизонтальной прокрутки: таблица шире панели —
 *     нормальное состояние, и об этом надо сообщить, не расширяя панель.
 */
const PAGE_SIZE = 10;
const MIN_THUMB_RATIO = 0.12;

export default {
  name: 'TokContentTable',

  components: { TokIcon },

  props: {
    block: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      page: 0,
      // Метрики прокрутки: считаются из DOM, поэтому в состоянии, а не в computed.
      overflows: false,
      thumbRatio: 1,
      thumbOffset: 0,
    };
  },

  computed: {
    rows() {
      return normalizeRows(this.block.rows);
    },

    columns() {
      return normalizeColumns(this.block.columns, this.rows);
    },

    pageCount() {
      return Math.max(1, Math.ceil(this.rows.length / PAGE_SIZE));
    },

    hasPages() {
      return this.pageCount > 1;
    },

    hasActions() {
      return Boolean(this.$slots.actions);
    },

    pageStart() {
      return this.page * PAGE_SIZE;
    },

    pageRows() {
      return this.rows.slice(this.pageStart, this.pageStart + PAGE_SIZE);
    },

    thumbStyle() {
      return {
        width: `${this.thumbRatio * 100}%`,
        left: `${this.thumbOffset * 100}%`,
      };
    },
  },

  watch: {
    // Новый ответ может переиспользовать компонент — страница обязана вернуться к первой.
    block() {
      this.page = 0;
      this.measure();
    },
  },

  mounted() {
    this.measure();
    window.addEventListener('resize', this.measure);
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.measure);
  },

  methods: {
    cell(row, column) {
      return formatValue(row[column.key]);
    },

    flip(direction) {
      this.page = Math.min(Math.max(this.page + direction, 0), this.pageCount - 1);
      // Новая страница читается слева: горизонтальную прокрутку возвращаем в начало.
      if (this.$refs.scroller) this.$refs.scroller.scrollLeft = 0;
      this.$nextTick(this.measure);
    },

    measure() {
      const { scroller } = this.$refs;
      if (!scroller) return;

      const { scrollWidth, clientWidth, scrollLeft } = scroller;
      // jsdom не считает layout: все три величины нулевые, и таблица честно
      // сообщает «прокручивать нечего», а не рисует индикатор в никуда.
      this.overflows = scrollWidth > clientWidth + 1;

      if (!this.overflows) {
        this.thumbRatio = 1;
        this.thumbOffset = 0;
        return;
      }

      this.thumbRatio = Math.max(clientWidth / scrollWidth, MIN_THUMB_RATIO);
      const maxOffset = 1 - this.thumbRatio;
      this.thumbOffset = maxOffset * (scrollLeft / (scrollWidth - clientWidth));
    },
  },
};
</script>

<style lang="scss">
.tok-table {
  overflow: hidden;
  background-color: tok-color(surface);
  border: 1px solid tok-color(border);
  border-radius: $tok-radius-md;

  &__scroller {
    overflow-x: auto;
    // Прокрутка живёт внутри таблицы; панель по горизонтали не растягивается.
    -webkit-overflow-scrolling: touch;
  }

  &__grid {
    width: 100%;
    border-spacing: 0;
    // Колонки шире содержимого не нужны, но и переносить каждое слово незачем:
    // ширину задаёт содержимое, а прокрутка берёт на себя остаток.
    border-collapse: separate;

    th,
    td {
      padding: 12px $tok-space-md;
      font-size: 14px;
      line-height: 1.35;
      text-align: left;
      white-space: nowrap;
    }

    th {
      color: tok-color(text-muted);
      font-weight: 400;
      background-color: tok-color(surface-elevated);
    }

    td {
      color: tok-color(text);
      border-top: 1px solid tok-color(border);
    }
  }

  &__indicator {
    position: relative;
    height: 4px;
    margin: $tok-space-sm $tok-space-md;
    background-color: tok-color(surface-elevated);
    border-radius: 2px;
  }

  &__thumb {
    position: absolute;
    top: 0;
    height: 100%;
    background-color: tok-color(border-strong);
    border-radius: 2px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $tok-space-sm;
    padding: $tok-space-sm $tok-space-md;
    border-top: 1px solid tok-color(border);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: $tok-space-sm;
    min-width: 0;
  }

  &__pager {
    display: flex;
    flex: none;
    align-items: center;
    gap: $tok-space-xs;
    margin-left: auto;
  }

  &__page-counter {
    color: tok-color(text-muted);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }

  &__page-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: none;
    border: 0;
    border-radius: 50%;
    cursor: pointer;

    @include tok-button-color(text-muted);

    &:hover:not(:disabled) {
      color: tok-color(text);
      background-color: tok-color(surface-muted);
    }

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }

    &:focus-visible {
      outline: 2px solid tok-color(accent);
      outline-offset: 2px;
    }
  }
}
</style>
