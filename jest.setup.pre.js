// Configure React concurrent mode for testing
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Polyfill for TextDecoderStream and other web APIs that expo winter needs
if (typeof globalThis.TextDecoderStream === 'undefined') {
  globalThis.TextDecoderStream = class TextDecoderStream {};
}
if (typeof globalThis.TextEncoderStream === 'undefined') {
  globalThis.TextEncoderStream = class TextEncoderStream {};
}
if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = class ReadableStream {};
}
if (typeof globalThis.WritableStream === 'undefined') {
  globalThis.WritableStream = class WritableStream {};
}
if (typeof globalThis.TransformStream === 'undefined') {
  globalThis.TransformStream = class TransformStream {};
}
