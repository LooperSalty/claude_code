/**
 * API service - handles Claude API communication with streaming and tool use.
 * Inspired by src/services/api/client.ts and src/query.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Message, ToolUseResult, Config } from '../types.js'
import { ALL_TOOLS, getToolByName } from '../tools/index.js'
import type { ToolContext } from '../types.js'

// Convert our tools to Anthropic API tool format
function getToolDefinitions(): Anthropic.Tool[] {
  return ALL_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object' as const,
      properties: Object.fromEntries(
        Object.entries(
          (tool.inputSchema as any)._def?.shape?.() ?? {},
        ).map(([key, schema]: [string, any]) => [
          key,
          {
            type: schema._def?.typeName === 'ZodNumber' ? 'number'
              : schema._def?.typeName === 'ZodBoolean' ? 'boolean'
              : 'string',
            description: schema._def?.description ?? key,
          },
        ]),
      ),
      required: Object.entries(
        (tool.inputSchema as any)._def?.shape?.() ?? {},
      )
        .filter(([_, schema]: [string, any]) => !schema.isOptional?.())
        .map(([key]) => key),
    },
  }))
}

export interface StreamCallbacks {
  onText: (text: string) => void
  onToolUse: (toolName: string, input: Record<string, unknown>) => void
  onToolResult: (toolName: string, result: string, isError: boolean) => void
  onDone: (usage: { inputTokens: number; outputTokens: number }) => void
  onError: (error: Error) => void
}

export async function queryWithTools(
  config: Config,
  messages: Message[],
  callbacks: StreamCallbacks,
): Promise<Message[]> {
  const client = new Anthropic({ apiKey: config.apiKey })

  const apiMessages: Anthropic.MessageParam[] = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const toolContext: ToolContext = {
    cwd: config.cwd,
    abortSignal: AbortSignal.timeout(300_000),
  }

  const resultMessages: Message[] = []
  let continueLoop = true

  while (continueLoop) {
    continueLoop = false

    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      system: config.systemPrompt,
      tools: getToolDefinitions(),
      messages: apiMessages,
    })

    let assistantText = ''
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    const toolUseResults: ToolUseResult[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        assistantText += block.text
        callbacks.onText(block.text)
      } else if (block.type === 'tool_use') {
        callbacks.onToolUse(block.name, block.input as Record<string, unknown>)

        const tool = getToolByName(block.name)
        if (!tool) {
          const errorMsg = `Unknown tool: ${block.name}`
          callbacks.onToolResult(block.name, errorMsg, true)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: errorMsg,
            is_error: true,
          })
          continue
        }

        const startTime = Date.now()
        const result = await tool.call(block.input as any, toolContext)
        const durationMs = Date.now() - startTime

        callbacks.onToolResult(block.name, result.output, result.isError)

        toolUseResults.push({
          toolName: block.name,
          input: block.input as Record<string, unknown>,
          output: result.output,
          isError: result.isError,
          durationMs,
        })

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result.output,
          is_error: result.isError,
        })
      }
    }

    // Add assistant message
    apiMessages.push({ role: 'assistant', content: response.content })
    resultMessages.push({
      role: 'assistant',
      content: assistantText,
      toolUse: toolUseResults.length > 0 ? toolUseResults : undefined,
      timestamp: Date.now(),
    })

    // If there were tool uses, continue the loop
    if (toolResults.length > 0) {
      apiMessages.push({ role: 'user', content: toolResults })
      continueLoop = response.stop_reason === 'tool_use'
    }

    callbacks.onDone({
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    })
  }

  return resultMessages
}
