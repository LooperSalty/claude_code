/**
 * Non-interactive test: sends one message to Gemini and prints the result.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { ALL_TOOLS, getToolByName } from './src/tools/index.js'
import { buildSystemPrompt } from './src/utils/context.js'
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai'
import chalk from 'chalk'

const API_KEY = process.env.GEMINI_API_KEY!
const MODEL = 'gemini-2.0-flash'
const CWD = process.cwd()

function getDeclarations(): FunctionDeclaration[] {
  return ALL_TOOLS.map((tool) => {
    const shape = (tool.inputSchema as any)._def?.shape?.() ?? {}
    const properties: Record<string, any> = {}
    const required: string[] = []
    for (const [key, schema] of Object.entries(shape) as [string, any][]) {
      const typeName = schema._def?.typeName
      let inner = schema
      if (typeName === 'ZodOptional' || typeName === 'ZodDefault') {
        inner = schema._def?.innerType ?? schema
      } else {
        required.push(key)
      }
      const innerType = inner._def?.typeName
      properties[key] = {
        type: innerType === 'ZodNumber' ? SchemaType.NUMBER
          : innerType === 'ZodBoolean' ? SchemaType.BOOLEAN
          : SchemaType.STRING,
        description: schema._def?.description ?? key,
      }
    }
    return {
      name: tool.name,
      description: tool.description,
      parameters: { type: SchemaType.OBJECT, properties, required },
    }
  })
}

async function main() {
  console.log(chalk.bold.cyan('\n  Claude Code Clone - Test Run\n'))
  console.log(chalk.dim(`  Model: ${MODEL}`))
  console.log(chalk.dim(`  CWD:   ${CWD}\n`))

  const systemPrompt = await buildSystemPrompt(CWD)
  const genAI = new GoogleGenerativeAI(API_KEY)
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: getDeclarations() }],
  })

  const chat = model.startChat()
  const prompt = 'List the files in the current directory using the Bash tool with ls -la'

  console.log(chalk.bold.green(`  > ${prompt}\n`))

  let input: any = prompt
  let turns = 0
  const MAX_TURNS = 5

  while (turns < MAX_TURNS) {
    turns++
    const result = await chat.sendMessage(input)
    const parts = result.response.candidates?.[0]?.content?.parts ?? []

    let hasToolCall = false
    const fnResponses: any[] = []

    for (const part of parts) {
      if (part.text) {
        console.log(chalk.white(part.text))
      }
      if (part.functionCall) {
        hasToolCall = true
        const name = part.functionCall.name
        const args = (part.functionCall.args ?? {}) as Record<string, unknown>

        console.log(chalk.yellow(`\n  ⚡ ${name}`), chalk.dim(JSON.stringify(args)))

        const tool = getToolByName(name)
        if (tool) {
          const toolResult = await tool.call(args as any, { cwd: CWD, abortSignal: AbortSignal.timeout(30_000) })
          const icon = toolResult.isError ? chalk.red('✗') : chalk.green('✓')
          console.log(`  ${icon} ${name}`)
          const lines = toolResult.output.split('\n').slice(0, 20)
          console.log(chalk.dim(lines.join('\n')))

          fnResponses.push({
            functionResponse: { name, response: { result: toolResult.output } },
          })
        }
      }
    }

    const usage = result.response.usageMetadata
    console.log(chalk.dim(`\n  [tokens: ${usage?.promptTokenCount ?? '?'} in / ${usage?.candidatesTokenCount ?? '?'} out]`))

    if (!hasToolCall) break
    input = fnResponses
  }

  console.log(chalk.bold.cyan('\n  Done!\n'))
}

main().catch((err) => {
  console.error(chalk.red(`Error: ${err.message}`))
  process.exit(1)
})
