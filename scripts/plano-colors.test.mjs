import { remainingLiterals, rewriteFile } from "./plano-colors.mjs";

describe("plano-colors", () => {
  it("maps CSS literals to Plano tokens by the property they colour", () => {
    const css = [
      ".card {",
      "  color: #11181b;",
      "  background: #ffffff;",
      "  border: 1px solid rgba(28, 25, 23, 0.1);",
      "  border-top: 1px solid rgba(28, 25, 23, 0.08);",
      "  box-shadow: 0 1px 2px rgba(28, 25, 23, 0.12);",
      "  outline: 2px solid #007780;",
      "}",
      ".card--selected { background: rgba(0, 119, 128, 0.08); border-color: rgba(0, 119, 128, 0.4); }",
      ".button { background: #007780; color: #ffffff; }",
      ".backdrop { background: rgba(18, 15, 13, 0.36); }",
      ".fade { background: linear-gradient(rgba(251, 248, 243, 0), rgba(251, 248, 243, 0.96)); }",
    ].join("\n");

    expect(rewriteFile(css, "src/card.css")).toEqual({
      missing: [],
      text: [
        ".card {",
        "  color: var(--ink);",
        "  background: var(--surface);",
        "  border: 1px solid var(--border);",
        "  border-top: 1px solid var(--rule);",
        "  box-shadow: 0 1px 2px color-mix(in srgb, var(--shadow-ink) 12%, transparent);",
        "  outline: 2px solid var(--accent);",
        "}",
        ".card--selected { background: var(--accent-tint); border-color: color-mix(in srgb, var(--accent) 40%, transparent); }",
        ".button { background: var(--accent); color: var(--on-accent); }",
        ".backdrop { background: var(--scrim); }",
        ".fade { background: linear-gradient(transparent, color-mix(in srgb, var(--bg) 96%, transparent)); }",
      ].join("\n"),
    });
  });

  it("maps Tailwind palette and arbitrary colour classes to themed token classes", () => {
    const tsx =
      'className="bg-[#007780] text-white hover:border-[#007780]/45 border-stone-900/10 text-stone-600 bg-red-50 shadow-[0_8px_14px_rgba(0,119,128,0.12)]"';

    expect(rewriteFile(tsx, "src/button.tsx")).toEqual({
      missing: [],
      text: 'className="bg-accent text-on-accent hover:border-accent/45 border-border text-muted bg-over-bg shadow-[0_8px_14px_color-mix(in_srgb,var(--accent)_12%,transparent)]"',
    });
  });

  it("keeps movement-pattern icons on their data colour where the same red is a hover elsewhere", () => {
    expect(rewriteFile('"text-[#b93725]"', "src/foundation-pattern-icon.tsx").text).toBe(
      '"text-data-red-ink"',
    );
    expect(rewriteFile('"hover:bg-[#b93725]"', "src/button.tsx").text).toBe(
      '"hover:bg-accent-dark"',
    );
  });

  it("reports literals missing from the table and leaves them in place", () => {
    expect(rewriteFile(".x { color: #123456; }", "src/x.css")).toEqual({
      missing: ["#123456"],
      text: ".x { color: #123456; }",
    });
  });

  it("finds every kind of colour literal the gate guards against", () => {
    expect(
      remainingLiterals(
        '"text-stone-950 bg-[#fff]/50 shadow-[0_1px_rgba(0,0,0,0.1)]"',
        "src/a.tsx",
      ),
    ).toEqual(["text-stone-950", "bg-[#fff]/50", "rgba(0,0,0,0.1)"]);
    expect(remainingLiterals(".a { color: var(--ink); background: #fff; }", "src/a.css")).toEqual([
      "#fff",
    ]);
  });
});
