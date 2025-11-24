/**
 * Client-side only Walrus wrapper to avoid WASM SSR issues
 * This file dynamically imports the actual Walrus implementation
 */

let walrusQuiltModule: any = null;

export async function loadWalrusQuilt() {
  if (!walrusQuiltModule) {
    walrusQuiltModule = await import('./walrusQuilt');
  }
  return walrusQuiltModule;
}

// Re-export types
export type { UploadFlowState } from './walrusQuilt';

