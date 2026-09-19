import { serializeInlineJson } from './inline-json';

describe('inline runtime configuration serialization', () => {
  it('preserves ordinary configuration types', () => {
    const value = {
      title: 'CineHarbor',
      enabled: true,
      count: 3,
      optional: null,
    };
    expect(JSON.parse(serializeInlineJson(value))).toEqual(value);
  });

  it('prevents closing-script and HTML injection while preserving the stored value', () => {
    const value = {
      title: '</script><script>alert(1)</script>',
      category: '<!-- & -->',
    };
    const serialized = serializeInlineJson(value);
    expect(serialized).not.toMatch(/[<>&]/);
    expect(JSON.parse(serialized)).toEqual(value);
  });

  it('escapes Unicode line separators in JavaScript embedding contexts', () => {
    const value = { title: 'line\u2028paragraph\u2029end' };
    const serialized = serializeInlineJson(value);
    expect(serialized).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(serialized)).toEqual(value);
  });

  it('rejects non-serializable roots instead of emitting invalid bootstrap code', () => {
    expect(() => serializeInlineJson(undefined)).toThrow(TypeError);
    const cycle: { self?: unknown } = {};
    cycle.self = cycle;
    expect(() => serializeInlineJson(cycle)).toThrow(TypeError);
  });
});
