#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { diffLines, type DiffOp } from './diff.js';

interface ParsedArgs {
  oldFile: string;
  newFile: string;
  json: boolean;
}

function parseArgs(argv: string[]): ParsedArgs | null {
  const positional: string[] = [];
  let json = false;

  for (const arg of argv) {
    if (arg === '--json') {
      json = true;
    } else if (arg === '--help' || arg === '-h') {
      return null;
    } else if (arg.startsWith('-')) {
      throw new Error(`unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 2) {
    return null;
  }

  return { oldFile: positional[0] as string, newFile: positional[1] as string, json };
}

function printUsage(): void {
  process.stderr.write(
    [
      'usage: textdiff <old-file> <new-file> [--json]',
      '',
      '  --json    emit machine-readable JSON instead of human-readable text',
      '',
      'exit status: 0 if files are identical, 1 if they differ, 2 on error',
    ].join('\n') + '\n',
  );
}

function formatHuman(oldFile: string, newFile: string, ops: DiffOp[]): string {
  const lines: string[] = [`--- ${oldFile}`, `+++ ${newFile}`];
  for (const op of ops) {
    const prefix = op.type === 'insert' ? '+' : op.type === 'delete' ? '-' : ' ';
    lines.push(`${prefix}${op.line}`);
  }
  return lines.join('\n') + '\n';
}

function formatJson(oldFile: string, newFile: string, ops: DiffOp[], changed: boolean): string {
  return JSON.stringify({ oldFile, newFile, changed, ops }, null, 2) + '\n';
}

function main(argv: string[]): number {
  let args: ParsedArgs | null;
  try {
    args = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`textdiff: ${(err as Error).message}\n`);
    return 2;
  }

  if (args === null) {
    printUsage();
    return 2;
  }

  let oldText: string;
  let newText: string;
  try {
    oldText = readFileSync(args.oldFile, 'utf8');
    newText = readFileSync(args.newFile, 'utf8');
  } catch (err) {
    process.stderr.write(`textdiff: ${(err as Error).message}\n`);
    return 2;
  }

  const { ops, changed } = diffLines(oldText, newText);

  process.stdout.write(
    args.json ? formatJson(args.oldFile, args.newFile, ops, changed) : formatHuman(args.oldFile, args.newFile, ops),
  );

  return changed ? 1 : 0;
}

process.exit(main(process.argv.slice(2)));
