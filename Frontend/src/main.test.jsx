import { beforeEach, describe, expect, it, vi } from 'vitest';

const createRoot = vi.hoisted(() => vi.fn(() => ({ render: vi.fn() })));
vi.mock('react-dom/client', () => ({ createRoot }));
vi.mock('./App.jsx', () => ({ default: () => <div>App</div> }));

describe('application entry point', () => {
  beforeEach(() => {
    vi.resetModules();
    createRoot.mockClear();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('mounts the app in StrictMode at the root element', async () => {
    await import('./main.jsx');
    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    const root = createRoot.mock.results[0].value;
    expect(root.render).toHaveBeenCalledTimes(1);
  });
});
