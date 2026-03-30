<script setup lang="ts">
useHead({
  title: 'AutoCSS',
  meta: [
    {
      name: 'description',
      content: 'Convert Figma Auto Layout properties to CSS flexbox and grid',
    },
  ],
})

const colorMode = useColorMode()

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50">
    <header class="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold tracking-tight">AutoCSS</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Figma Auto Layout → CSS</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          aria-label="Toggle dark mode"
          class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          @click="toggleColorMode"
        >
          <UIcon
            :name="colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            class="size-5"
          />
        </button>

        <button
          aria-label="Settings"
          class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <UIcon name="i-heroicons-cog-6-tooth" class="size-5" />
        </button>
      </div>
    </header>

    <main class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
      <slot />
    </main>

    <footer class="border-t border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
      <span>v0.1.0</span>
      <a
        href="https://github.com/kkauper/autolayout-compiler"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        GitHub
      </a>
    </footer>
  </div>
</template>
