// Stub for @tauri-apps/api/core — used in unit tests (Tauri invoke is not available in Node)
export const invoke = async (_cmd: string, _args?: unknown): Promise<unknown> => {
  throw new Error(`invoke("${_cmd}") called in test — mock it with vi.mock()`);
};
