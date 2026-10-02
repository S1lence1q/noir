// Helper to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Helper to convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s, l };
}

// Generate beautiful, dynamic, vibrant HSL theme palettes by hashing the song title/artist
export function getDynamicFallbackColors(title: string, artist: string) {
  const str = `${title} ${artist}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  const primaryRgb = hslToRgb(hue, 0.6, 0.28);
  const secondaryRgb = hslToRgb((hue + 120) % 360, 0.45, 0.15);
  const accentRgb = hslToRgb((hue + 240) % 360, 0.65, 0.35);

  return {
    primary: `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 0.6)`,
    secondary: `rgba(${secondaryRgb[0]}, ${secondaryRgb[1]}, ${secondaryRgb[2]}, 0.5)`,
    accent: `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0.4)`
  };
}

export interface ExtractedColorTheme {
  primary: string;
  secondary: string;
  accent: string;
}

export function extractColorsFromImage(
  img: HTMLImageElement,
  title: string,
  artist: string
): ExtractedColorTheme {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return getDynamicFallbackColors(title, artist);

    canvas.width = 32;
    canvas.height = 32;
    ctx.drawImage(img, 0, 0, 32, 32);

    const imgData = ctx.getImageData(0, 0, 32, 32).data;
    const pixels: { h: number; s: number; l: number; r: number; g: number; b: number }[] = [];
    let totalSat = 0;
    let totalCount = 0;

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const a = imgData[i + 3];

      if (a < 50) continue;

      const hsl = rgbToHsl(r, g, b);
      pixels.push({ ...hsl, r, g, b });

      totalSat += hsl.s;
      totalCount++;
    }

    const avgSat = totalCount > 0 ? totalSat / totalCount : 0;
    
    // Truly monochrome (pure B&W / grayscale covers like Kundos smoking photo!)
    let useMonochromeFallback = avgSat < 0.05;

    let finalHslColors: { h: number; s: number; l: number }[] = [];

    if (useMonochromeFallback) {
      // 100% Pure, gorgeous Skandinavisk Charcoal & Silver-Mist palette!
      // This matches B&W artwork perfectly with exactly 0% saturation!
      finalHslColors = [
        { h: 0, s: 0, l: 0.22 }, // Soft graphite gray
        { h: 0, s: 0, l: 0.14 }, // Deep obsidian slate
        { h: 0, s: 0, l: 0.28 }  // Glowy silver-mist
      ];
    } else {
      // Extract authentic colored shades from the cover!
      let candidates = pixels.filter(p => p.l >= 0.05 && p.l <= 0.95);

      // Sort by saturation and balanced lightness
      candidates.sort((a, b) => {
        const scoreA = a.s * 1.5 + (0.5 - Math.abs(0.5 - a.l));
        const scoreB = b.s * 1.5 + (0.5 - Math.abs(0.5 - b.l));
        return scoreB - scoreA;
      });

      const selected: { h: number; s: number; l: number }[] = [];

      if (candidates.length > 0) {
        // 1st color: dominant shade
        selected.push({ h: candidates[0].h, s: candidates[0].s, l: candidates[0].l });

        // 2nd color: distinct in hue, lightness, or saturation
        const color2 = candidates.find(p => 
          Math.min(Math.abs(p.h - selected[0].h), 360 - Math.abs(p.h - selected[0].h)) >= 20 ||
          Math.abs(p.l - selected[0].l) >= 0.15 ||
          Math.abs(p.s - selected[0].s) >= 0.15
        );

        if (color2) {
          selected.push({ h: color2.h, s: color2.s, l: color2.l });

          // 3rd color: distinct from both
          const color3 = candidates.find(p => 
            (Math.min(Math.abs(p.h - selected[0].h), 360 - Math.abs(p.h - selected[0].h)) >= 20 ||
             Math.abs(p.l - selected[0].l) >= 0.15 ||
             Math.abs(p.s - selected[0].s) >= 0.15) &&
            (Math.min(Math.abs(p.h - selected[1].h), 360 - Math.abs(p.h - selected[1].h)) >= 20 ||
             Math.abs(p.l - selected[1].l) >= 0.15 ||
             Math.abs(p.s - selected[1].s) >= 0.15)
          );

          if (color3) {
            selected.push({ h: color3.h, s: color3.s, l: color3.l });
          }
        }
      }

      // Analogous harmonized shade generation if tight palette
      if (selected.length === 1) {
        const c = selected[0];
        selected.push({ h: c.h, s: Math.max(0.1, c.s - 0.1), l: Math.max(0.08, c.l - 0.08) });
        selected.push({ h: c.h, s: Math.min(1.0, c.s + 0.15), l: Math.min(0.50, c.l + 0.12) });
      } else if (selected.length === 2) {
        const c1 = selected[0];
        const c2 = selected[1];
        selected.push({ h: Math.round((c1.h + c2.h) / 2), s: (c1.s + c2.s) / 2, l: Math.max(0.1, (c1.l + c2.l) / 2 - 0.05) });
      } else if (selected.length === 0) {
        selected.push({ h: 220, s: 0.15, l: 0.15 });
        selected.push({ h: 225, s: 0.10, l: 0.12 });
        selected.push({ h: 215, s: 0.12, l: 0.14 });
      }

      finalHslColors = selected;
    }

    // Enforce sophisticated, multi-tiered cinematic color mapping
    // This allows the accent/glow to shine vibrantly while keeping the primary/secondary deep and dark for text readability.
    const adjustedColors = finalHslColors.map((color, index) => {
      if (color.s === 0) {
        // Grayscale baseline for monochrome artwork
        const lFallback = index === 0 ? 0.16 : index === 1 ? 0.10 : 0.42; // Brighter accent for B&W
        const rgb = hslToRgb(color.h, 0, lFallback);
        return { r: rgb[0], g: rgb[1], b: rgb[2] };
      }

      let s = color.s;
      let l = color.l;

      // Scale minimum saturation clamps if the original color is very muted/grayscale.
      // This prevents color compression noise on grayscale/sepia covers from being boosted into vibrant neon glow.
      const saturationFactor = Math.min(1.0, color.s / 0.18);

      if (index === 0) {
        // Primary: Deep, rich background base
        s = Math.min(0.60, Math.max(0.26 * saturationFactor, color.s * 1.05));
        l = Math.min(0.21, Math.max(0.12, color.l * 0.95));
      } else if (index === 1) {
        // Secondary: Medium-depth complementary shade
        s = Math.min(0.55, Math.max(0.22 * saturationFactor, color.s * 1.00));
        l = Math.min(0.18, Math.max(0.10, color.l * 0.85));
      } else {
        // Accent: Vibrant ambient cinematic glow (This is what lights up the WebGL fluid!)
        s = Math.min(0.92, Math.max(0.50 * saturationFactor, color.s * 1.55));
        l = Math.min(0.46, Math.max(0.26, color.l * 1.40));
      }

      const rgb = hslToRgb(color.h, s, l);
      return { r: rgb[0], g: rgb[1], b: rgb[2] };
    });

    const color1 = adjustedColors[0];
    const color2 = adjustedColors[1];
    const color3 = adjustedColors[2];

    return {
      primary: `rgba(${color1.r},${color1.g},${color1.b},0.82)`,
      secondary: `rgba(${color2.r},${color2.g},${color2.b},0.68)`,
      accent: `rgba(${color3.r},${color3.g},${color3.b},0.62)`
    };
  } catch (e) {
    console.warn('Failed to extract colors from image:', e);
    return getDynamicFallbackColors(title, artist);
  }
}
