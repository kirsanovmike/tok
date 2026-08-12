<template>
  <div class="demo-logo">
    <svg
      class="demo-logo__mark"
      width="34"
      height="26"
      viewBox="0 0 34 26"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M9 3c4.4 0 7 3.1 7 7v6c0 3.9 2.6 7 7 7 4.4 0 7-3.1 7-7s-2.6-7-7-7"
        stroke="currentColor"
        stroke-width="5"
        stroke-linecap="round"
      />
      <path
        d="M9 23c-4.4 0-7-3.1-7-7s2.6-7 7-7"
        stroke="currentColor"
        stroke-width="5"
        stroke-linecap="round"
      />
    </svg>

    <span class="demo-logo__word">трансфера</span>
  </div>
</template>

<script>
export default {
  name: 'DemoLogo',
};
</script>

<style lang="scss">
.demo-logo {
  display: flex;
  align-items: center;
  gap: $tok-space-sm;
  color: host-color(indigo, base);

  &__word {
    color: host-color(demo-text);
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
}
</style>
