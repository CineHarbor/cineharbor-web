import { buildAddonUrl, buildCatalogPath } from './addon-client';

describe('addon transport', () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl;
    }
  });

  it('builds stremio-compatible catalog paths', () => {
    expect(buildCatalogPath('movie', 'top')).toBe('/catalog/movie/top.json');
    expect(buildCatalogPath('tv', 'channels', undefined, 30)).toBe(
      '/catalog/tv/channels/skip=30.json'
    );
    expect(buildCatalogPath('movie', 'top', 'search=matrix')).toBe(
      '/catalog/movie/top/search=matrix.json'
    );
  });

  it('builds addon urls against the api base url', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:8787/';
    expect(buildAddonUrl('/manifest.json')).toBe(
      'http://127.0.0.1:8787/addons/manifest.json'
    );
    expect(buildAddonUrl(buildCatalogPath('tv', 'channels'))).toBe(
      'http://127.0.0.1:8787/addons/catalog/tv/channels.json'
    );
  });
});