/**
 * Core types for the Claude Code clone.
 * Inspired by src/Tool.ts, src/types/command.ts, src/types/permissions.ts
 */

import { z } from 'zod'

// ── Messages ──

export type Role = 'user' | 'assistant' | 'system'

export interface Message {
  role: Role
  content: string
  toolUse?: ToolUseResult[]
  timestamp: number
}

export interface ToolUseResult {
  toolName: string
  input: Record<string, unknown>
  output: string
  isError: boolean
  durationMs: number
}

// ── Tools ──

export interface Tool<TInput extends Record<string, unknown> = Record<string, unknown>> {
  name: string
  description: string
  inputSchema: z.ZodType<TInput>
  isReadOnly: boolean
  call(input: TInput, context: ToolContext): Promise<ToolResult>
}

export interface ToolResult {
  output: string
  isError: boolean
}

export interface ToolContext {
  cwd: string
  abortSignal: AbortSignal
}

// ── Session ──

export interface Session {
  id: string
  messages: Message[]
  startTime: number
  totalCostUsd: number
  totalInputTokens: number
  totalOutputTokens: number
  model: string
}

// ── Config ──

export interface Config {
  apiKey: string
  model: string
  maxTokens: number
  systemPrompt: string
  cwd: string
}
