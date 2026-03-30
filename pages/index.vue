<script setup lang="ts">
type SourceMode = 'figma-api' | 'image-upload' | 'figma-copy'
type LayoutMode = 'flexbox' | 'grid'
type OutputMode = 'tailwind' | 'plain'

type FigmaColor = {
  r?: number
  g?: number
  b?: number
  a?: number
}

type FigmaPaint = {
  type?: string
  visible?: boolean
  opacity?: number
  color?: FigmaColor
}

type FigmaTextStyle = {
  fontSize?: number
  fontWeight?: number
  lineHeightPx?: number
  textAlignHorizontal?: string
}

type FigmaSceneNode = {
  id?: string | null
  name?: string | null
  type?: string | null
  imageRef?: string | null
  exportSrc?: string | null
  imageAlt?: string | null
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
  absoluteBoundingBox?: {
    width?: number | null
    height?: number | null
  } | null
  fills?: FigmaPaint[] | null
  style?: FigmaTextStyle | null
  characters?: string | null
  children?: FigmaSceneNode[] | null
}

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
  node?: FigmaSceneNode | null
  message?: string
}

type RgbColor = {
  r: number
  g: number
  b: number
}

type ImageAnalysis = {
  width: number
  height: number
  aspectRatio: number
  inferredLayout: 'HORIZONTAL' | 'VERTICAL' | 'GRID'
  itemSpacing: number
  padding: number
  cornerRadius: number
  estimatedSections: number
  backgroundRgb: RgbColor
  accentRgb: RgbColor
  backgroundColor: FigmaColor
  accentColor: FigmaColor
  backgroundCss: string
  accentCss: string
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
const imageInput = ref<HTMLInputElement | null>(null)
const imageDragging = ref(false)
const imageLoading = ref(false)
const imageError = ref('')
const imageMessage = ref('')
const uploadedImageName = ref('')
const uploadedImageType = ref('')
const uploadedImageSize = ref(0)
const uploadedImageUrl = ref('')
const uploadedImageAnalysis = ref<ImageAnalysis | null>(null)
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
    return 'Upload a temporary screenshot or exported asset so the compiler can infer layout direction, spacing, and preview structure from the image.'
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
  if (sourceMode.value === 'image-upload' && uploadedImageAnalysis.value) {
    const analysis = uploadedImageAnalysis.value

    return [
      `Canvas: ${analysis.width}×${analysis.height}`,
      `Detected layout: ${analysis.inferredLayout.toLowerCase()}`,
      `Padding: ${analysis.padding}px`,
      `Gap: ${analysis.itemSpacing}px`,
    ]
  }

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

const uploadedImageNode = computed<FigmaSceneNode | null>(() => {
  if (!uploadedImageAnalysis.value || !uploadedImageUrl.value) {
    return null
  }

  return buildImageReferenceNode(uploadedImageAnalysis.value, uploadedImageName.value, uploadedImageUrl.value)
})

const fallbackNode = computed<FigmaSceneNode>(() => {
  try {
    const parsedPayload = JSON.parse(pastedPayload.value)
    return {
      id: 'pasted-root',
      name: 'Pasted Element',
      type: 'FRAME',
      layoutMode: parsedPayload.layoutMode || (layoutMode.value === 'grid' ? 'GRID' : 'VERTICAL'),
      itemSpacing: parsedPayload.itemSpacing ?? 16,
      paddingTop: parsedPayload.paddingTop ?? 20,
      paddingRight: parsedPayload.paddingRight ?? 20,
      paddingBottom: parsedPayload.paddingBottom ?? 20,
      paddingLeft: parsedPayload.paddingLeft ?? 20,
      cornerRadius: parsedPayload.cornerRadius ?? 24,
      children: [
        {
          id: 'pasted-child-title',
          type: 'TEXT',
          name: 'Title',
          characters: 'Generated marketing card',
          style: {
            fontSize: 24,
            fontWeight: 600,
          },
        },
        {
          id: 'pasted-child-copy',
          type: 'TEXT',
          name: 'Body',
          characters: 'Compiler output from pasted auto-layout metadata.',
          style: {
            fontSize: 14,
            lineHeightPx: 22,
          },
        },
      ],
    }
  }
  catch {
    return {
      id: 'fallback-root',
      name: 'Generated Element',
      type: 'FRAME',
      layoutMode: layoutMode.value === 'grid' ? 'GRID' : 'VERTICAL',
      itemSpacing: 16,
      paddingTop: 20,
      paddingRight: 20,
      paddingBottom: 20,
      paddingLeft: 20,
      cornerRadius: 24,
      children: [],
    }
  }
})

const activeNode = computed<FigmaSceneNode>(() => figmaResponse.value?.node || (sourceMode.value === 'image-upload' ? uploadedImageNode.value : null) || fallbackNode.value)

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatBytes(value?: number | null) {
  if (!value) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`
}

function rgbToFigmaColor(color: RgbColor): FigmaColor {
  return {
    r: clamp(color.r, 0, 255) / 255,
    g: clamp(color.g, 0, 255) / 255,
    b: clamp(color.b, 0, 255) / 255,
    a: 1,
  }
}

function rgbToCss(color: RgbColor) {
  return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`
}

function createSolidFill(color: RgbColor, opacity = 1): FigmaPaint {
  return {
    type: 'SOLID',
    visible: true,
    opacity,
    color: rgbToFigmaColor(color),
  }
}

function colorDistance(a: RgbColor, b: RgbColor) {
  return Math.sqrt(
    ((a.r - b.r) ** 2)
    + ((a.g - b.g) ** 2)
    + ((a.b - b.b) ** 2),
  )
}

function averageColors(colors: RgbColor[]) {
  if (!colors.length) {
    return { r: 255, g: 255, b: 255 }
  }

  const totals = colors.reduce((accumulator, color) => ({
    r: accumulator.r + color.r,
    g: accumulator.g + color.g,
    b: accumulator.b + color.b,
  }), { r: 0, g: 0, b: 0 })

  return {
    r: totals.r / colors.length,
    g: totals.g / colors.length,
    b: totals.b / colors.length,
  }
}

function getPixelColor(data: Uint8ClampedArray, offset: number): RgbColor {
  return {
    r: data[offset] ?? 255,
    g: data[offset + 1] ?? 255,
    b: data[offset + 2] ?? 255,
  }
}

function averageLineColor(data: Uint8ClampedArray, width: number, height: number, axis: 'row' | 'column', index: number): RgbColor {
  const colors: RgbColor[] = []

  if (axis === 'row') {
    for (let x = 0; x < width; x += 1) {
      colors.push(getPixelColor(data, ((index * width) + x) * 4))
    }
  }
  else {
    for (let y = 0; y < height; y += 1) {
      colors.push(getPixelColor(data, ((y * width) + index) * 4))
    }
  }

  return averageColors(colors)
}

function estimateInset(sampleSize: number, scale: number, lineReader: (index: number) => RgbColor, background: RgbColor) {
  const searchDepth = Math.max(4, Math.floor(sampleSize / 3))

  for (let index = 0; index < searchDepth; index += 1) {
    if (colorDistance(lineReader(index), background) > 22) {
      return Math.max(12, Math.round(index * scale))
    }
  }

  return Math.max(12, Math.round(sampleSize * 0.08 * scale))
}

function fileBaseName(value?: string | null) {
  return (value || 'Uploaded reference').replace(/\.[^.]+$/, '')
}

function createTextNode(name: string, characters: string, fontSize: number, fontWeight = 500, lineHeightPx?: number): FigmaSceneNode {
  return {
    id: `${sanitizeClassName(name)}-${sanitizeClassName(characters).slice(0, 24)}`,
    type: 'TEXT',
    name,
    characters,
    style: {
      fontSize,
      fontWeight,
      lineHeightPx,
    },
  }
}

function createActionNode(name: string, label: string, fill: RgbColor, textColor?: RgbColor): FigmaSceneNode {
  return {
    id: sanitizeClassName(name),
    type: 'FRAME',
    name,
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'CENTER',
    counterAxisAlignItems: 'CENTER',
    paddingTop: 12,
    paddingRight: 18,
    paddingBottom: 12,
    paddingLeft: 18,
    cornerRadius: 999,
    fills: [createSolidFill(fill)],
    children: [
      {
        ...createTextNode(`${name}-label`, label, 14, 600),
        fills: textColor ? [createSolidFill(textColor)] : undefined,
      },
    ],
  }
}

function buildImageReferenceNode(analysis: ImageAnalysis, imageName: string, imageUrl: string): FigmaSceneNode {
  const displayName = fileBaseName(imageName)
  const isGrid = analysis.inferredLayout === 'GRID'
  const imageWidth = analysis.inferredLayout === 'HORIZONTAL'
    ? Math.max(240, Math.round(analysis.width * 0.38))
    : Math.max(240, analysis.width - (analysis.padding * 2))
  const imageHeight = analysis.inferredLayout === 'HORIZONTAL'
    ? Math.max(260, analysis.height - (analysis.padding * 2))
    : Math.max(220, Math.round(analysis.height * 0.42))

  return {
    id: 'image-upload-root',
    type: 'FRAME',
    name: `${displayName} reference`,
    layoutMode: analysis.inferredLayout,
    itemSpacing: analysis.itemSpacing,
    paddingTop: analysis.padding,
    paddingRight: analysis.padding,
    paddingBottom: analysis.padding,
    paddingLeft: analysis.padding,
    cornerRadius: analysis.cornerRadius,
    absoluteBoundingBox: {
      width: analysis.width,
      height: analysis.height,
    },
    fills: [createSolidFill(analysis.backgroundRgb)],
    children: [
      {
        id: 'image-upload-copy',
        type: 'FRAME',
        name: 'Content panel',
        layoutMode: 'VERTICAL',
        itemSpacing: Math.max(12, Math.round(analysis.itemSpacing * 0.75)),
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        absoluteBoundingBox: {
          width: analysis.inferredLayout === 'HORIZONTAL' ? Math.max(280, analysis.width - imageWidth - (analysis.padding * 3)) : analysis.width - (analysis.padding * 2),
          height: Math.max(240, analysis.height - (analysis.padding * 2)),
        },
        children: [
          createTextNode('Eyebrow', 'Image-driven conversion', 12, 600, 18),
          createTextNode('Heading', displayName, 28, 700, 34),
          createTextNode('Body', `The temporary upload is used as a visual reference to infer ${analysis.inferredLayout.toLowerCase()} structure, spacing, and hierarchy for the generated HTML/CSS.`, 15, 400, 24),
          {
            id: 'image-upload-actions',
            type: 'FRAME',
            name: 'Actions',
            layoutMode: 'HORIZONTAL',
            itemSpacing: 12,
            layoutWrap: isGrid ? 'WRAP' : undefined,
            children: [
              createActionNode('Primary action', 'Preview', analysis.accentRgb, { r: 15, g: 23, b: 42 }),
              createActionNode('Secondary action', 'Inspect CSS', { r: 15, g: 23, b: 42 }, { r: 255, g: 255, b: 255 }),
            ],
          },
        ],
      },
      {
        id: 'image-upload-preview',
        type: 'IMAGE',
        name: 'Uploaded reference image',
        imageRef: imageUrl,
        exportSrc: 'design-reference.png',
        imageAlt: `${displayName} design reference`,
        cornerRadius: Math.max(16, Math.round(analysis.cornerRadius * 0.9)),
        absoluteBoundingBox: {
          width: imageWidth,
          height: imageHeight,
        },
      },
    ],
  }
}

function buildImageAutoLayoutPayload(analysis: ImageAnalysis) {
  return {
    source: 'image-upload',
    width: analysis.width,
    height: analysis.height,
    layoutMode: analysis.inferredLayout,
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'FIXED',
    itemSpacing: analysis.itemSpacing,
    paddingTop: analysis.padding,
    paddingRight: analysis.padding,
    paddingBottom: analysis.padding,
    paddingLeft: analysis.padding,
    cornerRadius: analysis.cornerRadius,
    estimatedSections: analysis.estimatedSections,
    dominantBackground: analysis.backgroundCss,
    dominantAccent: analysis.accentCss,
  }
}

function loadImageElement(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    if (!import.meta.client) {
      reject(new Error('Image analysis is only available in the browser.'))
      return
    }

    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The uploaded image could not be loaded.'))
    image.src = source
  })
}

