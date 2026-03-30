<script setup lang="ts">
import RootIndexPage from '../../pages/index.vue'

type SourceMode = 'figma-api' | 'image-upload' | 'figma-copy'
type LayoutMode = 'flexbox' | 'grid'
type OutputMode = 'tailwind' | 'plain'

type AutoLayoutData = {
  id?: string | null
  name?: string | null
  type?: string | null
  layoutMode?: string | null
  primaryAxisSizingMode?: string | null
  counterAxisSizingMode?: string | null
  primaryAxisAlignItems?: string | null
  counterAxisAlignItems?: string | null
  itemSpacing?: number | null
  layoutWrap?: string | null
  paddingTop?: number | null
  paddingRight?: number | null
  paddingBottom?: number | null
  paddingLeft?: number | null
  cornerRadius?: number | null
  width?: number | null
  height?: number | null
  childrenCount?: number | null
}

type FigmaFetchResponse = {
  source: 'figma-api'
  fileKey: string
  fileName: string | null
  nodeId: string | null
  autoLayout: AutoLayoutData | null
  message?: string
}

definePageMeta({
  layout: 'default',
})

const sourceMode = ref<SourceMode>('figma-api')
const layoutMode = ref<LayoutMode>('flexbox')
const outputMode = ref<OutputMode>('tailwind')

const figmaUrl = ref('https://www.figma.com/file/abc123/Marketing-Landing-Page?node-id=120-18')
const figmaToken = ref('')
const figmaNodeId = ref('')
const figmaLoading = ref(false)
const figmaError = ref('')
const figmaMessage = ref('')
const figmaResponse = ref<FigmaFetchResponse | null>(null)
const pastedPayload = ref(`{
  "layoutMode": "HORIZONTAL",
  "primaryAxisSizingMode": "AUTO",
  "counterAxisSizingMode": "FIXED",
  "itemSpacing": 16,
  "paddingTop": 20,
  "paddingRight": 20,
  "paddingBottom": 20,
  "paddingLeft": 20,
  "cornerRadius": 24
}`)

const sourceSummary = computed(() => {
  if (sourceMode.value === 'figma-api') {
    return 'Use the Figma REST API with a file URL and personal access token to fetch node data.'
  }

  if (sourceMode.value === 'image-upload') {
    return 'Drop a screenshot or exported asset to assist the reconstruction workflow and spacing checks.'
  }

  return 'Paste copied Figma auto-layout JSON, dev mode output, or CSS-like values directly into the compiler.'
})

const inferredNodeId = computed(() => {
  try {
    const parsedUrl = new URL(figmaUrl.value)
    const rawNodeId = parsedUrl.searchParams.get('node-id') || parsedUrl.searchParams.get('nodeId') || ''
    return decodeURIComponent(rawNodeId).replace(/-/g, ':')
  }
  catch {
    return ''
  }
})

const effectiveNodeId = computed(() => figmaNodeId.value.trim() || inferredNodeId.value)

const compilerTitle = computed(() => layoutMode.value === 'flexbox' ? 'Flexbox rebuild pipeline' : 'Grid rebuild pipeline')

const previewMetrics = computed(() => {
  const fallbackMetrics = ['Auto spacing: 16px', 'Padding: 20px', 'Radius: 24px']
  const autoLayout = figmaResponse.value?.autoLayout

  if (!autoLayout) {
    return fallbackMetrics
  }

  const itemSpacing = autoLayout.itemSpacing ?? 16
  const paddingValue = autoLayout.paddingTop ?? autoLayout.paddingLeft ?? 20
  const cornerRadius = autoLayout.cornerRadius ?? 24

  return [
    `Auto spacing: ${itemSpacing}px`,
    `Padding: ${paddingValue}px`,
    `Radius: ${cornerRadius}px`,
  ]
})

