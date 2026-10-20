/* eslint-disable @typescript-eslint/no-var-requires */
import '@testing-library/jest-dom/extend-expect';

const { TextDecoder, TextEncoder } = require('util');
const { ReadableStream } = require('stream/web');
// Jest's jsdom context does not expose Node's built-in fetch constructors.
// Use Node 22's own globals from the host VM instead of an unstable Next.js
// internal module path (removed in Next 15).
const { runInThisContext } = require('node:vm');
const { Headers, Request, Response } = runInThisContext(
  '({ Headers, Request, Response })'
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
