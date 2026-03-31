/**
 * FileEditTool - Edit files via string replacement.
 * Inspired by src/tools/FileEditTool/FileEditTool.ts
 */

import { z } from 'zod'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import type { Tool, ToolResult, ToolContext } from '../types.js'

const InputSchema = z.object({
  file_path: z.string().describe('Absolute path to the file to modify'),
  old_string: z.string().describe('The text to replace'),
  new_string: z.string().describe('The replacement text'),
  replace_all: z.boolean().optional().default(false).describe('Replace all occurrences'),
})

type FileEditInput = z.infer<typeof InputSchema>

export const FileEditTool: Tool<FileEditInput> = {
  name: 'Edit',
  description: 'Replace text in a file. The old_string must be unique unless replace_all is true.',
  inputSchema: InputSchema as z.ZodType<FileEditInput>,
  isReadOnly: false,

  async call(input: FileEditInput, _context: ToolContext): Promise<ToolResult> {
    const { file_path, old_string, new_string, replace_all } = input

    if (!existsSync(file_path)) {
      return { output: `Error: File not found: ${file_path}`, isError: true }
    }

    try {
      const content = await readFile(file_path, 'utf-8')

      if (!content.includes(old_string)) {
        return { output: 'Error: old_string not found in file', isError: true }
      }

      if (!replace_all) {
        const count = content.split(old_string).length - 1
        if (count > 1) {
          return {
            output: `Error: old_string found ${count} times. Use replace_all or provide more context.`,
            isError: true,
          }
        }
      }

      const updated = replace_all
        ? content.replaceAll(old_string, new_string)
        : content.replace(old_string, new_string)

      await writeFile(file_path, updated, 'utf-8')

      return { output: `Successfully edited ${file_path}`, isError: false }
    } catch (err) {
      return {
        output: `Error editing file: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      }
    }
  },
}
