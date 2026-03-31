/**
 * BashTool - Execute shell commands.
 * Inspired by src/tools/BashTool/BashTool.tsx
 */

import { z } from 'zod'
import { execa } from 'execa'
import type { Tool, ToolResult, ToolContext } from '../types.js'

const InputSchema = z.object({
  command: z.string().describe('The bash command to execute'),
  timeout: z.number().optional().describe('Timeout in milliseconds (max 120000)'),
})

type BashInput = z.infer<typeof InputSchema>

export const BashTool: Tool<BashInput> = {
  name: 'Bash',
  description: 'Execute a shell command and return its output.',
  inputSchema: InputSchema as z.ZodType<BashInput>,
  isReadOnly: false,

  async call(input: BashInput, context: ToolContext): Promise<ToolResult> {
    const timeout = Math.min(input.timeout ?? 120_000, 120_000)

    try {
      const result = await execa('bash', ['-c', input.command], {
        cwd: context.cwd,
        timeout,
        reject: false,
        env: { ...process.env, TERM: 'dumb' },
      })

      const stdout = result.stdout?.slice(0, 30_000) ?? ''
      const stderr = result.stderr?.slice(0, 10_000) ?? ''
      const exitCode = result.exitCode

      let output = ''
      if (stdout) output += stdout
      if (stderr) output += (output ? '\n' : '') + `[stderr]\n${stderr}`
      if (exitCode !== 0) output += `\n[exit code: ${exitCode}]`

      return {
        output: output || '(no output)',
        isError: exitCode !== 0,
      }
    } catch (err) {
      return {
        output: `Error: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      }
    }
  },
}
