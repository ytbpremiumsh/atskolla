import { renderHook, act, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useGatewayStatusPolling } from "./useGatewayStatusPolling";
afterEach(() => { cleanup(); vi.useRealTimers(); });
it("automatically confirms connection and keeps retrying after a network failure", async () => {
  vi.useFakeTimers();
  const check = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(true);
  const onStatus = vi.fn();
  renderHook(() => useGatewayStatusPolling(true, "school:number", true, check, onStatus));
  await act(async () => { await vi.advanceTimersByTimeAsync(250); });
  expect(onStatus).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
  expect(onStatus).toHaveBeenCalledWith(true);
});
it("ignores a pending old-number result and stops after unmount", async () => {
  vi.useFakeTimers();
  let resolve!: (value: boolean) => void;
  const oldCheck = vi.fn(() => new Promise<boolean>((r) => { resolve = r; }));
  const status = vi.fn();
  const { rerender, unmount } = renderHook(({ number, check }) => useGatewayStatusPolling(true, number, true, check, status), {
    initialProps: { number: "old", check: oldCheck as () => Promise<boolean> },
  });
  await act(async () => { await vi.advanceTimersByTimeAsync(250); });
  rerender({ number: "new", check: vi.fn().mockResolvedValue(false) });
  await act(async () => { resolve(true); await Promise.resolve(); });
  expect(status).not.toHaveBeenCalled();
  unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
  expect(status).not.toHaveBeenCalled();
});
