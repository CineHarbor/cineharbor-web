/* eslint-disable @typescript-eslint/no-var-requires */
import '@testing-library/jest-dom/extend-expect';

const { TextDecoder, TextEncoder } = require('util');
const { ReadableStream } = require('stream/web');
// Jest's jsdom sandbox does not expose Node's stable Fetch globals. The
// test runner is pinned to Node 22; obtain its native constructors from the
// trusted Node process realm instead of an undocumented Next.js internal path.
// The VM expression is a fixed literal, never derived from test or app input.
const { runInThisContext } = require('node:vm');
const { Headers, Request, Response } = runInThisContext(
  '({ Headers: globalThis.Headers, Request: globalThis.Request, Response: globalThis.Response })'
);

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

if (typeof global.Headers === 'undefined') {
  global.Headers = Headers;
}

if (typeof global.Request === 'undefined') {
  global.Request = Request;
}

if (typeof global.Response === 'undefined') {
  global.Response = Response;
}

if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream;
}

if (typeof global.Response.json !== 'function') {
  global.Response.json = (body, init = {}) => {
    const headers = new global.Headers(init.headers || {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return new global.Response(JSON.stringify(body), {
      ...init,
      headers,
    });
  };
}

// Allow router mocks.
// eslint-disable-next-line no-undef
jest.mock('next/router', () => require('next-router-mock'));