async function analyzeUploadedImage(source: string): Promise<ImageAnalysis> {
  const image = await loadImageElement(source)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height

  if (!width || !height) {
    throw new Error('The uploaded image is missing dimensions.')
  }

  const canvas = document.createElement('canvas')
  const sampleWidth = Math.max(12, Math.min(48, width))
  const sampleHeight = Math.max(12, Math.min(48, height))
  canvas.width = sampleWidth
  canvas.height = sampleHeight

  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('Canvas analysis is unavailable in this browser session.')
  }

  context.drawImage(image, 0, 0, sampleWidth, sampleHeight)

  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight)
  const cornerOffsets = [
    0,
    (sampleWidth - 1) * 4,
    ((sampleHeight - 1) * sampleWidth) * 4,
    (((sampleHeight - 1) * sampleWidth) + (sampleWidth - 1)) * 4,
  ]

  const backgroundRgb = averageColors(cornerOffsets.map(offset => getPixelColor(data, offset)))

  let accentRgb = backgroundRgb
  let accentScore = -1

  for (let offset = 0; offset < data.length; offset += 16) {
    const color = getPixelColor(data, offset)
    const saturation = Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b)
    const score = saturation + (colorDistance(color, backgroundRgb) * 0.35)

    if (score > accentScore) {
      accentScore = score
      accentRgb = color
    }
  }

  const aspectRatio = width / height
  const inferredLayout = aspectRatio > 1.18 ? 'HORIZONTAL' : aspectRatio < 0.9 ? 'VERTICAL' : 'GRID'
  const horizontalScale = width / sampleWidth
  const verticalScale = height / sampleHeight
  const topInset = estimateInset(sampleHeight, verticalScale, index => averageLineColor(data, sampleWidth, sampleHeight, 'row', index), backgroundRgb)
  const bottomInset = estimateInset(sampleHeight, verticalScale, index => averageLineColor(data, sampleWidth, sampleHeight, 'row', sampleHeight - 1 - index), backgroundRgb)
  const leftInset = estimateInset(sampleWidth, horizontalScale, index => averageLineColor(data, sampleWidth, sampleHeight, 'column', index), backgroundRgb)
  const rightInset = estimateInset(sampleWidth, horizontalScale, index => averageLineColor(data, sampleWidth, sampleHeight, 'column', sampleWidth - 1 - index), backgroundRgb)
  const padding = clamp(Math.round((topInset + rightInset + bottomInset + leftInset) / 4), 12, Math.round(Math.min(width, height) * 0.18))
  const itemSpacing = clamp(Math.round(padding * 0.65), 12, 32)
  const cornerRadius = clamp(Math.round(Math.min(width, height) * 0.06), 14, 32)

  return {
    width,
    height,
    aspectRatio,
    inferredLayout,
    itemSpacing,
    padding,
    cornerRadius,
    estimatedSections: inferredLayout === 'GRID' ? 4 : 2,
    backgroundRgb,
    accentRgb,
    backgroundColor: rgbToFigmaColor(backgroundRgb),
    accentColor: rgbToFigmaColor(accentRgb),
    backgroundCss: rgbToCss(backgroundRgb),
    accentCss: rgbToCss(accentRgb),
  }
}

