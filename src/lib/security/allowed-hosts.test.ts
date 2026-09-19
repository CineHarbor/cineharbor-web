import { isAllowedHost, normalizeHost } from './allowed-hosts';

describe('configurable production host boundary', () => {
  it.each([
    ['LOCALHOST:3000', 'localhost'],
    ['127.0.0.1:3000', '127.0.0.1'],
    ['[::1]:3000', '[::1]'],
    ['App.Example.test', 'app.example.test'],
  ])('normalizes host %s', (input, expected) => {
    expect(normalizeHost(input)).toBe(expected);
  });
  it.each([
    null,
    '',
    'user@host.test',
    'host.test/path',
    'host.test?x',
    'a,b',
    ' a.test',
    'a.test\\b',
  ])('rejects malformed Host %s', (input) => {
    expect(normalizeHost(input)).toBe('');
  });
  it('permits loopback smoke without weakening configured production hosts', () => {
    expect(isAllowedHost('127.0.0.1')).toBe(true);
    expect(isAllowedHost('localhost')).toBe(true);
    expect(isAllowedHost('cineharbor.hkcu.qzz.io')).toBe(true);
    expect(
      isAllowedHost('app.example.test', 'app.example.test,*.media.example.test')
    ).toBe(true);
    expect(
      isAllowedHost(
        'one.media.example.test',
        'app.example.test,*.media.example.test'
      )
    ).toBe(true);
    expect(isAllowedHost('127.0.0.1', 'app.example.test')).toBe(false);
  });
  it.each([
    'evilapp.example.test',
    'app.example.test.evil.test',
    'other.test',
    '',
  ])('does not permit suffix confusion or missing hosts (%s)', (host) => {
    expect(isAllowedHost(host, 'app.example.test')).toBe(false);
  });
  it('rejects global wildcard, URL-shaped and empty configurations', () => {
    for (const configured of ['*', 'https://app.example.test', ''])
      expect(isAllowedHost('app.example.test', configured)).toBe(false);
  });
});
