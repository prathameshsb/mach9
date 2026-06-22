import '@testing-library/jest-dom'

// Recharts uses ResizeObserver which jsdom does not implement
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
