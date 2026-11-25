import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Interaction-heavy tests exceed the 1s default when parallel workers share the CPU.
configure({ asyncUtilTimeout: 5_000 })

// jsdom has no layout engine, so Radix checkboxes (react-use-size) throw without a stub.
class ResizeObserverStub {
  observe() {}

  unobserve() {}

  disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub
}

// Radix menus track the active pointer; jsdom never fires real pointer capture events.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}

afterEach(() => {
  cleanup()
})
