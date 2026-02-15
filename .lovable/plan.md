# Fix Mirror-Imaged World Map

## Problem

The continent borders appear mirror-imaged (horizontally flipped) because the spherical coordinate conversion is producing the map in reverse. When looking at the globe from the front, continents appear on the wrong side (e.g., Americas on the right instead of left).

## Root Cause

In standard geographic coordinates, positive longitude is East. However, the current conversion formula places positive longitude in the wrong direction relative to the camera view. The Z-component calculation uses `Math.sin(theta)` which needs to be negated to flip the map horizontally.

## Solution

Negate the theta (longitude) angle in the Z-coordinate calculation to flip the map horizontally. This is a single-line change in the `processRing` function.

## Technical Change

**File: `src/components/landing/ThreeBackground.tsx`**

In the `processRing` function (lines 82-91), change the Z-coordinate calculation from:

```javascript
radius * Math.sin(colat1) * Math.sin(theta1)
```

to:

```javascript
-radius * Math.sin(colat1) * Math.sin(theta1)
```

This applies to both vertex calculations (for point 1 and point 2 of each line segment).

- Americas will appear on the left side of the globe (West)
- Europe/Africa will appear in the center
- Asia/Australia will appear on the right side (East)
- The globe will match real-world geography when viewed from the front