function hydrateFromAutoLayout(autoLayout?: AutoLayoutData | null) {
  if (!autoLayout) {
    return
  }

  pastedPayload.value = JSON.stringify(autoLayout, null, 2)

  if (autoLayout.layoutMode === 'GRID') {
    layoutMode.value = 'grid'
  }

  if (autoLayout.layoutMode === 'HORIZONTAL' || autoLayout.layoutMode === 'VERTICAL') {
    layoutMode.value = 'flexbox'
  }
}

async function fetchFigmaData() {
  figmaLoading.value = true
  figmaError.value = ''
  figmaMessage.value = ''

  try {
    const response = await $fetch<FigmaFetchResponse>('/api/figma/fetch', {
      method: 'POST',
      body: {
        fileUrl: figmaUrl.value,
        token: figmaToken.value,
        nodeId: effectiveNodeId.value || undefined,
      },
    })

    figmaResponse.value = response
    figmaMessage.value = response.message || 'Figma data fetched successfully.'
    hydrateFromAutoLayout(response.autoLayout)
  }
  catch (error: any) {
    figmaResponse.value = null
    figmaError.value = error?.data?.statusMessage || error?.message || 'Failed to fetch data from Figma.'
  }
  finally {
    figmaLoading.value = false
  }
}

const previewRootClass = computed(() => layoutMode.value === 'flexbox'
  ? 'flex flex-col gap-4 rounded-[28px] bg-white p-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)]'
  : 'grid gap-4 rounded-[28px] bg-white p-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]')

const previewBadgeClass = computed(() => layoutMode.value === 'flexbox'
  ? 'inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700'
  : 'inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700')

const generatedHtml = computed(() => {
  if (outputMode.value === 'tailwind') {
    return `<section class="${layoutMode.value === 'flexbox' ? 'flex flex-col gap-4 rounded-[28px] bg-white p-5 shadow-xl' : 'grid gap-4 rounded-[28px] bg-white p-5 shadow-xl sm:grid-cols-[1.3fr_0.7fr]'}">
  <div class="space-y-3">
    <span class="${layoutMode.value === 'flexbox' ? 'inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700' : 'inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700'}">${layoutMode.value === 'flexbox' ? 'Flexbox output' : 'Grid output'}</span>
    <div class="space-y-2">
      <h3 class="text-2xl font-semibold text-slate-900">Generated marketing card</h3>
      <p class="text-sm leading-6 text-slate-500">The compiler maps spacing, alignment, and sizing rules into reusable production markup.</p>
    </div>
  </div>
  <div class="rounded-3xl bg-slate-900 p-4 text-white">
    <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Actions</p>
    <div class="mt-3 flex flex-wrap gap-3">
      <button class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">Preview</button>
      <button class="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white">Export</button>
    </div>
  </div>
</section>`
  }

  return `<section class="compiler-card compiler-card--${layoutMode.value}">
  <div class="compiler-copy">
    <span class="compiler-badge">${layoutMode.value === 'flexbox' ? 'Flexbox output' : 'Grid output'}</span>
    <h3>Generated marketing card</h3>
    <p>The compiler maps spacing, alignment, and sizing rules into reusable production markup.</p>
  </div>

  <div class="compiler-actions">
    <p>Actions</p>
    <div>
      <button>Preview</button>
      <button class="ghost">Export</button>
    </div>
  </div>
</section>`
})

const generatedCss = computed(() => {
  if (outputMode.value === 'tailwind') {
    return `/* Tailwind mode selected */
/* Utility classes are embedded directly in the HTML output. */`
  }

  return `.compiler-card {
  display: ${layoutMode.value === 'flexbox' ? 'flex' : 'grid'};
  ${layoutMode.value === 'flexbox' ? 'flex-direction: column;' : 'grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.7fr);'}
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 28px;
  background: #ffffff;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
}

.compiler-badge {
  display: inline-flex;
  width: fit-content;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  background: ${layoutMode.value === 'flexbox' ? '#e0f2fe' : '#ede9fe'};
  color: ${layoutMode.value === 'flexbox' ? '#0369a1' : '#6d28d9'};
  font-size: 0.75rem;
  font-weight: 600;
}

.compiler-copy h3 {
  margin: 0.75rem 0 0.5rem;
  font-size: 1.5rem;
  color: #0f172a;
}

.compiler-copy p {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.compiler-actions {
  padding: 1rem;
  border-radius: 24px;
  background: #0f172a;
  color: white;
}

.compiler-actions div {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.compiler-actions button {
  border: 0;
  border-radius: 999px;
  padding: 0.625rem 1rem;
  background: white;
  color: #0f172a;
  font-weight: 600;
}

.compiler-actions .ghost {
  background: transparent;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}`
})
</script>

