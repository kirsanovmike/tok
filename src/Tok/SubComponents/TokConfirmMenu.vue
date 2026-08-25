<template>
  <div class="tok-confirm-menu">
    <!-- @slot trigger — кнопка-якорь, под которой раскрывается меню -->
    <slot name="trigger" />

    <transition name="tok-fade">
      <div v-if="open" class="tok-confirm-menu__popover" role="alertdialog" :aria-label="text">
        <p class="tok-confirm-menu__text">{{ text }}</p>

        <div class="tok-confirm-menu__actions">
          <button
            ref="confirm"
            type="button"
            class="tok-button tok-button--primary"
            @click="$emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
          <button type="button" class="tok-button" @click="$emit('cancel')">
            {{ cancelLabel }}
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
/**
 * Подтверждение опасного действия — маленьким меню под кнопкой, которая его вызвала.
 *
 * Не системный `confirm()`: он блокирует страницу хоста, выглядит чужеродно и в
 * части окружений подавляется вовсе. И не полоса в ленте: она сдвигала переписку
 * вниз, то есть вопрос «вы уверены?» перекраивал контент, ради которого панель и
 * открывали.
 *
 * Кнопка-якорь приходит слотом `trigger` и живёт **внутри** корня компонента —
 * именно поэтому клик по ней не считается «кликом мимо» и работает как тумблер,
 * без единого `@click.stop`.
 *
 * Автор: Кирсанов Михаил
 * @displayName Tok Confirm Menu
 * @event confirm — действие подтверждено
 * @event cancel — отказ: кнопка «Отмена» либо клик мимо меню
 */
export default {
  name: 'TokConfirmMenu',

  props: {
    /* Открыто ли меню. Состоянием владеет родитель. */
    open: {
      type: Boolean,
      required: true,
    },
    /* Вопрос, на который отвечают кнопками. */
    text: {
      type: String,
      required: true,
    },
    /* Подпись подтверждающей кнопки. */
    confirmLabel: {
      type: String,
      default: 'Очистить',
    },
    /* Подпись отменяющей кнопки. */
    cancelLabel: {
      type: String,
      default: 'Отмена',
    },
  },

  watch: {
    open(isOpen) {
      return isOpen ? this.listen() : this.unlisten();
    },
  },

  mounted() {
    if (this.open) this.listen();
  },

  beforeDestroy() {
    // Меню может быть уничтожено открытым (закрыли панель) — слушатель на документе
    // обязан уйти вместе с ним.
    this.unlisten();
  },

  methods: {
    focus() {
      if (this.$refs.confirm) this.$refs.confirm.focus();
    },

    listen() {
      // `mousedown`, а не `click`: меню должно исчезнуть до того, как сработает
      // элемент под ним, иначе человек «проваливается» сквозь закрывающееся меню.
      document.addEventListener('mousedown', this.onOutside);
    },

    unlisten() {
      document.removeEventListener('mousedown', this.onOutside);
    },

    onOutside(event) {
      if (this.$el.contains(event.target)) return;
      this.$emit('cancel');
    },
  },
};
</script>

<style lang="scss">
.tok-confirm-menu {
  // Система координат для поповера. Якорь — сама кнопка из слота.
  position: relative;
  display: flex;

  &__popover {
    position: absolute;
    // Под иконкой, прижато к её правому краю: панель у правого края экрана,
    // и меню, выровненное влево, вылезало бы за её границу.
    top: calc(100% + 4px);
    right: 0;
    z-index: 1;
    width: 232px;
    padding: 16px;
    background-color: var(--v-tok-surface);
    border: 1px solid var(--v-tok-border);
    border-radius: 12px;
    box-shadow: 0 6px 20px var(--v-tok-shadow);
  }

  &__text {
    margin: 0 0 8px;
    color: var(--v-tok-text);
    font-size: 13px;
    line-height: 1.4;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }
}
</style>
