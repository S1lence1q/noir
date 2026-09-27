import { noirToast } from '../components/shell/noir/NoirToast';

/** Legacy entry point; forwards to the NOIR toast. New code calls `noirToast` directly. */
export function showMiniHUD(message: string, _type: 'success' | 'info' | 'error' = 'success') {
  noirToast({ text: message });
}
