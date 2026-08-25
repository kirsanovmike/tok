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
      <div class="tok-table__actions">
        <!-- @slot actions — действия над таблицей, например выгрузка в Excel -->
        <slot name="actions" />
      </div>

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
/**
 * Блок ответа `table` — колонки и строки в узкой панели
 * (`Пример когда ответ таблица.png`).
 *
 * Две вещи, ради которых таблица не просто `<table>`:
 *   — страницы по 14 строк: полсотни строк в панели шириной 520px пролистывать
 *     колесом бессмысленно, а лента при этом теряет остальные блоки ответа;
 *   — собственный индикатор горизонтальной прокрутки: таблица шире панели —
 *     нормальное состояние, и об этом надо сообщить, не расширяя панель.
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Content Table
 */

// services
import { normalizeColumns, normalizeRows } from '../services/api/contentShape';
import { formatValue } from '../services/utils/format';
// components
import TokIcon from './TokIcon.vue';

// Страница в 14 строк: строка уплотнена до ~31px, поэтому блок таблицы занимает
// столько же места, сколько прежние 10 строк по 43px, но показывает заметно больше.
const PAGE_SIZE = 14;
// Ползунок индикатора не тоньше 12% дорожки: у широкой таблицы он выродился бы
// в невидимую полоску в пару пикселей.
const MIN_THUMB_RATIO = 0.12;

export default {
  name: 'TokContentTable',

  components: { TokIcon },

  props: {
    /* Блок `contents[]` вида `{ type: 'table', columns, rows }`. */
    block: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      /* Номер показанной страницы, с нуля. */
      page: 0,
      // Метрики прокрутки: считаются из DOM, поэтому в состоянии, а не в computed.
      /* Таблица шире панели — нужен индикатор прокрутки. */
      overflows: false,
      /* Доля дорожки, которую занимает ползунок индикатора. */
      thumbRatio: 1,
      /* Сдвиг ползунка по дорожке, доля от её ширины. */
      thumbOffset: 0,
    };
  },

  computed: {
    /* Строки таблицы, приведённые к контракту. */
    rows() {
      return normalizeRows(this.block.rows);
    },

    /* Колонки: из ответа либо выведенные из ключей строк. */
    columns() {
      return normalizeColumns(this.block.columns, this.rows);
    },

    /* Сколько всего страниц; минимум одна. */
    pageCount() {
      return Math.max(1, Math.ceil(this.rows.length / PAGE_SIZE));
    },

    /* Нужна ли перелистывалка. */
    hasPages() {
      return this.pageCount > 1;
    },

    /* Заполнен ли слот действий над таблицей. */
    hasActions() {
      return Boolean(this.$slots.actions);
    },

    /* Индекс первой строки показанной страницы. */
    pageStart() {
      return this.page * PAGE_SIZE;
    },

    /* Строки показанной страницы. */
    pageRows() {
      return this.rows.slice(this.pageStart, this.pageStart + PAGE_SIZE);
    },

    /* Инлайновые размеры ползунка индикатора прокрутки. */
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
    /** Значение ячейки, отформатированное как в списке и `stat`. */
    cell(row, column) {
      return formatValue(row[column.key]);
    },

    /** Перелистнуть страницу: `-1` назад, `+1` вперёд. */
    flip(direction) {
      this.page = Math.min(Math.max(this.page + direction, 0), this.pageCount - 1);
      // Новая страница читается слева: горизонтальную прокрутку возвращаем в начало.
      if (this.$refs.scroller) this.$refs.scroller.scrollLeft = 0;
      this.$nextTick(this.measure);
    },

    /** Пересчитать метрики горизонтальной прокрутки по DOM. */
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
  background-color: var(--v-tok-surface);
  border: 1px solid var(--v-tok-border);
  border-radius: 16px;

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
      padding: 7px 16px;
      font-size: 13px;
      line-height: 1.3;
      text-align: left;
      white-space: nowrap;
    }

    th {
      color: var(--v-tok-text-muted);
      font-weight: 400;
      background-color: var(--v-tok-surface-elevated);
    }

    td {
      color: var(--v-tok-text);
      border-top: 1px solid var(--v-tok-border);
    }
  }

  &__indicator {
    position: relative;
    height: 4px;
    margin: 4px 16px;
    background-color: var(--v-tok-surface-elevated);
    border-radius: 2px;
  }

  &__thumb {
    position: absolute;
    top: 0;
    height: 100%;
    background-color: var(--v-tok-border-strong);
    border-radius: 2px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 16px;
    border-top: 1px solid var(--v-tok-border);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__pager {
    display: flex;
    flex: none;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  &__page-counter {
    color: var(--v-tok-text-muted);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }

  &__page-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    background: none;
    border: 0;
    border-radius: 50%;
    cursor: pointer;

    // `.tok-root` поднимает специфичность над сбросом `button { color: inherit }`
    // у Vuetify и normalize: без него кнопка красится в цвет родителя.
    .tok-root & {
      color: var(--v-tok-text-muted);
    }

    &:hover:not(:disabled) {
      color: var(--v-tok-text);
      background-color: var(--v-tok-surface-muted);
    }

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }

    &:focus-visible {
      outline: 2px solid var(--v-tok-accent);
      outline-offset: 2px;
    }
  }
}
</style>