function resetUploadedImage() {
  if (uploadedImageUrl.value && import.meta.client) {
    URL.revokeObjectURL(uploadedImageUrl.value)
  }

  uploadedImageName.value = ''
  uploadedImageType.value = ''
  uploadedImageSize.value = 0
  uploadedImageUrl.value = ''
  uploadedImageAnalysis.value = null
  imageMessage.value = ''
  imageError.value = ''

  if (imageInput.value) {
    imageInput.value.value = ''
  }
}

async function handleImageFile(file?: File | null) {
  if (!file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    imageError.value = 'Please choose a valid image file.'
    return
  }

  imageLoading.value = true
  imageError.value = ''
  imageMessage.value = ''

  const previewUrl = URL.createObjectURL(file)

  try {
    const analysis = await analyzeUploadedImage(previewUrl)
    const previousUrl = uploadedImageUrl.value

    if (previousUrl && import.meta.client) {
      URL.revokeObjectURL(previousUrl)
    }

    uploadedImageName.value = file.name
    uploadedImageType.value = file.type
    uploadedImageSize.value = file.size
    uploadedImageUrl.value = previewUrl
    uploadedImageAnalysis.value = analysis
    figmaResponse.value = null
    figmaError.value = ''
    figmaMessage.value = ''
    sourceMode.value = 'image-upload'
    layoutMode.value = analysis.inferredLayout === 'GRID' ? 'grid' : 'flexbox'
    pastedPayload.value = JSON.stringify(buildImageAutoLayoutPayload(analysis), null, 2)
    imageMessage.value = `Temporary upload ready. Using ${analysis.inferredLayout.toLowerCase()} inference from ${analysis.width}×${analysis.height} pixels.`
  }
  catch (error: any) {
    if (import.meta.client) {
      URL.revokeObjectURL(previewUrl)
    }

    imageError.value = error?.message || 'The uploaded image could not be analyzed.'
  }
  finally {
    imageLoading.value = false
    imageDragging.value = false
  }
}

