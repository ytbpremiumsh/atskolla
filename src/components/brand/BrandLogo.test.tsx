import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrandLogo, logoNeedsDarkSurface } from "./BrandLogo";
afterEach(cleanup);
it("uses a dark backing for a white transparent mark but retains a white backing for colored or opaque logos", () => {
  expect(logoNeedsDarkSurface([255,255,255,255, 0,0,0,0])).toBe(true);
  expect(logoNeedsDarkSurface([20,30,40,255, 0,0,0,0])).toBe(false);
  expect(logoNeedsDarkSurface([255,255,255,255, 255,255,255,255])).toBe(false);
  expect(logoNeedsDarkSurface([0,0,0,0])).toBe(false);
});
it("preserves accessible image text and retries hosts without CORS before reporting an error", () => {
  const onError = vi.fn();
  render(<BrandLogo src="https://example.test/logo.png" alt="Logo sekolah" className="h-10 w-10" onError={onError} />);
  const logo = screen.getByRole("img", { name: "Logo sekolah" });
  expect(logo.parentElement).toHaveStyle({ backgroundColor: "#ffffff" });
  fireEvent.error(logo);
  expect(logo).not.toHaveAttribute("crossorigin");
  expect(onError).not.toHaveBeenCalled();
  fireEvent.error(logo);
  expect(onError).toHaveBeenCalledOnce();
});
