import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('canonical release version and repository are not inherited from upstream', () => {
  const pkg = JSON.parse(read('package.json'));
  const desktop = JSON.parse(read('src/config/desktop-release.json'));
  assert.equal(pkg.version, '1.0.0');
  assert.equal(desktop.desktopVersion, pkg.version);
  assert.equal(desktop.releaseRepository, 'CineHarbor/cineharbor-desktop');
  assert.equal(desktop.releaseBranch, 'main');
  assert.match(read('src/lib/version.ts'), /packageMetadata\.version/);
  assert.notEqual(desktop.legacyChangelogRepository, desktop.releaseRepository);
});
