import { expect, it } from "vitest";
import { schoolRootRedirect } from "./schoolRootRedirect";
it("redirects only the bare school root to the official main site", () => {
  expect(schoolRootRedirect("smanegeri1.atskolla.com", "/")).toBe("https://www.atskolla.com");
  for (const path of ["/admin", "/login", "/parent", "/jadwal", "/t/sekolah"]) {
    expect(schoolRootRedirect("smanegeri1.atskolla.com", path)).toBeNull();
  }
  for (const host of ["www.atskolla.com", "atskolla.com", "localhost", "preview.lovable.app", "atskolla.com.evil.test"]) {
    expect(schoolRootRedirect(host, "/")).toBeNull();
  }
});
