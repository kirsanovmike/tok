<template>
  <svg
    class="tok-sparkle-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M14.5 1.5 Q16.1 8.4 23 10 Q16.1 11.6 14.5 18.5 Q12.9 11.6 6 10 Q12.9 8.4 14.5 1.5Z"
      fill="currentColor"
    />
    <path
      d="M6.5 13.5 Q7.4 17.1 11 18 Q7.4 18.9 6.5 22.5 Q5.6 18.9 2 18 Q5.6 17.1 6.5 13.5Z"
      fill="currentColor"
    />
  </svg>
</template>

<script>
export default {
  name: 'TokSparkleIcon',

  props: {
    size: {
      type: [Number, String],
      default: 24,
    },
  },
};
</script>
