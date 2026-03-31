#!/usr/bin/env node
/**
 * Claude Code Clone - Main entry point.
 * A minimal but functional clone inspired by the Claude Code CLI source.
 *
 * Architecture mirrors the original:
 *   main.ts (bootstrap) → context (system prompt) → queryWithTools (engine) → tools
 */

import { createInterface } from 'readline'
import chalk from 'chalk'
import { queryWithTools } from './services/api.js'
import { buildSystemPrompt } from './utils/context.js'
import { createCostTracker } from './utils/cost.js'
import { getToolDescriptions } from './tools/index.js'
import type { Message, Config } from './types.js'

// ── Config ──

const API_KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-20250514'
const CWD = process.cwd()

if (!API_KEY) {
  console.error(chalk.red('Error: ANTHROPIC_API_KEY environment variable is required.'))
  console.error(chalk.dim('  export ANTHROPIC_API_KEY="sk-ant-..."'))
  process.exit(1)
}

// ── State ──

const messages: Message[] = []
const costTracker = createCostTracker()

// ── UI ──

function printBanner() {
  console.log()
  console.log(chalk.bold.cyan('  ╔══════════════════════════════════════╗'))
  console.log(chalk.bold.cyan('  ║') + chalk.bold.white('     Claude Code Clone v0.1.0        ') + chalk.bold.cyan('║'))
  console.log(chalk.bold.cyan('  ║') + chalk.dim('   Inspired by Anthropic\'s CLI       ') + chalk.bold.cyan('║'))
  console.log(chalk.bold.cyan('  ╚══════════════════════════════════════╝'))
  console.log()
  console.log(chalk.dim(`  Model: ${MODEL}`))
  console.log(chalk.dim(`  CWD:   ${CWD}`))
  console.log()
  console.log(chalk.dim('  Tools: ') + chalk.white('Bash, Read, Edit, Write, Glob, Grep'))
  console.log(chalk.dim('  Commands: /cost, /tools, /clear, /exit'))
  console.log()
}

function printDivider() {
  console.log(chalk.dim('─'.repeat(60)))
}

// ── REPL ──

async function main() {
  printBanner()

  const systemPrompt = await buildSystemPrompt(CWD)

  const config: Config = {
    apiKey: API_KEY!,
    model: MODEL,
    maxTokens: 8192,
    systemPrompt,
    cwd: CWD,
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.bold.green('\n❯ '),
  })

  rl.prompt()

  rl.on('line', async (line) => {
    const input = line.trim()
    if (!input) {
      rl.prompt()
      return
    }

    // Slash commands (inspired by src/commands.ts)
    if (input.startsWith('/')) {
      handleSlashCommand(input)
      rl.prompt()
      return
    }

    // Add user message
    messages.push({ role: 'user', content: input, timestamp: Date.now() })

    console.log()

    try {
      const newMessages = await queryWithTools(config, messages, {
        onText(text) {
          process.stdout.write(chalk.white(text))
        },
        onToolUse(toolName, toolInput) {
          console.log()
          printDivider()
          console.log(chalk.bold.yellow(`  ⚡ ${toolName}`))
          const displayInput = JSON.stringify(toolInput, null, 2)
            .split('\n')
            .slice(0, 10)
            .join('\n')
          console.log(chalk.dim(displayInput))
          printDivider()
        },
        onToolResult(toolName, result, isError) {
          const color = isError ? chalk.red : chalk.green
          const icon = isError ? '✗' : '✓'
          console.log(color(`  ${icon} ${toolName}`))
          // Show truncated result
          const lines = result.split('\n')
          const preview = lines.slice(0, 15).join('\n')
          if (preview) console.log(chalk.dim(preview))
          if (lines.length > 15) console.log(chalk.dim(`  ... ${lines.length - 15} more lines`))
          printDivider()
          console.log()
        },
        onDone(usage) {
          costTracker.addUsage(config.model, usage.inputTokens, usage.outputTokens)
        },
        onError(error) {
          console.error(chalk.red(`\nError: ${error.message}`))
        },
      })

      messages.push(...newMessages)
      console.log()
    } catch (err) {
      console.error(chalk.red(`\nError: ${err instanceof Error ? err.message : String(err)}`))
    }

    rl.prompt()
  })

  rl.on('close', () => {
    console.log()
    console.log(chalk.dim('\n' + costTracker.formatCost()))
    console.log(chalk.dim('Goodbye!'))
    process.exit(0)
  })
}

function handleSlashCommand(input: string) {
  const [cmd, ...args] = input.split(' ')

  switch (cmd) {
    case '/cost':
      console.log()
      console.log(costTracker.formatCost())
      break

    case '/tools':
      console.log()
      console.log(chalk.bold('Available tools:'))
      console.log(getToolDescriptions())
      break

    case '/clear':
      messages.length = 0
      console.log(chalk.dim('Conversation cleared.'))
      break

    case '/model':
      if (args[0]) {
        console.log(chalk.dim(`Model changed to: ${args[0]}`))
        console.log(chalk.dim('(takes effect on next message)'))
      } else {
        console.log(chalk.dim(`Current model: ${MODEL}`))
      }
      break

    case '/exit':
    case '/quit':
      console.log(chalk.dim('\n' + costTracker.formatCost()))
      console.log(chalk.dim('Goodbye!'))
      process.exit(0)

    case '/help':
      console.log()
      console.log(chalk.bold('Commands:'))
      console.log('  /cost    - Show token usage and costs')
      console.log('  /tools   - List available tools')
      console.log('  /clear   - Clear conversation history')
      console.log('  /model   - Show or change model')
      console.log('  /help    - Show this help')
      console.log('  /exit    - Exit')
      break

    default:
      console.log(chalk.yellow(`Unknown command: ${cmd}. Type /help for help.`))
  }
}

main().catch((err) => {
  console.error(chalk.red(`Fatal error: ${err.message}`))
  process.exit(1)
})
