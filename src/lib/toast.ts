import { toast as originalToast } from "sonner";
import { indonesianMessage } from "./indonesianMessages";

function localized(value: unknown): unknown {
  if (typeof value === "function") {
    return (...args: unknown[]) => localized(value(...args));
  }
  return indonesianMessage(value);
}
function options(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const result = { ...value } as Record<string, unknown>;
  for (const key of ["title", "description", "loading", "success", "error", "message"]) {
    if (key in result) result[key] = localized(result[key]);
  }
  for (const key of ["action", "cancel"]) {
    const action = result[key];
    if (action && typeof action === "object" && "label" in action) {
      result[key] = { ...action, label: localized(action.label) };
    }
  }
  return result;
}
/** Preserve Sonner IDs, callbacks, React content, promise results and dismiss behavior. */
export const toast: typeof originalToast = new Proxy(originalToast, {
  apply(target, thisArg, args) {
    return Reflect.apply(target, thisArg, [localized(args[0]), options(args[1])]);
  },
  get(target, key) {
    const method = Reflect.get(target, key);
    if (typeof method !== "function" || ["dismiss", "getHistory", "getToasts"].includes(String(key))) return method;
    if (key === "promise") return (...args: unknown[]) => method(args[0], options(args[1]));
    if (key === "custom") return method;
    return (...args: unknown[]) => method(localized(args[0]), options(args[1]));
  },
});
