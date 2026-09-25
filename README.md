# text-diff-kit

A small TypeScript library for computing line-level diffs between two texts,
with a thin CLI on top. No third-party dependencies — the diff engine is a
from-scratch implementation of Myers' O(ND) shortest-edit-script algorithm.

Most diff tools are built for terminals: colored `+`/`-` lines meant for a
human to read. That's fine until you want to feed the result into another
program (a review bot, a test harness, a UI diff viewer). This gives you both:
readable text output by default, and a `--json` mode that hands back
structured data with line numbers attached.

## Library usage

```ts
import { diffLines } from './src/diff.js';

const oldText = 'one\ntwo\nthree\n';
const newText = 'one\ntwo and a half\nthree\n';

const { ops, changed } = diffLines(oldText, newText);

// ops:
// [
//   { type: 'equal',  line: 'one',           oldLine: 1, newLine: 1 },
//   { type: 'delete', line: 'two',           oldLine: 2, newLine: null },
//   { type: 'insert', line: 'two and a half', oldLine: null, newLine: 2 },
//   { type: 'equal',  line: 'three',         oldLine: 3, newLine: 3 },
// ]
```

`changed` is `true` whenever the two texts differ, which is cheaper than
scanning `ops` yourself when all you need is a boolean.

## CLI usage

Build first (`tsc` reads `tsconfig.json` and emits to `dist/`):

```
npx tsc
```

Then run it against two files:

```
node dist/cli.js old.txt new.txt
```

```
--- old.txt
+++ new.txt
 one
-two
+two and a half
 three
```

With `--json`:

```
node dist/cli.js old.txt new.txt --json
```

```json
{
  "oldFile": "old.txt",
  "newFile": "new.txt",
  "changed": true,
  "ops": [
    { "type": "equal", "line": "one", "oldLine": 1, "newLine": 1 },
    { "type": "delete", "line": "two", "oldLine": 2, "newLine": null },
    { "type": "insert", "line": "two and a half", "oldLine": null, "newLine": 2 },
    { "type": "equal", "line": "three", "oldLine": 3, "newLine": 3 }
  ]
}
```

Exit status follows the same convention as POSIX `diff`: `0` if the files are
identical, `1` if they differ, `2` on a usage or I/O error. That makes it
usable directly in shell conditionals or CI steps without parsing output.

## Status

Early skeleton. The diff algorithm and CLI both work end to end, and
`diffLines` has a test suite covering empty inputs, identical files, and
trailing-newline handling (`npm run build && npm test`). The output is still
unhunked, though — every line is shown, not just the ones near a change.

## License

MIT, see [LICENSE](LICENSE).
