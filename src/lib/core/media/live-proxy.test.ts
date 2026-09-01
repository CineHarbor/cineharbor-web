import { createLiveProxyHeaders } from './live-proxy';

describe('live proxy core', () => {
  it('preserves upstream range headers and explicit content length', () => {
    const upstreamHeaders = new Map<string, string>([
      ['content-type', 'application/vnd.apple.mpegurl'],
      ['content-length', '10'],
      ['accept-ranges', 'bytes'],
      ['content-range', 'bytes 0-9/10'],
    ]);
    const upstreamResponse = {
      headers: {
        get(name: string) {
          return upstreamHeaders.get(name.toLowerCase()) || null;
        },
      },
    } as Response;

    const headers = createLiveProxyHeaders(
      upstreamResponse,
      'application/vnd.apple.mpegurl',
      {
        contentLength: '42',
      }
    );

    expect(headers.get('Content-Length')).toBe('42');
    expect(headers.get('Accept-Ranges')).toBe('bytes');
    expect(headers.get('Content-Range')).toBe('bytes 0-9/10');
  });
});