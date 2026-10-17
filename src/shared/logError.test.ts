import { afterEach, describe, expect, it, vi } from "vitest"

import { logError, setErrorReporter } from "@/shared/logError"

describe("logError", () => {
  afterEach(() => {
    setErrorReporter(null)
    vi.restoreAllMocks()
  })

  it("writes the context and the error to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = new Error("boom")
    logError("saving", error)
    expect(spy).toHaveBeenCalledWith("[costsim] saving", error)
  })

  it("passes the error to a registered reporter", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const reporter = vi.fn()
    setErrorReporter(reporter)
    const error = new Error("boom")
    logError("saving", error)
    expect(reporter).toHaveBeenCalledWith("saving", error)
  })

  it("never throws, even when the reporter does", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    setErrorReporter(() => {
      throw new Error("reporter failed")
    })
    expect(() => logError("saving", new Error("boom"))).not.toThrow()
  })
})
