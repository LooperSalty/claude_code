/**
 * FileReadTool - Read file contents.
 * Inspired by src/tools/FileReadTool/
 */

import { z } from 'zod'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import type { Tool, ToolResult, ToolContext } from '../types.js'

const InputSchema = z.object({
  file_path: z.string().describe('Absolute path to the file to read'),
  offset: z.number().optional().describe('Line number to start reading from'),
  limit: z.number().optional().describe('Number of lines to read'),
})

type FileReadInput = z.infer<typeof InputSchema>

export const FileReadTool: Tool<FileReadInput> = {
  name: 'Read',
  description: 'Read the contents of a file. Returns numbered lines.',
  inputSchema: InputSchema as z.ZodType<FileReadInput>,
  isReadOnly: true,

  async call(input: FileReadInput, _context: ToolContext): Promise<ToolResult> {
    const { file_path, offset = 0, limit = 2000 } = input

    if (!existsSync(file_path)) {
      return { output: `Error: File not found: ${file_path}`, isError: true }
    }

    try {
      const content = await readFile(file_path, 'utf-8')
      const lines = content.split('\n')
      const start = Math.max(0, offset)
      const end = Math.min(lines.length, start + limit)
      const numbered = lines
        .slice(start, end)
        .map((line, i) => `${start + i + 1}\t${line}`)
        .join('\n')

      return { output: numbered, isError: false }
    } catch (err) {
      return {
        output: `Error reading file: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      }
    }
  },
}