<template>
  <RootIndexPage />
  <!--
  <section class="space-y-6">
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div class="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div class="max-w-3xl space-y-4">
          <span class="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Design compiler workspace
          </span>

          <div class="space-y-3">
            <h2 class="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Turn Figma auto-layout into clean, reviewable front-end code.
            </h2>
            <p class="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Start from a Figma file URL, an uploaded image, or copied design payload. Then rebuild the structure with
              <span class="font-semibold text-slate-900">flexbox</span>
              or
              <span class="font-semibold text-slate-900">grid</span>
              and export either
              <span class="font-semibold text-slate-900">Tailwind</span>
              or plain HTML/CSS.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Source</p>
              <p class="mt-2 text-sm font-medium text-slate-700">Figma API, screenshots, or copied layout data</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Rebuild</p>
              <p class="mt-2 text-sm font-medium text-slate-700">Translate sizing, spacing, and alignment rules</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Export</p>
              <p class="mt-2 text-sm font-medium text-slate-700">Preview the result and inspect generated code</p>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(225,236,255,0.92))] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div class="flex h-full flex-col justify-between gap-6">
          <div class="space-y-3">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Pipeline overview</p>
            <h3 class="text-2xl font-semibold tracking-tight text-slate-900">From auto-layout metadata to production-ready components</h3>
            <p class="text-sm leading-6 text-slate-600">
              The workspace below separates source ingestion, reconstruction controls, preview rendering, and code export so users can compare the raw Figma structure against the final implementation.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/70">
              <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">1</div>
              <p class="text-sm font-semibold text-slate-900">Import design</p>
              <p class="mt-1 text-sm text-slate-500">Fetch Figma nodes or upload a visual reference.</p>
            </div>
            <div class="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/70">
              <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">2</div>
              <p class="text-sm font-semibold text-slate-900">Rebuild structure</p>
              <p class="mt-1 text-sm text-slate-500">Choose flexbox or grid for the generated layout.</p>
            </div>
            <div class="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/70">
              <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">3</div>
              <p class="text-sm font-semibold text-slate-900">Inspect output</p>
              <p class="mt-1 text-sm text-slate-500">Preview the component and copy the matching code.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-6 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.8fr)_minmax(0,1.1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section class="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Source inputs</p>
            <h3 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Add your Figma source</h3>
          </div>
          <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">01</span>
        </div>

        <div class="mt-6 grid gap-2 sm:grid-cols-3">
          <button
            class="rounded-2xl border px-4 py-3 text-left text-sm font-medium transition"
            :class="sourceMode === 'figma-api' ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'"
            @click="sourceMode = 'figma-api'"
          >
            Figma link
          </button>
          <button
            class="rounded-2xl border px-4 py-3 text-left text-sm font-medium transition"
            :class="sourceMode === 'image-upload' ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'"
            @click="sourceMode = 'image-upload'"
          >
            Image upload
          </button>
          <button
            class="rounded-2xl border px-4 py-3 text-left text-sm font-medium transition"
            :class="sourceMode === 'figma-copy' ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'"
            @click="sourceMode = 'figma-copy'"
          >
            Figma paste
          </button>
        </div>

        <p class="mt-4 text-sm leading-6 text-slate-500">{{ sourceSummary }}</p>

        <div v-if="sourceMode === 'figma-api'" class="mt-6 space-y-4">
          <label class="block space-y-2">
            <span class="text-sm font-medium text-slate-700">Figma file URL</span>
            <input
              v-model="figmaUrl"
              type="url"
              class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:bg-white"
              placeholder="https://www.figma.com/file/..."
            >
          </label>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-slate-700">Node id (optional)</span>
            <input
              v-model="figmaNodeId"
              type="text"
              class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:bg-white"
              placeholder="120:18 (auto-detected from URL if omitted)"
            >
          </label>

          <p class="text-xs text-slate-500">
            Effective node id:
            <span class="font-semibold text-slate-700">{{ effectiveNodeId || 'none' }}</span>
          </p>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-slate-700">Figma REST API token</span>
            <input
              v-model="figmaToken"
              type="password"
              class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:bg-white"
              placeholder="Paste a personal access token"
            >
          </label>

          <button
            class="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="figmaLoading"
            @click="fetchFigmaData"
          >
            {{ figmaLoading ? 'Fetching from Figma…' : 'Fetch from Figma API' }}
          </button>

          <div v-if="figmaError" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {{ figmaError }}
          </div>

          <div v-else-if="figmaResponse" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p class="font-semibold">{{ figmaMessage }}</p>
            <p class="mt-1">File: {{ figmaResponse.fileName || figmaResponse.fileKey }}</p>
            <p>Node: {{ figmaResponse.nodeId || 'No node selected' }}</p>
          </div>

          <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Fetch node JSON, spacing rules, layout directions, constraints, and sizing data directly from the selected file. If an auto-layout node is found, the payload editor is populated automatically.
          </div>
        </div>

        <div v-else-if="sourceMode === 'image-upload'" class="mt-6 space-y-4">
          <label class="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-8 text-center transition hover:border-slate-400 hover:bg-white">
            <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">🖼️</span>
            <span class="mt-4 text-base font-semibold text-slate-800">Drop a screenshot or export here</span>
            <span class="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Use this as a visual reference while reconstructing spacing, hierarchy, and layout behavior.
            </span>
            <input type="file" accept="image/*" class="hidden">
          </label>
        </div>

        <div v-else class="mt-6 space-y-4">
          <label class="block space-y-2">
            <span class="text-sm font-medium text-slate-700">Pasted Figma payload</span>
            <textarea
              v-model="pastedPayload"
              rows="12"
              class="w-full resize-none rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 font-mono text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:bg-white"
              placeholder="Paste copied auto-layout data or dev-mode output"
            />
          </label>
        </div>
      </section>

      <section class="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Compiler controls</p>
            <h3 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Rebuild the element</h3>
          </div>
          <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">02</span>
        </div>

        <div class="mt-6 space-y-6">
          <div class="space-y-3">
            <p class="text-sm font-medium text-slate-700">Layout engine</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <button
                class="rounded-[1.5rem] border p-4 text-left transition"
                :class="layoutMode === 'flexbox' ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'"
                @click="layoutMode = 'flexbox'"
              >
                <p class="text-base font-semibold text-slate-900">Flexbox</p>
                <p class="mt-1 text-sm leading-6 text-slate-500">Ideal for directional stacks, spacing rules, and adaptive content groups.</p>
              </button>
              <button
                class="rounded-[1.5rem] border p-4 text-left transition"
                :class="layoutMode === 'grid' ? 'border-violet-300 bg-violet-50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'"
                @click="layoutMode = 'grid'"
              >
                <p class="text-base font-semibold text-slate-900">Grid</p>
                <p class="mt-1 text-sm leading-6 text-slate-500">Useful for cards, dashboards, and repeated regions with structured alignment.</p>
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <p class="text-sm font-medium text-slate-700">Code output</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <button
                class="rounded-[1.5rem] border p-4 text-left transition"
                :class="outputMode === 'tailwind' ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'"
                @click="outputMode = 'tailwind'"
              >
                <p class="text-base font-semibold">Tailwind</p>
                <p class="mt-1 text-sm leading-6" :class="outputMode === 'tailwind' ? 'text-slate-300' : 'text-slate-500'">Generate utility-first HTML with classes embedded in markup.</p>
              </button>
              <button
                class="rounded-[1.5rem] border p-4 text-left transition"
                :class="outputMode === 'plain' ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'"
                @click="outputMode = 'plain'"
              >
                <p class="text-base font-semibold">Plain HTML/CSS</p>
                <p class="mt-1 text-sm leading-6" :class="outputMode === 'plain' ? 'text-slate-300' : 'text-slate-500'">Produce semantic HTML with a separate CSS block for styling.</p>
              </button>
            </div>
          </div>

          <div class="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/10">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Active pipeline</p>
            <h4 class="mt-3 text-xl font-semibold">{{ compilerTitle }}</h4>
            <p class="mt-3 text-sm leading-6 text-slate-300">
              The compiler maps padding, item gaps, alignment, and sizing into a responsive component structure and keeps the generated code synchronized with the visual preview.
            </p>

            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Detected direction</p>
                <p class="mt-2 text-sm font-semibold">{{ layoutMode === 'flexbox' ? 'Horizontal / vertical stack' : 'Structured columns / rows' }}</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Export format</p>
                <p class="mt-2 text-sm font-semibold">{{ outputMode === 'tailwind' ? 'Tailwind utility classes' : 'Separate HTML and CSS' }}</p>
              </div>
            </div>

            <button class="mt-6 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
              Rebuild selected element
            </button>
          </div>
        </div>
      </section>

      <section class="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:col-span-2 2xl:col-span-1">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Preview and code</p>
            <h3 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">See the rebuilt component</h3>
          </div>
          <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">03</span>
        </div>

        <div class="mt-6 space-y-5">
          <div class="rounded-[1.75rem] bg-[linear-gradient(145deg,rgba(243,247,255,1),rgba(224,236,255,0.75))] p-5 ring-1 ring-slate-200/70">
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Live preview</p>

            <div class="mt-4" :class="previewRootClass">
              <div class="space-y-3">
                <span :class="previewBadgeClass">{{ layoutMode === 'flexbox' ? 'Flexbox output' : 'Grid output' }}</span>
                <div class="space-y-2">
                  <h4 class="text-2xl font-semibold tracking-tight text-slate-900">Generated marketing card</h4>
                  <p class="max-w-xl text-sm leading-6 text-slate-500">
                    The compiler keeps the visual hierarchy, spacing system, and action grouping aligned with the original Figma element.
                  </p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="metric in previewMetrics"
                    :key="metric"
                    class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {{ metric }}
                  </span>
                </div>
              </div>

              <div class="rounded-[1.5rem] bg-slate-900 p-4 text-white">
                <p class="text-xs uppercase tracking-[0.22em] text-slate-500">Actions</p>
                <div class="mt-3 flex flex-wrap gap-3">
                  <button class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">Preview</button>
                  <button class="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white">Export</button>
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-4 xl:grid-cols-2">
            <div class="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-lg shadow-slate-950/5">
              <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p class="text-sm font-semibold text-white">HTML</p>
                <span class="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">{{ outputMode === 'tailwind' ? 'Tailwind classes' : 'Semantic markup' }}</span>
              </div>
              <pre class="overflow-x-auto px-4 py-4 text-xs leading-6 text-slate-300"><code>{{ generatedHtml }}</code></pre>
            </div>

            <div class="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-lg shadow-slate-950/5">
              <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p class="text-sm font-semibold text-white">CSS</p>
                <span class="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">{{ outputMode === 'tailwind' ? 'Optional' : 'Required' }}</span>
              </div>
              <pre class="overflow-x-auto px-4 py-4 text-xs leading-6 text-slate-300"><code>{{ generatedCss }}</code></pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
  -->
</template>
