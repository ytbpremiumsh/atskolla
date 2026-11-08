import { describe, it, expect, vi } from "vitest";
import { indonesianMessage } from "./indonesianMessages";
const mock = vi.hoisted(() => {
  const fn = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), promise: vi.fn(), dismiss: vi.fn() });
  return { fn };
});
vi.mock("sonner", () => ({ toast: mock.fn }));
import { toast } from "./toast";

describe("Indonesian notifications", () => {
  it.each([
    ["Password is known to be weak and easy to guess, please choose a different one.", "Kata sandi terlalu lemah"],
    ["Gagal: Password is known to be weak and easy to guess", "Kata sandi terlalu lemah"],
    ["Invalid login credentials", "Email atau kata sandi salah"],
    ["Auth session missing!", "Sesi Anda telah berakhir"],
    ["Failed to fetch", "Koneksi bermasalah"],
    ["new row violates row-level security policy", "Anda tidak memiliki izin"],
    ["duplicate key value violates unique constraint", "Data tersebut sudah terdaftar"],
    ["Unexpected provider failure", "Permintaan belum berhasil"],
  ])("translates provider error %s", (message, expected) => {
    expect(indonesianMessage(message)).toContain(expected);
  });
  it("preserves Indonesian details and non-text content", () => {
    const text = "Pembayaran Rizky berhasil: Rp 25.000, 08.30 WIB";
    expect(indonesianMessage(text)).toBe(text);
    const content = { type: "span", props: {} };
    expect(indonesianMessage(content)).toBe(content);
  });
  it("preserves toast callbacks, IDs and dismiss while translating descriptions", () => {
    const onClick = vi.fn();
    toast.error("Invalid login credentials", { id: "login", description: "Failed to fetch", action: { label: "Refresh", onClick } });
    expect(mock.fn.error).toHaveBeenLastCalledWith(expect.stringContaining("Email atau kata sandi"), expect.objectContaining({
      id: "login", description: expect.stringContaining("Koneksi bermasalah"), action: { label: "Muat ulang", onClick },
    }));
    toast.dismiss("login");
    expect(mock.fn.dismiss).toHaveBeenCalledWith("login");
  });
  it("keeps the original promise and translates asynchronous feedback", () => {
    const promise = Promise.resolve("ok");
    toast.promise(promise, { loading: "Loading...", error: () => "Failed to fetch", success: "Success" });
    const [passed, options] = mock.fn.promise.mock.lastCall!;
    expect(passed).toBe(promise);
    expect(options.loading).toBe("Memuat…");
    expect(options.error(new Error())).toContain("Koneksi bermasalah");
  });
});
