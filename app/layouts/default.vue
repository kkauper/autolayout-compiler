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
  <div class="min-h-screen bg-[#eef2ff] text-slate-900">
    <div class="fixed inset-0 -z-10 overflow-hidden">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),rgba(236,242,255,0.92)_38%,rgba(214,228,255,0.86)_66%,rgba(191,219,254,0.78)_100%)]" />
      <div class="absolute left-[-10%] top-[-12%] h-96 w-96 rounded-full bg-white/80 blur-3xl" />
      <div class="absolute right-[-8%] top-[10%] h-[28rem] w-[28rem] rounded-full bg-indigo-200/55 blur-3xl" />
      <div class="absolute bottom-[-10%] left-[22%] h-80 w-80 rounded-full bg-sky-100/70 blur-3xl" />
    </div>

    <div class="mx-auto flex min-h-screen w-full max-w-[1560px] flex-col px-4 py-4 sm:px-6 lg:px-8">
      <div class="flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white/72 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <header class="flex flex-col gap-4 border-b border-slate-200/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div class="flex items-center gap-4">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-lg shadow-slate-900/15">
              AC
            </div>

            <div>
              <p class="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">Figma to code</p>
              <h1 class="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">AutoLayout Compiler</h1>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="hidden rounded-full border border-slate-200 bg-white/75 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm sm:inline-flex">
              Rebuild auto-layout into production-ready code
            </span>

            <a
              href="https://github.com/kkauper/autolayout-compiler"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              View GitHub Repo
            </a>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-8">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
