import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/overview',
  useSearchParams: () => new URLSearchParams(),
  redirect: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
  const React = require('react');
  return React.forwardRef(function MockLink(
    { children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown },
    ref: React.Ref<HTMLAnchorElement>
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  });
});

// Mock recharts to avoid canvas issues in JSDOM
jest.mock('recharts', () => {
  const React = require('react');
  const createMockComponent = (name: string) =>
    React.forwardRef(function MockRechartsComponent(props: Record<string, unknown>, ref: React.Ref<unknown>) {
      return React.createElement('div', { 'data-testid': `mock-${name}`, ref, ...props });
    });

  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'mock-responsive-container' }, children),
    AreaChart: createMockComponent('area-chart'),
    Area: createMockComponent('area'),
    BarChart: createMockComponent('bar-chart'),
    Bar: createMockComponent('bar'),
    LineChart: createMockComponent('line-chart'),
    Line: createMockComponent('line'),
    XAxis: createMockComponent('xaxis'),
    YAxis: createMockComponent('yaxis'),
    CartesianGrid: createMockComponent('cartesian-grid'),
    Tooltip: createMockComponent('tooltip'),
    Legend: createMockComponent('legend'),
  };
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});
