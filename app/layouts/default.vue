<script setup lang="ts">
useHead({
  title: 'AutoLayout Compiler',
  meta: [
    {
      name: 'description',
      content: 'Transform Figma Auto Layout inputs into clean flexbox, grid, HTML, CSS, or Tailwind output.',
    },
  ],
})
</script>

<template>
  <div class="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
      <div class="flex min-h-screen flex-col overflow-hidden bg-white">
        <header class="flex flex-col gap-3 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div class="flex items-center gap-4">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-sm font-bold text-white">
              AC
            </div>

            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400">Figma to code</p>
              <h1 class="text-xl font-bold tracking-tight text-black sm:text-2xl">AutoLayout Compiler</h1>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="hidden rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500 sm:inline-flex">
              Rebuild auto-layout into production-ready code
            </span>

            <a
              href="https://github.com/kkauper/autolayout-compiler"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              View GitHub Repo
            </a>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto px-5 py-5 lg:px-6 lg:py-6">
          <slot />
        </main>
      </div>
    </div>
</template>
