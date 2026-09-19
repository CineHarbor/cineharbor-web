import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runSuite } from '../../scripts/run-smoke-suite.mjs';

function fixture(t) {
  const outputDir = mkdtempSync(path.join(tmpdir(), 'ch-suite-'));
  t.after(() => rmSync(outputDir, { recursive: true, force: true }));
  return { outputDir, report() {} };
}

test('a failing first gate does not skip successful or failing later gates', (t) => {
  const options = fixture(t);
  const { passed, results } = runSuite({ ...options, cases: [
    { name: 'first-fails', args: ['-e', 'console.error("first"); process.exit(7)'] },
    { name: 'second-passes', args: ['-e', 'console.log("second executed")'] },
    { name: 'third-fails', args: ['-e', 'process.exit(3)'] },
  ] });
  assert.equal(passed, false);
  assert.deepEqual(results.map((r) => r.exitCode), [7, 0, 3]);
  assert.match(readFileSync(path.join(options.outputDir, 'second-passes.log'), 'utf8'), /second executed/);
  assert.equal(JSON.parse(readFileSync(path.join(options.outputDir, 'summary.json'))).results.length, 3);
});

test('timed-out gate is failure and remaining gates still execute', (t) => {
  const { passed, results } = runSuite({ ...fixture(t), timeoutMs: 300, cases: [
    { name: 'hang', args: ['-e', 'setInterval(() => {}, 1000)'] },
    { name: 'after', args: ['-e', 'process.exit(0)'] },
  ] });
  assert.equal(passed, false);
  assert.equal(results[0].error, 'ETIMEDOUT');
  assert.equal(results[1].passed, true);
});

test('only a fully successful nonempty suite passes', (t) => {
  const options = fixture(t);
  assert.equal(runSuite({ ...options, cases: [{ name: 'ok', args: ['-e', ''] }] }).passed, true);
  assert.throws(() => runSuite({ ...options, cases: [] }), /At least one/);
  assert.throws(() => runSuite({ ...options, cases: [{ name: '../escape', args: [] }] }), /safe identifiers/);
  assert.throws(() => runSuite({ ...options, cases: [{ name: 'dup', args: [] }, { name: 'dup', args: [] }] }), /unique/);
});
