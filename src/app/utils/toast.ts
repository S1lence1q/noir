import { noirToast } from '../components/shell/noir/NoirToast';

type LegacyToastOptions = { description?: string; duration?: number };

const show = (text: string, options?: LegacyToastOptions) =>
  noirToast({ text, description: options?.description, duration: options?.duration });

/**
 * sonner-shaped facade over noirToast, so every message in the app uses the one NOIR toast.
 * New code calls noirToast directly with copy from strings.ts.
 */
export const toast = Object.assign(show, {
  success: show,
  info: show,
  message: show,
  error: (text: string, options?: LegacyToastOptions) => show(text, { duration: 3000, ...options }),
});
