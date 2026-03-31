/**
 * GlobTool - Find files by pattern.
 * Inspired by src/tools/GlobTool/
 */

import { z } from 'zod'
import { globby } from 'globby'
import type { Tool, ToolResult, ToolContext } from '../types.js'

const InputSchema = z.object({
  pattern: z.string().describe('Glob pattern to match files'),
  path: z.string().optional().describe('Directory to search in'),
})

type GlobInput = z.infer<typeof InputSchema>

export const GlobTool: Tool<GlobInput> = {
  name: 'Glob',
  description: 'Find files matching a glob pattern.',
  inputSchema: InputSchema as z.ZodType<GlobInput>,
  isReadOnly: true,

  async call(input: GlobInput, context: ToolContext): Promise<ToolResult> {
    try {
      const cwd = input.path ?? context.cwd
      const files = await globby(input.pattern, {
        cwd,
        absolute: true,
        dot: false,
        ignore: ['**/node_modules/**', '**/.git/**'],
      })

      if (files.length === 0) {
        return { output: 'No files found matching pattern.', isError: false }
      }

      const limited = files.slice(0, 200)
      let output = limited.join('\n')
      if (files.length > 200) {
        output += `\n\n... and ${files.length - 200} more files`
      }

      return { output, isError: false }
    } catch (err) {
      return {
        output: `Error: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      }
    }
  },
}