function openImagePicker() {
  imageInput.value?.click()
}

function onImageInputChange(event: Event) {
  const target = event.target as HTMLInputElement | null
  void handleImageFile(target?.files?.[0] || null)
}

function onImageDrop(event: DragEvent) {
  event.preventDefault()
  imageDragging.value = false
  void handleImageFile(event.dataTransfer?.files?.[0] || null)
}

onBeforeUnmount(() => {
  if (uploadedImageUrl.value && import.meta.client) {
    URL.revokeObjectURL(uploadedImageUrl.value)
  }
})

function px(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return ''
  }

  return `${Math.round(value)}px`
}

function normalizeUnitColor(value?: number) {
  if (value == null || Number.isNaN(value)) {
    return 0
  }

  return Math.max(0, Math.min(255, Math.round(value * 255)))
}

function extractFillColor(node?: FigmaSceneNode | null) {
  if (!node?.fills || !Array.isArray(node.fills)) {
    return ''
  }

  const solidFill = node.fills.find(fill => fill?.type === 'SOLID' && fill.visible !== false && fill.color)

  if (!solidFill?.color) {
    return ''
  }

  const red = normalizeUnitColor(solidFill.color.r)
  const green = normalizeUnitColor(solidFill.color.g)
  const blue = normalizeUnitColor(solidFill.color.b)
  const alpha = solidFill.opacity ?? solidFill.color.a ?? 1

  if (alpha < 1) {
    return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha)).toFixed(2)})`
  }

  return `rgb(${red}, ${green}, ${blue})`
}

function sanitizeClassName(value?: string | null) {
  return (value || 'node')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function escapeHtml(value?: string | null) {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getDisplayDeclarations(node: FigmaSceneNode, isRoot = false) {
  const declarations: string[] = []
  const nodeLayoutMode = node.layoutMode

  if (nodeLayoutMode === 'HORIZONTAL') {
    declarations.push('display: flex;', 'flex-direction: row;')
  }
  else if (nodeLayoutMode === 'VERTICAL') {
    declarations.push('display: flex;', 'flex-direction: column;')
  }
  else if (nodeLayoutMode === 'GRID') {
    declarations.push('display: grid;', 'grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));')
  }
  else if (isRoot && layoutMode.value === 'grid') {
    declarations.push('display: grid;', 'grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));')
  }
  else if (isRoot) {
    declarations.push('display: flex;', 'flex-direction: column;')
  }

  if (node.layoutWrap === 'WRAP') {
    declarations.push('flex-wrap: wrap;')
  }

  if (node.itemSpacing != null) {
    declarations.push(`gap: ${px(node.itemSpacing)};`)
  }

  return declarations
}

function getSizingDeclarations(node: FigmaSceneNode, isRoot = false) {
  const declarations: string[] = []
  const width = node.absoluteBoundingBox?.width
  const height = node.absoluteBoundingBox?.height

  if (!isRoot && width != null && width > 0 && width < 900) {
    declarations.push(`width: ${px(width)};`)
  }

  if (!isRoot && height != null && height > 0 && height < 900) {
    declarations.push(`min-height: ${px(height)};`)
  }

  return declarations
}

function getCommonDeclarations(node: FigmaSceneNode, isRoot = false) {
  const declarations = [
    ...getDisplayDeclarations(node, isRoot),
    ...getSizingDeclarations(node, isRoot),
  ]

  const hasPadding = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].some(value => value != null)

  if (hasPadding) {
    declarations.push(
      `padding: ${px(node.paddingTop ?? 0)} ${px(node.paddingRight ?? 0)} ${px(node.paddingBottom ?? 0)} ${px(node.paddingLeft ?? 0)};`,
    )
  }

  if (node.cornerRadius != null) {
    declarations.push(`border-radius: ${px(node.cornerRadius)};`)
  }

  const fillColor = extractFillColor(node)

  if (fillColor) {
    declarations.push(`background: ${fillColor};`)
  }

  return declarations
}

function textDeclarations(node: FigmaSceneNode) {
  const declarations: string[] = []

  if (node.style?.fontSize) {
    declarations.push(`font-size: ${px(node.style.fontSize)};`)
  }

  if (node.style?.fontWeight) {
    declarations.push(`font-weight: ${node.style.fontWeight};`)
  }

  if (node.style?.lineHeightPx) {
    declarations.push(`line-height: ${px(node.style.lineHeightPx)};`)
  }

  if (node.style?.textAlignHorizontal) {
    declarations.push(`text-align: ${node.style.textAlignHorizontal.toLowerCase()};`)
  }

  return declarations
}

type PlainBuildResult = {
  html: string
  css: string[]
}

function buildPlainNode(node: FigmaSceneNode, depth = 0, index = 0): PlainBuildResult {
  const classBase = sanitizeClassName(node.name || node.id || `${depth}-${index}`)
  const className = `fig-${classBase || `${depth}-${index}`}`
  const isRoot = depth === 0
  const children = Array.isArray(node.children) ? node.children : []
  const isText = node.type === 'TEXT'
  const isImage = node.type === 'IMAGE' || Boolean(node.imageRef || node.exportSrc)
  const tag = isText ? 'p' : 'div'

  const nodeDeclarations = [
    ...getCommonDeclarations(node, isRoot),
    ...(isText ? textDeclarations(node) : []),
  ]

  if (isImage) {
    nodeDeclarations.push('display: block;', 'width: 100%;', 'height: auto;', 'object-fit: cover;')

    if (node.absoluteBoundingBox?.width && node.absoluteBoundingBox?.height) {
      nodeDeclarations.push(`aspect-ratio: ${Math.round(node.absoluteBoundingBox.width)} / ${Math.round(node.absoluteBoundingBox.height)};`)
    }
  }

  if (!isText && !isImage && !children.length) {
    nodeDeclarations.push('min-height: 32px;', 'border: 1px dashed rgba(148, 163, 184, 0.45);')
  }

  const cssRules = [`.${className} {\n  ${nodeDeclarations.join('\n  ')}\n}`]

  if (isText) {
    const textContent = escapeHtml(node.characters || node.name || 'Text layer')
    return {
      html: `<${tag} class="${className}">${textContent}</${tag}>`,
      css: cssRules,
    }
  }

  if (isImage) {
    return {
      html: `<img class="${className}" src="${escapeHtml(node.exportSrc || 'design-reference.png')}" alt="${escapeHtml(node.imageAlt || node.name || 'Design reference')}" />`,
      css: cssRules,
    }
  }

  const childResults = children.map((child, childIndex) => buildPlainNode(child, depth + 1, childIndex))
  const childrenHtml = childResults.map(result => result.html).join('\n')
  const childrenCss = childResults.flatMap(result => result.css)

  const label = !children.length
    ? `<span class="${className}__label">${escapeHtml(node.name || node.type || 'Layer')}</span>`
    : ''

  if (!children.length) {
    cssRules.push(`.${className}__label {\n  font-size: 12px;\n  color: #475569;\n}`)
  }

  return {
    html: `<${tag} class="${className}">${childrenHtml || label}</${tag}>`,
    css: [...cssRules, ...childrenCss],
  }
}

