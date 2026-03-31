/**
 * Context builder - assembles system prompt with git status and cwd info.
 * Inspired by src/context.ts
 */

import { execa } from 'execa'

export async function getGitStatus(cwd: string): Promise<string | null> {
  try {
    const [status, branch, log] = await Promise.all([
      execa('git', ['status', '--short'], { cwd, reject: false }),
      execa('git', ['branch', '--show-current'], { cwd, reject: false }),
      execa('git', ['log', '--oneline', '-5'], { cwd, reject: false }),
    ])

    if (branch.exitCode !== 0) return null

    let result = `Branch: ${branch.stdout.trim()}`
    if (status.stdout.trim()) {
      result += `\nStatus:\n${status.stdout.trim().slice(0, 1000)}`
    }
    if (log.stdout.trim()) {
      result += `\nRecent commits:\n${log.stdout.trim()}`
    }
    return result
  } catch {
    return null
  }
}

export async function buildSystemPrompt(cwd: string): Promise<string> {
  const gitStatus = await getGitStatus(cwd)

  const parts = [
    `You are Claude Code, an interactive CLI assistant for software development.`,
    `You help users with coding tasks using the tools available to you.`,
    '',
    '# Environment',
    `- Working directory: ${cwd}`,
    `- Platform: ${process.platform}`,
    `- Node.js: ${process.version}`,
  ]

  if (gitStatus) {
    parts.push('', '# Git Status', gitStatus)
  }

  parts.push(
    '',
    '# Guidelines',
    '- Read files before editing them.',
    '- Use Bash for commands, Read for files, Edit for modifications.',
    '- Be concise and direct.',
    '- Do not add unnecessary features beyond what was asked.',
    '- Handle errors explicitly.',
  )

  return parts.join('\n')
}
