// Line-level diff using Myers' O(ND) shortest-edit-script algorithm.
// Reference: E. Myers, "An O(ND) Difference Algorithm and Its Variations" (1986).

export type DiffOpType = 'equal' | 'insert' | 'delete';

export interface DiffOp {
  type: DiffOpType;
  line: string;
  /** 1-based line number in the old text, null when the line only exists in the new text. */
  oldLine: number | null;
  /** 1-based line number in the new text, null when the line only exists in the old text. */
  newLine: number | null;
}

export interface DiffResult {
  ops: DiffOp[];
  changed: boolean;
}

/**
 * Diff two texts line by line and return the sequence of edits that turns
 * `oldText` into `newText`.
 */
export function diffLines(oldText: string, newText: string): DiffResult {
  const a = splitLines(oldText);
  const b = splitLines(newText);
  const steps = backtrack(a, b, shortestEditTrace(a, b));

  const ops: DiffOp[] = [];
  let oldLine = 1;
  let newLine = 1;
  let changed = false;

  for (const [prevX, prevY, x, y] of steps) {
    if (x - prevX === 1 && y - prevY === 1) {
      ops.push({ type: 'equal', line: a[prevX] as string, oldLine, newLine });
      oldLine++;
      newLine++;
    } else if (x - prevX === 1) {
      ops.push({ type: 'delete', line: a[prevX] as string, oldLine, newLine: null });
      oldLine++;
      changed = true;
    } else {
      ops.push({ type: 'insert', line: b[prevY] as string, oldLine: null, newLine });
      newLine++;
      changed = true;
    }
  }

  return { ops, changed };
}

/** Split text into lines, treating a single trailing newline as an end-of-file marker rather than an extra blank line. */
function splitLines(text: string): string[] {
  if (text.length === 0) return [];
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

/** A backtrack step: [prevX, prevY, x, y] over the edit graph. */
type Step = [number, number, number, number];

/** Run Myers' forward pass, recording the V array at every edit distance. */
function shortestEditTrace(a: string[], b: string[]): number[][] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max;
  const v = new Array<number>(2 * max + 1).fill(0);
  const trace: number[][] = [];

  if (max === 0) {
    trace.push(v.slice());
    return trace;
  }

  for (let d = 0; d <= max; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && (v[offset + k - 1] as number) < (v[offset + k + 1] as number))) {
        x = v[offset + k + 1] as number;
      } else {
        x = (v[offset + k - 1] as number) + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        return trace;
      }
    }
  }

  return trace;
}

/** Walk the recorded trace backwards to recover the edit path in forward order. */
function backtrack(a: string[], b: string[], trace: number[][]): Step[] {
  const n = a.length;
  const m = b.length;
  const max = n + m || 1;
  const offset = max;
  let x = n;
  let y = m;
  const path: Step[] = [];

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d] as number[];
    const k = x - y;
    let prevK: number;
    if (k === -d || (k !== d && (v[offset + k - 1] as number) < (v[offset + k + 1] as number))) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = v[offset + prevK] as number;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      path.push([x - 1, y - 1, x, y]);
      x--;
      y--;
    }
    if (d > 0) {
      path.push([prevX, prevY, x, y]);
    }
    x = prevX;
    y = prevY;
  }

  return path.reverse();
}
