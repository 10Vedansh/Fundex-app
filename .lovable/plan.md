

# Cinematic Earth Globe with Continent Borders and Currency Symbols

## Overview

This plan transforms the current abstract latitude/longitude grid globe into a cinematic, Earth-like globe with illuminated continent outlines, orbital rings, and floating currency symbols that morph and drift in the background. The load animation features continent borders "igniting" from top to bottom, creating a "world powering on" effect.

## What Changes

### 1. Earth Globe with Continent Outlines
- Replace the current lat/long grid lines with actual simplified continent border paths (vertices for Africa, Europe, Asia, Americas, Australia)
- The globe surface remains dark and minimal (deep charcoal/navy)
- Continent borders rendered as thin, crisp white/ice-blue line segments
- No textures, no satellite imagery -- clean wireframe-style borders only

### 2. Load Animation: Border Ignition
- On page load, continent borders start invisible
- An animated "ignition wave" sweeps from top (North Pole) to bottom (South Pole)
- Borders light up progressively as the wave passes, like electricity tracing the outlines
- After ignition completes (~2 seconds), borders settle into a soft, steady glow
- Uses a custom shader uniform that animates a Y-threshold value over time

### 3. Slightly Faster Globe Rotation
- Increase rotation speed from 0.03 to ~0.06 so the globe feels more alive and dynamic
- Keep motion smooth and continuous -- no wobble, no bounce

### 4. Keep Orbital Rings As-Is
- The existing `OrbitalRing` component stays exactly the same
- Same position, rotation, style, and speed

### 5. Background Currency Symbols
- Add 6-8 floating currency symbols in the background depth: $, EUR, INR, GBP, JPY, BTC
- Symbols are rendered as 3D text meshes or sprite planes, outline-style with low opacity
- Each symbol slowly drifts in wave-like paths (sine-based movement)
- Symbols morph/crossfade into the next currency in a continuous loop
- Movement is slow, random but controlled, and always stays behind the globe
- Symbols exist at z-depths further from camera than the globe

## Technical Approach

### File: `src/components/landing/ThreeBackground.tsx` (full rewrite)

**Continent Data:**
- Define simplified continent outline vertices as arrays of [lat, lon] coordinate pairs
- Convert lat/lon to 3D sphere positions using standard spherical coordinate math
- Store as a typed constant within the component file (keeps it self-contained)

**Ignition Shader:**
- Use a custom `ShaderMaterial` for continent border lines
- Vertex shader passes world-space Y position to fragment shader
- Fragment shader uses a `uIgnitionProgress` uniform (0 to 1) to reveal borders top-to-bottom
- Animate the uniform from 0 to 1 over ~2 seconds using `useFrame`
- After ignition, borders maintain a soft glow (opacity ~0.4-0.5)

**Currency Symbols:**
- Use `@react-three/drei`'s `Text` component for crisp 3D text rendering
- Each symbol is a separate component with:
  - Sine-wave drift on X and Y axes (slow, different frequencies per symbol)
  - Opacity crossfade: each symbol fades out while the next fades in (cycle every ~4 seconds)
  - Positioned at z = -3 to -6 (behind the globe at z = 0)
  - Low opacity (0.08-0.15) so they don't compete with content

**Scene Composition:**
```text
Scene
  +-- CinematicLighting (same style, slightly adjusted)
  +-- EarthGlobe
  |     +-- Dark sphere (meshPhysicalMaterial)
  |     +-- Continent borders (custom ShaderMaterial lines)
  |     +-- Atmospheric glow layers
  +-- OrbitalRing (unchanged)
  +-- CurrencySymbols
  |     +-- 6-8 floating Text elements
  +-- DataPoints (keep the subtle accent dots)
```

### Existing Files Unchanged
- `src/pages/Landing.tsx` -- no changes needed, already lazy-loads ThreeBackground
- All other landing components remain as-is

### Build Error Fix
- The edge function build error (`500 Internal Server Error` from `esm.sh`) is a transient CDN issue, not a code problem. The import `https://esm.sh/@supabase/supabase-js@2` is correct. No code change needed -- it will resolve on next deployment attempt.

## Performance Considerations

- Continent borders use a single `BufferGeometry` with all vertices (efficient single draw call)
- Currency symbols use `drei/Text` which is GPU-optimized
- Total polygon count stays low (sphere + lines + text sprites)
- The `dpr={[1, 2]}` and `powerPreference: 'high-performance'` settings remain
- Ignition animation runs only once on load, then the uniform is static

## Visual Summary

```text
Page Load Sequence:
1. Dark globe appears (instant)
2. Continent borders ignite top-to-bottom (~2s)
3. Globe starts rotating (smooth, continuous)
4. Rings orbit calmly
5. Currency symbols fade in and begin drifting
6. Symbols morph: $ -> EUR -> INR -> GBP -> YEN -> BTC -> $ (loop)
```