function tailwindColorClass(node: FigmaSceneNode) {
  const fillColor = extractFillColor(node)

  if (!fillColor) {
    return ''
  }

  return `bg-[${fillColor.replace(/\s+/g, '')}]`
}

function tailwindTextClasses(node: FigmaSceneNode) {
  const classes: string[] = []

  if (node.style?.fontSize) {
    classes.push(`text-[${Math.round(node.style.fontSize)}px]`)
  }

  if (node.style?.fontWeight) {
    classes.push(`font-[${Math.round(node.style.fontWeight)}]`)
  }

  if (node.style?.lineHeightPx) {
    classes.push(`leading-[${Math.round(node.style.lineHeightPx)}px]`)
  }

  return classes
}

function buildTailwindNode(node: FigmaSceneNode, depth = 0, index = 0): string {
  const children = Array.isArray(node.children) ? node.children : []
  const isText = node.type === 'TEXT'
  const isImage = node.type === 'IMAGE' || Boolean(node.imageRef || node.exportSrc)
  const isRoot = depth === 0
  const classes: string[] = ['rounded-[8px]']

  if (node.layoutMode === 'HORIZONTAL') {
    classes.push('flex', 'flex-row')
  }
  else if (node.layoutMode === 'VERTICAL') {
    classes.push('flex', 'flex-col')
  }
  else if (node.layoutMode === 'GRID') {
    classes.push('grid', 'grid-cols-2')
  }
  else if (isRoot && layoutMode.value === 'grid') {
    classes.push('grid', 'grid-cols-2')
  }
  else if (isRoot || children.length) {
    classes.push('flex', 'flex-col')
  }

  if (node.itemSpacing != null) {
    classes.push(`gap-[${Math.round(node.itemSpacing)}px]`)
  }

  const top = node.paddingTop ?? 0
  const right = node.paddingRight ?? 0
  const bottom = node.paddingBottom ?? 0
  const left = node.paddingLeft ?? 0

  if (top || right || bottom || left) {
    if (top === right && right === bottom && bottom === left) {
      classes.push(`p-[${Math.round(top)}px]`)
    }
    else {
      if (top) classes.push(`pt-[${Math.round(top)}px]`)
      if (right) classes.push(`pr-[${Math.round(right)}px]`)
      if (bottom) classes.push(`pb-[${Math.round(bottom)}px]`)
      if (left) classes.push(`pl-[${Math.round(left)}px]`)
    }
  }

  if (node.cornerRadius != null) {
    classes.push(`rounded-[${Math.round(node.cornerRadius)}px]`)
  }

  const bgClass = tailwindColorClass(node)
  if (bgClass) {
    classes.push(bgClass)
  }

  const width = node.absoluteBoundingBox?.width
  const height = node.absoluteBoundingBox?.height

  if (!isRoot && width != null && width > 0 && width < 900) {
    classes.push(`w-[${Math.round(width)}px]`)
  }

  if (!isRoot && height != null && height > 0 && height < 900) {
    classes.push(`min-h-[${Math.round(height)}px]`)
  }

  if (isImage) {
    classes.push('block', 'w-full', 'h-auto', 'object-cover')

    if (width != null && width > 0 && height != null && height > 0) {
      classes.push(`aspect-[${Math.round(width)}/${Math.round(height)}]`)
    }

    return `<img class="${classes.join(' ')}" src="${escapeHtml(node.exportSrc || 'design-reference.png')}" alt="${escapeHtml(node.imageAlt || node.name || 'Design reference')}" />`
  }

  if (isText) {
    classes.push(...tailwindTextClasses(node))
    return `<p class="${classes.join(' ')}">${escapeHtml(node.characters || node.name || 'Text layer')}</p>`
  }

  if (!children.length) {
    classes.push('border', 'border-dashed', 'border-slate-300', 'text-xs', 'text-slate-500', 'items-center', 'justify-center')
    const label = escapeHtml(node.name || node.type || `Layer ${depth}-${index}`)
    return `<div class="${classes.join(' ')}">${label}</div>`
  }

  const childMarkup = children
    .map((child, childIndex) => buildTailwindNode(child, depth + 1, childIndex))
    .join('\n')

  return `<div class="${classes.join(' ')}">\n${childMarkup}\n</div>`
}

