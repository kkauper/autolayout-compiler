<script setup lang="ts">
const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 120
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

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
  <div class="mx-auto flex min-h-screen w-full flex-col">
      <div class="flex min-h-screen flex-col overflow-hidden bg-white">
        <header class="w-full border-b border-neutral-200 px-5 pt-20 py-4 lg:pt-50 lg:px-6">
          <div class="mx-auto flex flex-col items-center gap-3 max-w-7xl w-full">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between w-full">
            <div class="space-y-2">
              <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">Design compiler workspace</p>
              <h1
                :style="{ fontSize: scrolled ? 'clamp(1.5rem, 2.5vw, 1.875rem)' : 'clamp(2.5rem, 8vw, 7.5rem)' }"
                class="font-black tracking-tight text-black transition-[font-size] duration-300 ease-in-out leading-[1.05]"
              >
                Turn Figma auto-layout into clean, reviewable front-end code.
              </h1>
              <p class="max-w-3xl text-sm leading-6 text-neutral-500 sm:text-base">
                Add a source, choose how to rebuild it, and inspect preview plus export code. The workflow below now follows a contextual step-by-step guide.
              </p>
            </div>

            <a
              href="https://github.com/kkauper/autolayout-compiler"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex shrink-0 items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              View GitHub Repo
            </a>
            </div>

            <details class="w-full mt-4 rounded-2xl border border-neutral-200 bg-neutral-100">
            <summary class="cursor-pointer list-none text-sm font-bold text-black p-4">Show workflow overview</summary>
            <div class="mt-4 grid gap-3 sm:grid-cols-3 px-4 pb-4">
              <div class="rounded-2xl border border-neutral-200 bg-white p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Step 1 · Source</p>
                <p class="mt-2 text-sm font-medium text-black">Figma API, screenshot upload, or copied payload</p>
              </div>
              <div class="rounded-2xl border border-neutral-200 bg-white p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Step 2 · Settings</p>
                <p class="mt-2 text-sm font-medium text-black">Choose layout engine and output format</p>
              </div>
              <div class="rounded-2xl border border-neutral-200 bg-white p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Step 3 · Preview + Code</p>
                <p class="mt-2 text-sm font-medium text-black">Inspect visual output and copy generated code</p>
              </div>
            </div>
            </details>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto px-5 py-5 lg:px-6 lg:py-6">
          <slot />
        </main>
      </div>
    </div>
</template>
