/**
 * Tool registry - assembles all available tools.
 * Inspired by src/tools.ts
 */

import type { Tool } from '../types.js'
import { BashTool } from './bash.js'
import { FileReadTool } from './fileRead.js'
import { FileEditTool } from './fileEdit.js'
import { FileWriteTool } from './fileWrite.js'
import { GlobTool } from './glob.js'
import { GrepTool } from './grep.js'

export const ALL_TOOLS: Tool<any>[] = [
  BashTool,
  FileReadTool,
  FileEditTool,
  FileWriteTool,
  GlobTool,
  GrepTool,
]

export function getToolByName(name: string): Tool<any> | undefined {
  return ALL_TOOLS.find(
    (t) => t.name.toLowerCase() === name.toLowerCase(),
  )
}

export function getToolDescriptions(): string {
  return ALL_TOOLS.map(
    (t) => `- ${t.name}: ${t.description}`,
  ).join('\n')
}
