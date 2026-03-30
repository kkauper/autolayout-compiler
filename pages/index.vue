<script setup lang="ts">
definePageMeta({
  layout: 'default',
})
</script>

<template>
  <section aria-label="Input panel" class="rounded-lg border border-gray-200 dark:border-gray-800 p-4 min-h-64">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
      Input
    </h2>
    <textarea
      class="w-full h-48 resize-none bg-transparent text-sm font-mono outline-none placeholder-gray-400 dark:placeholder-gray-600"
      placeholder="Paste Figma Auto Layout properties here…"
    />
  </section>

  <section aria-label="Output panel" class="rounded-lg border border-gray-200 dark:border-gray-800 p-4 min-h-64">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
      Output
    </h2>
    <pre class="text-sm font-mono whitespace-pre-wrap text-gray-600 dark:text-gray-300"><!-- CSS output will appear here --></pre>
  </section>
</template>

