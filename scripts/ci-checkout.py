#!/usr/bin/env python3
"""Resolve the declared immutable native/WASM/addon integration pair."""
import json
import os
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[1]
pins = json.loads((root / 'ci/dependencies.json').read_text())
if set(pins) != {'cineharbor-core', 'cineharbor-addon-sdk'}:
    raise SystemExit('Unexpected integration dependency set')
for name, revision in pins.items():
    if not isinstance(revision, str) or not re.fullmatch(r'[0-9a-f]{40}', revision):
        raise SystemExit('Dependency must be pinned to an immutable revision')
    destination = root.parent / name
    if destination.exists():
        raise SystemExit(f'Refusing to overwrite existing sibling: {destination}')
    subprocess.run(['git', 'init', str(destination)], check=True)
    subprocess.run(['git', '-C', str(destination), 'remote', 'add', 'origin', f'https://github.com/CineHarbor/{name}.git'], check=True)
    subprocess.run(['git', '-C', str(destination), 'fetch', '--depth', '1', 'origin', revision], check=True)
    subprocess.run(['git', '-C', str(destination), 'checkout', '--detach', 'FETCH_HEAD'], check=True)
    actual = subprocess.check_output(['git', '-C', str(destination), 'rev-parse', 'HEAD'], text=True).strip()
    if actual != revision:
        raise SystemExit('Dependency revision mismatch')
    print(f'CineHarbor/{name}@{actual}')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as stream:
            stream.write(f'\nIntegration dependency: `CineHarbor/{name}@{actual}`\n')
