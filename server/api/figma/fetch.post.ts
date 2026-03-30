import { $fetch } from 'ofetch'
import { createError, defineEventHandler, readBody } from 'h3'

type FigmaNode = {
  id?: string
  name?: string
  type?: string
  layoutMode?: string
  primaryAxisSizingMode?: string
  counterAxisSizingMode?: string
  primaryAxisAlignItems?: string
  counterAxisAlignItems?: string
  itemSpacing?: number
  layoutWrap?: string
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  cornerRadius?: number
  absoluteBoundingBox?: {
    width?: number
    height?: number
  }
  children?: unknown[]
}

type FigmaRequestBody = {
  fileUrl?: string
  token?: string
  nodeId?: string
}

function parseFileKeyFromUrl(fileUrl: string) {
  const parsedUrl = new URL(fileUrl)
  const segments = parsedUrl.pathname.split('/').filter(Boolean)

  const keywordIndex = segments.findIndex(segment => segment === 'file' || segment === 'design')

  if (keywordIndex >= 0 && segments[keywordIndex + 1]) {
    return segments[keywordIndex + 1]
  }

  return segments[0] || ''
}

function normalizeNodeId(rawNodeId?: string) {
  if (!rawNodeId) {
    return ''
  }

  const decodedNodeId = decodeURIComponent(rawNodeId).trim()
  return decodedNodeId.replace(/-/g, ':')
}

function parseNodeIdFromUrl(fileUrl: string) {
  const parsedUrl = new URL(fileUrl)
  const nodeIdFromQuery = parsedUrl.searchParams.get('node-id') || parsedUrl.searchParams.get('nodeId') || ''
  return normalizeNodeId(nodeIdFromQuery)
}

function extractAutoLayout(node?: FigmaNode | null) {
  if (!node) {
    return null
  }

  return {
    id: node.id ?? null,
    name: node.name ?? null,
    type: node.type ?? null,
    layoutMode: node.layoutMode ?? null,
    primaryAxisSizingMode: node.primaryAxisSizingMode ?? null,
    counterAxisSizingMode: node.counterAxisSizingMode ?? null,
    primaryAxisAlignItems: node.primaryAxisAlignItems ?? null,
    counterAxisAlignItems: node.counterAxisAlignItems ?? null,
    itemSpacing: node.itemSpacing ?? null,
    layoutWrap: node.layoutWrap ?? null,
    paddingTop: node.paddingTop ?? null,
    paddingRight: node.paddingRight ?? null,
    paddingBottom: node.paddingBottom ?? null,
    paddingLeft: node.paddingLeft ?? null,
    cornerRadius: node.cornerRadius ?? null,
    width: node.absoluteBoundingBox?.width ?? null,
    height: node.absoluteBoundingBox?.height ?? null,
    childrenCount: Array.isArray(node.children) ? node.children.length : 0,
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<FigmaRequestBody>(event)

  const fileUrl = body?.fileUrl?.trim() || ''
  const token = body?.token?.trim() || ''

  if (!fileUrl) {
    throw createError({ statusCode: 400, statusMessage: 'A Figma file URL is required.' })
  }

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'A Figma REST API token is required.' })
  }

  let fileKey = ''

  try {
    fileKey = parseFileKeyFromUrl(fileUrl)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'The provided Figma file URL is invalid.' })
  }

  if (!fileKey) {
    throw createError({ statusCode: 400, statusMessage: 'Could not extract the file key from the provided Figma URL.' })
  }

  const normalizedNodeId = normalizeNodeId(body?.nodeId) || parseNodeIdFromUrl(fileUrl)

  try {
    if (normalizedNodeId) {
      const nodesResponse = await $fetch<any>(`https://api.figma.com/v1/files/${fileKey}/nodes`, {
        method: 'GET',
        query: {
          ids: normalizedNodeId,
        },
        headers: {
          'X-Figma-Token': token,
        },
      })

      const selectedNode = nodesResponse?.nodes?.[normalizedNodeId]?.document as FigmaNode | undefined

      if (!selectedNode) {
        throw createError({ statusCode: 404, statusMessage: `Node ${normalizedNodeId} was not found in the file.` })
      }

      return {
        source: 'figma-api',
        fileKey,
        fileName: nodesResponse?.name || null,
        nodeId: normalizedNodeId,
        autoLayout: extractAutoLayout(selectedNode),
        node: selectedNode,
      }
    }

    const fileResponse = await $fetch<any>(`https://api.figma.com/v1/files/${fileKey}`, {
      method: 'GET',
      query: {
        depth: 2,
      },
      headers: {
        'X-Figma-Token': token,
      },
    })

    return {
      source: 'figma-api',
      fileKey,
      fileName: fileResponse?.name || null,
      nodeId: null,
      autoLayout: null,
      node: null,
      document: fileResponse?.document || null,
      message: 'File loaded. Add a node id to extract a specific auto-layout node.',
    }
  }
  catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 502,
      statusMessage: error?.data?.message || error?.message || 'Failed to fetch data from the Figma REST API.',
    })
  }
})
