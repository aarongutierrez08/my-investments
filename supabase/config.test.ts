import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'supabase', 'config.toml');
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');

function getTomlSectionValue(toml: string, section: string, key: string): string | undefined {
  const lines = toml.split('\n');
  let currentSection = '';
  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (line === '') continue;
    const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }
    if (currentSection !== section) continue;
    const kvMatch = /^([A-Za-z0-9_]+)\s*=\s*(.+)$/.exec(line);
    if (kvMatch && kvMatch[1] === key) {
      return kvMatch[2].trim();
    }
  }
  return undefined;
}

describe('Supabase local dev scaffolding', () => {
  it('has a non-empty supabase/config.toml', () => {
    expect(fs.existsSync(CONFIG_PATH)).toBe(true);
    const contents = fs.readFileSync(CONFIG_PATH, 'utf-8');
    expect(contents.length).toBeGreaterThan(0);
  });

  it('declares auth.enable_signup = true and auth.email.enable_confirmations = false', () => {
    const contents = fs.readFileSync(CONFIG_PATH, 'utf-8');
    expect(getTomlSectionValue(contents, 'auth', 'enable_signup')).toBe('true');
    expect(getTomlSectionValue(contents, 'auth.email', 'enable_confirmations')).toBe('false');
  });

  it('exposes db:start and db:stop scripts and supabase as a devDependency', () => {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    expect(pkg.scripts['db:start']).toBe('supabase start');
    expect(pkg.scripts['db:stop']).toBe('supabase stop');
    expect(pkg.devDependencies?.supabase).toBeTruthy();
  });
});
