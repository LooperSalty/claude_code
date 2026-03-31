/**
 * FileWriteTool - Write/create files.
 * Inspired by src/tools/FileWriteTool/
 */

import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import type { Tool, ToolResult, ToolContext } from '../types.js'

const InputSchema = z.object({
  file_path: z.string().describe('Absolute path to the file to write'),
  content: z.string().describe('The content to write'),
})

type FileWriteInput = z.infer<typeof InputSchema>

export const FileWriteTool: Tool<FileWriteInput> = {
  name: 'Write',
  description: 'Write content to a file. Creates the file if it does not exist.',
  inputSchema: InputSchema as z.ZodType<FileWriteInput>,
  isReadOnly: false,

  async call(input: FileWriteInput, _context: ToolContext): Promise<ToolResult> {
    try {
      await mkdir(dirname(input.file_path), { recursive: true })
      await writeFile(input.file_path, input.content, 'utf-8')
      return { output: `Successfully wrote ${input.file_path}`, isError: false }
    } catch (err) {
      return {
        output: `Error writing file: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      }
    }
  },
}
