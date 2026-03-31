/**
 * GrepTool - Search file contents with regex.
 * Inspired by src/tools/GrepTool/GrepTool.ts
 */

import { z } from 'zod'
import { execa } from 'execa'
import type { Tool, ToolResult, ToolContext } from '../types.js'

const InputSchema = z.object({
  pattern: z.string().describe('Regex pattern to search for'),
  path: z.string().optional().describe('File or directory to search in'),
  glob: z.string().optional().describe('Glob pattern to filter files'),
  case_insensitive: z.boolean().optional().default(false),
})

type GrepInput = z.infer<typeof InputSchema>

export const GrepTool: Tool<GrepInput> = {
  name: 'Grep',
  description: 'Search file contents using regex. Uses ripgrep (rg) if available, falls back to grep.',
  inputSchema: InputSchema as z.ZodType<GrepInput>,
  isReadOnly: true,

  async call(input: GrepInput, context: ToolContext): Promise<ToolResult> {
    const searchPath = input.path ?? context.cwd
    const args: string[] = ['--line-number', '--no-heading', '--color=never']

    if (input.case_insensitive) args.push('-i')
    if (input.glob) args.push('--glob', input.glob)
    args.push('--', input.pattern, searchPath)

    try {
      // Try ripgrep first, fall back to grep
      let cmd = 'rg'
      try {
        await execa('rg', ['--version'])
      } catch {
        cmd = 'grep'
        args.length = 0
        args.push('-rn', '--color=never')
        if (input.case_insensitive) args.push('-i')
        args.push(input.pattern, searchPath)
      }

      const result = await execa(cmd, args, {
        cwd: context.cwd,
        reject: false,
        timeout: 30_000,
      })

      const output = result.stdout?.slice(0, 30_000) ?? ''
      if (!output) {
        return { output: 'No matches found.', isError: false }
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
