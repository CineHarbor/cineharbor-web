import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import PwaRegistration from './PwaRegistration';

function fixture(waiting: unknown = null) {
  const registration = {
    waiting,
    installing: null,
    update: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  const container = {
    controller: {},
    register: jest.fn().mockResolvedValue(registration),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: container,
  });
  return { container, registration };
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

it('registers production App Router PWA without HTTP cache reuse and unregisters listeners on unmount', async () => {
  const { container, registration } = fixture();
  const view = render(<PwaRegistration enabled />);
  await waitFor(() => expect(registration.update).toHaveBeenCalledTimes(1));
  expect(container.register).toHaveBeenCalledWith('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  });
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  view.unmount();
  expect(container.removeEventListener).toHaveBeenCalledWith(
    'controllerchange',
    expect.any(Function)
  );
  expect(registration.removeEventListener).toHaveBeenCalledWith(
    'updatefound',
    expect.any(Function)
  );
});

it('does not register or show errors for desktop/disabled builds', () => {
  const { container } = fixture();
  render(<PwaRegistration enabled={false} />);
  expect(container.register).not.toHaveBeenCalled();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('shows registration failures with an explicit retry that can recover', async () => {
  const { container } = fixture();
  container.register.mockRejectedValueOnce(new Error('offline'));
  render(<PwaRegistration enabled />);
  const retry = await screen.findByRole('button', { name: '重试离线功能' });
  fireEvent.click(retry);
  await waitFor(() => expect(container.register).toHaveBeenCalledTimes(2));
  await waitFor(() =>
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  );
});

it('does not interrupt playback automatically; activates a waiting update only after the explicit action', async () => {
  const waiting = { postMessage: jest.fn() };
  fixture(waiting);
  render(<PwaRegistration enabled />);
  const button = await screen.findByRole('button', { name: '更新并重新载入' });
  expect(waiting.postMessage).not.toHaveBeenCalled();
  fireEvent.click(button);
  expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
});

it('degrades safely when the browser does not expose service workers', () => {
  render(<PwaRegistration enabled />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
