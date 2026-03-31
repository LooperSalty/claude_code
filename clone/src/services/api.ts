/**
 * API service - handles LLM communication with tool use.
 * Supports both Anthropic Claude and Google Gemini.
 */

import { GoogleGenerativeAI, type FunctionDeclaration, SchemaType } from '@google/generative-ai'
import type { Message, ToolUseResult, Config } from '../types.js'
import { ALL_TOOLS, getToolByName } from '../tools/index.js'
import type { ToolContext } from '../types.js'

// Convert tools to Gemini function declarations
function getGeminiFunctionDeclarations(): FunctionDeclaration[] {
  return ALL_TOOLS.map((tool) => {
    const shape = (tool.inputSchema as any)._def?.shape?.() ?? {}
    const properties: Record<string, any> = {}
    const required: string[] = []

    for (const [key, schema] of Object.entries(shape) as [string, any][]) {
      const typeName = schema._def?.typeName
      let innerSchema = schema

      // Unwrap ZodOptional / ZodDefault
      if (typeName === 'ZodOptional' || typeName === 'ZodDefault') {
        innerSchema = schema._def?.innerType ?? schema
      } else {
        required.push(key)
      }

      const innerTypeName = innerSchema._def?.typeName
      properties[key] = {
        type: innerTypeName === 'ZodNumber' ? SchemaType.NUMBER
          : innerTypeName === 'ZodBoolean' ? SchemaType.BOOLEAN
          : SchemaType.STRING,
        description: schema._def?.description ?? innerSchema._def?.description ?? key,
      }
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: SchemaType.OBJECT,
        properties,
        required,
      },
    }
  })
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
  const genAI = new GoogleGenerativeAI(config.apiKey)

  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: config.systemPrompt,
    tools: [{ functionDeclarations: getGeminiFunctionDeclarations() }],
  })

  const toolContext: ToolContext = {
    cwd: config.cwd,
    abortSignal: AbortSignal.timeout(300_000),
  }

  // Build Gemini chat history from messages
  const history = messages
    .filter((m) => m.role !== 'system')
    .slice(0, -1) // All except the last user message
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    }))

  const lastUserMsg = messages.filter((m) => m.role === 'user').at(-1)
  if (!lastUserMsg) {
    return []
  }

  const chat = model.startChat({ history })
  const resultMessages: Message[] = []
  let continueLoop = true
  let currentInput = lastUserMsg.content

  while (continueLoop) {
    continueLoop = false

    const result = await chat.sendMessage(currentInput)
    const response = result.response
    const candidates = response.candidates ?? []
    const parts = candidates[0]?.content?.parts ?? []

    let assistantText = ''
    const toolUseResults: ToolUseResult[] = []
    const functionResponses: Array<{ functionResponse: { name: string; response: any } }> = []

    for (const part of parts) {
      if (part.text) {
        assistantText += part.text
        callbacks.onText(part.text)
      }

      if (part.functionCall) {
        const fnName = part.functionCall.name
        const fnArgs = (part.functionCall.args ?? {}) as Record<string, unknown>

        callbacks.onToolUse(fnName, fnArgs)

        const tool = getToolByName(fnName)
        if (!tool) {
          const errorMsg = `Unknown tool: ${fnName}`
          callbacks.onToolResult(fnName, errorMsg, true)
          functionResponses.push({
            functionResponse: { name: fnName, response: { error: errorMsg } },
          })
          continue
        }

        const startTime = Date.now()
        const toolResult = await tool.call(fnArgs as any, toolContext)
        const durationMs = Date.now() - startTime

        callbacks.onToolResult(fnName, toolResult.output, toolResult.isError)

        toolUseResults.push({
          toolName: fnName,
          input: fnArgs,
          output: toolResult.output,
          isError: toolResult.isError,
          durationMs,
        })

        functionResponses.push({
          functionResponse: {
            name: fnName,
            response: { result: toolResult.output, isError: toolResult.isError },
          },
        })
      }
    }

    resultMessages.push({
      role: 'assistant',
      content: assistantText,
      toolUse: toolUseResults.length > 0 ? toolUseResults : undefined,
      timestamp: Date.now(),
    })

    // Token usage estimation (Gemini doesn't always provide exact counts)
    const usage = response.usageMetadata
    callbacks.onDone({
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    })

    // If there were function calls, send the results back
    if (functionResponses.length > 0) {
      continueLoop = true
      currentInput = functionResponses as any
    }
  }

  return resultMessages
}