function previewStyle(node: FigmaSceneNode, isRoot = false) {
  const declarations = [
    ...getCommonDeclarations(node, isRoot),
    ...(node.type === 'TEXT' ? textDeclarations(node) : []),
  ]

  if (node.type === 'IMAGE' || node.imageRef || node.exportSrc) {
    declarations.push('display: block;', 'width: 100%;', 'height: auto;', 'object-fit: cover;')

    if (node.absoluteBoundingBox?.width && node.absoluteBoundingBox?.height) {
      declarations.push(`aspect-ratio: ${Math.round(node.absoluteBoundingBox.width)} / ${Math.round(node.absoluteBoundingBox.height)};`)
    }
  }

  if (isRoot) {
    declarations.push('width: 100%;', 'max-width: 100%;')
  }

  if (node.type !== 'TEXT' && node.type !== 'IMAGE' && !node.imageRef && !node.exportSrc && (!node.children || !node.children.length)) {
    declarations.push('min-height: 32px;', 'border: 1px dashed rgba(148, 163, 184, 0.45);', 'display: flex;', 'align-items: center;')
  }

  return declarations.join(' ')
}

function buildPreviewNode(node: FigmaSceneNode, depth = 0, index = 0): string {
  const children = Array.isArray(node.children) ? node.children : []
  const isText = node.type === 'TEXT'
  const isImage = node.type === 'IMAGE' || Boolean(node.imageRef || node.exportSrc)
  const tag = isText ? 'p' : 'div'
  const style = previewStyle(node, depth === 0)

  if (isText) {
    return `<${tag} style="${style}">${escapeHtml(node.characters || node.name || 'Text layer')}</${tag}>`
  }

  if (isImage) {
    return `<img style="${style}" src="${escapeHtml(node.imageRef || node.exportSrc || '')}" alt="${escapeHtml(node.imageAlt || node.name || 'Design reference')}" />`
  }

  if (!children.length) {
    return `<${tag} style="${style}"><span style="font-size:12px;color:#475569">${escapeHtml(node.name || node.type || `Layer ${depth}-${index}`)}</span></${tag}>`
  }

  const childHtml = children.map((child, childIndex) => buildPreviewNode(child, depth + 1, childIndex)).join('')
  return `<${tag} style="${style}">${childHtml}</${tag}>`
}

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

