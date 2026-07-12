import { generateSkinArray } from "../src/lib/skinEngine";
import { STENCIL_KEYS } from "../src/lib/stencils";
import { HAIR_STYLE_KEYS } from "../src/lib/hairStyles";
import { EYE_STYLE_KEYS } from "../src/lib/eyeStyles";

const SEED = 12345;

const apparel = {
  primary: "#3a5ba0",
  secondary: "#e8c14a",
  trim: "#20232a",
  shirt: "#f4f1ea",
  tie: "#8b1e1e",
  pants: "#2b2b33",
  shoes: "#5a3a22",
};

function fnv1a(bytes: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const checksumMode = process.argv.includes("--checksum");
let failures = 0;
const lines: string[] = [];

for (const stencilKey of STENCIL_KEYS) {
  for (const hairStyle of HAIR_STYLE_KEYS) {
    for (const isAlex of [false, true]) {
      try {
        const arr = generateSkinArray(
          "Caucasian",
          stencilKey,
          apparel,
          isAlex,
          ["glasses", "headphones", "beard", "freckles"],
          { hairStyle, eyeStyle: EYE_STYLE_KEYS[0] },
          SEED
        );
        if (arr.length !== 64 * 64 * 4) throw new Error(`bad length ${arr.length}`);
        const key = `${stencilKey}|${hairStyle}|${isAlex ? "alex" : "steve"}`;
        if (checksumMode) {
          lines.push(`${key} -> ${fnv1a(arr)}`);
        }
      } catch (e) {
        failures++;
        console.error(`FAIL ${stencilKey}|${hairStyle}|${isAlex ? "alex" : "steve"}:`, e);
      }
    }
  }
}

if (checksumMode) {
  console.log(lines.join("\n"));
} else {
  console.log(`Rendered ${STENCIL_KEYS.length * HAIR_STYLE_KEYS.length * 2} combinations.`);
}

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
