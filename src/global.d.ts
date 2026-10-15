export {}

declare global {
  interface Window {
    spinalix?: {
      onQuickCapture: (cb: () => void) => void
      platform?: string
    }
  }
}