const previewInlineHtml = computed(() => buildPreviewNode(activeNode.value))

const generatedHtml = computed(() => {
  if (outputMode.value === 'tailwind') {
    return buildTailwindNode(activeNode.value)
  }

  return buildPlainNode(activeNode.value).html
})

const generatedCss = computed(() => {
  if (outputMode.value === 'tailwind') {
    return `/* Tailwind mode selected */
/* Utility classes are embedded directly in the HTML output. */`
  }

  const plainResult = buildPlainNode(activeNode.value)
  return plainResult.css.join('\n\n')
})
</script>

<template>
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
          <label
            class="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed px-6 py-8 text-center transition"
            :class="imageDragging ? 'border-slate-900 bg-white shadow-lg shadow-slate-900/5' : 'border-slate-300 bg-slate-50/80 hover:border-slate-400 hover:bg-white'"
            @click="openImagePicker"
            @dragenter.prevent="imageDragging = true"
            @dragover.prevent="imageDragging = true"
            @dragleave.prevent="imageDragging = false"
            @drop="onImageDrop"
          >
            <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">🖼️</span>
            <span class="mt-4 text-base font-semibold text-slate-800">Drop a screenshot or export here</span>
            <span class="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              The image stays temporary in the current browser session and is used to infer the preview structure, spacing, and generated HTML/CSS.
            </span>
            <span class="mt-4 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {{ imageLoading ? 'Analyzing image…' : 'Choose image' }}
            </span>
            <input
              ref="imageInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onImageInputChange"
            >
          </label>

          <div v-if="imageError" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {{ imageError }}
          </div>

          <div v-else-if="imageMessage" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {{ imageMessage }}
          </div>

          <div v-if="uploadedImageUrl && uploadedImageAnalysis" class="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[160px_minmax(0,1fr)]">
            <div class="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50">
              <img :src="uploadedImageUrl" :alt="uploadedImageName || 'Uploaded reference image'" class="h-full w-full object-cover">
            </div>

            <div class="space-y-3">
              <div>
                <p class="text-sm font-semibold text-slate-900">{{ uploadedImageName }}</p>
                <p class="mt-1 text-sm text-slate-500">{{ uploadedImageType || 'image/*' }} · {{ formatBytes(uploadedImageSize) }}</p>
              </div>

              <div class="flex flex-wrap gap-2">
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{{ uploadedImageAnalysis.width }}×{{ uploadedImageAnalysis.height }}</span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{{ uploadedImageAnalysis.inferredLayout.toLowerCase() }}</span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Padding {{ uploadedImageAnalysis.padding }}px</span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Gap {{ uploadedImageAnalysis.itemSpacing }}px</span>
              </div>

              <p class="text-sm leading-6 text-slate-500">
                The temporary upload is currently shaping the fallback structure used by the live preview and the generated code export.
              </p>

              <div class="flex flex-wrap gap-3">
                <button class="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" @click="openImagePicker">
                  Replace image
                </button>
                <button class="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" @click="resetUploadedImage">
                  Remove image
                </button>
              </div>
            </div>
          </div>
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

            <div class="mt-4 space-y-4 rounded-[28px] bg-white p-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
              <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4">
                <div v-html="previewInlineHtml" />
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
</template>

