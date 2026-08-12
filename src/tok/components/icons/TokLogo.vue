<template>
  <!--
    Логотип из `docs/Logo.svg`. Единственное отличие от исходника — цвета остановок
    градиента заданы не атрибутами, а стилями через токены темы: hex внутри `src/tok/`
    живёт только в `theme/tokens.js`.
  -->
  <svg
    class="tok-logo"
    :width="width"
    :height="height"
    viewBox="0 0 76 26"
    fill="none"
    role="img"
    :aria-label="label"
  >
    <path
      d="M0.992 6.824V2.472H22.848V6.824H14.432V25H9.408V6.824H0.992ZM36.7005 25.384C29.2765 25.384 24.1565 20.712 24.1565 13.896V13.576C24.1565 6.76 29.2765 2.088 36.7005 2.088C44.1565 2.088 49.2765 6.76 49.2765 13.576V13.896C49.2765 20.712 44.1565 25.384 36.7005 25.384ZM36.7005 20.968C41.4365 20.968 44.2845 17.928 44.2845 13.896V13.576C44.2845 9.544 41.4365 6.504 36.7005 6.504C31.9965 6.504 29.1485 9.544 29.1485 13.576V13.896C29.1485 17.928 31.9965 20.968 36.7005 20.968ZM57.889 25H52.993V2.472H57.889V12.104L68.417 2.472H74.689L63.201 13.288L74.881 25H68.385L57.889 14.76V25Z"
      :fill="`url(#${gradientId})`"
    />
    <defs>
      <linearGradient
        :id="gradientId"
        x1="60.3236"
        y1="0"
        x2="53.5678"
        y2="33.6152"
        gradientUnits="userSpaceOnUse"
      >
        <stop class="tok-logo__stop tok-logo__stop--from" />
        <stop offset="1" class="tok-logo__stop tok-logo__stop--to" />
      </linearGradient>
    </defs>
  </svg>
</template>

<script>
let counter = 0;

export default {
  name: 'TokLogo',

  props: {
    width: {
      type: [Number, String],
      default: 76,
    },
    height: {
      type: [Number, String],
      default: 26,
    },
    label: {
      type: String,
      default: 'Ток',
    },
  },

  data() {
    counter += 1;
    // id градиента обязан быть уникальным на странице: в Трансфере логотип
    // может оказаться в разметке не в единственном экземпляре.
    return { gradientId: `tok-logo-gradient-${counter}` };
  },
};
</script>

<style lang="scss">
.tok-logo {
  display: block;

  &__stop--from {
    stop-color: tok-color(gradient-from);
  }

  &__stop--to {
    stop-color: tok-color(gradient-to);
  }
}
</style>
