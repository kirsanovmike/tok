<template>
  <div
    class="tok-resize-handle"
    role="separator"
    aria-orientation="vertical"
    aria-label="Ширина панели"
    :aria-valuenow="width"
    :aria-valuemin="min"
    :aria-valuemax="max"
    tabindex="0"
    @pointerdown="onPointerDown"
    @keydown="onKeydown"
    @dblclick="$emit('resize', min)"
  />
</template>

<script>
/**
 * Ручка изменения ширины шторки: невидимая полоса вдоль левого края панели.
 *
 * Ручка не владеет шириной — она сообщает наверх желаемую и ничего не решает
 * сама: зажать значение между минимумом и шириной окна обязана панель, иначе
 * ограничение оказалось бы в двух местах.
 *
 * Слушатели перетаскивания вешаются на `window`, а не на саму ручку: указатель
 * во время движения почти всегда оказывается за её пределами.
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Resize Handle
 * @event resize — желаемая ширина панели в пикселях
 * @event dragstart — начало перетаскивания
 * @event dragend — конец перетаскивания
 */

// services
import { PANEL_WIDTH_STEP, panelMaxWidth, widthFromPointerX } from '../services/utils/panelWidth';

export default {
  name: 'TokResizeHandle',

  props: {
    /* Текущая ширина панели в пикселях — для скринридера и для шага клавиатуры. */
    width: {
      type: Number,
      required: true,
    },
    /* Минимальная ширина панели. */
    min: {
      type: Number,
      required: true,
    },
    /* Максимальная ширина панели: весь экран. */
    max: {
      type: Number,
      required: true,
    },
  },

  beforeDestroy() {
    // Панель могли закрыть прямо во время перетаскивания — слушатели на window
    // не имеют права пережить компонент.
    this.stopDrag();
  },

  methods: {
    onPointerDown(event) {
      // Тянут именно ручку: выделение текста в панели и прокрутка страницы на
      // тач-устройстве во время перетаскивания только мешают.
      event.preventDefault();

      const element = this.$el;
      if (element && element.setPointerCapture && event.pointerId !== undefined) {
        try {
          element.setPointerCapture(event.pointerId);
        } catch (e) {
          // Указатель уже отпущен — перетаскивание всё равно отработает по window.
        }
      }

      window.addEventListener('pointermove', this.onPointerMove);
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('pointercancel', this.onPointerUp);
      this.$emit('dragstart');
    },

    onPointerMove(event) {
      this.$emit('resize', widthFromPointerX(event.clientX, window.innerWidth));
    },

    onPointerUp() {
      this.stopDrag();
      this.$emit('dragend');
    },

    /** Снять слушатели перетаскивания. Вызывается и при уничтожении компонента. */
    stopDrag() {
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
      window.removeEventListener('pointercancel', this.onPointerUp);
    },

    /**
     * Клавиатура: стрелка влево расширяет панель (край едет влево), вправо —
     * сужает, Home возвращает минимум, End раскрывает во весь экран.
     */
    onKeydown(event) {
      const moves = {
        ArrowLeft: this.width + PANEL_WIDTH_STEP,
        ArrowRight: this.width - PANEL_WIDTH_STEP,
        Home: this.min,
        End: panelMaxWidth(typeof window === 'undefined' ? 0 : window.innerWidth),
      };

      const next = moves[event.key];
      if (next === undefined) return;

      // Стрелки внутри панели иначе прокрутили бы ленту.
      event.preventDefault();
      this.$emit('resize', next);
    },
  },
};
</script>

<style lang="scss">
.tok-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  width: 10px;
  // Полоса чуть заходит за край панели: попасть в неё мышью должно быть легко,
  // а видимой она при этом не становится.
  margin-left: -4px;
  cursor: col-resize;
  // Обязательно: без этого браузер на тач-устройстве считает движение по ручке
  // прокруткой и не отдаёт pointermove.
  touch-action: none;

  // Видимая часть — короткая риска по центру, и только под курсором или фокусом:
  // постоянная линия спорила бы с прямым правым краем шторки.
  &::before {
    position: absolute;
    top: 50%;
    left: 4px;
    width: 4px;
    height: 40px;
    background-color: tok-color(border-strong);
    border-radius: 2px;
    opacity: 0;
    transform: translateY(-50%);
    transition: opacity 140ms linear;
    content: '';
  }

  &:hover::before,
  &:focus-visible::before {
    opacity: 1;
  }

  &:focus-visible {
    // Обводка вдоль всей высоты панели была бы кричащей: фокус показывает риска.
    outline: none;

    &::before {
      background-color: tok-color(accent);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .tok-resize-handle::before {
    transition: none;
  }
}
</style>
