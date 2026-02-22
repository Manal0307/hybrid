import * as THREE from 'three'

/**
 * Pseudo-bruit pour casser la régularité (évite l'effet grille/carré).
 */
function noise2D(px, py) {
  const n = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453
  return n - Math.floor(n)
}

function smoothNoise(x, y, size) {
  const ix = Math.floor(x) % size
  const iy = Math.floor(y) % size
  const fx = x - Math.floor(x)
  const fy = y - Math.floor(y)
  const a = noise2D(ix, iy)
  const b = noise2D(ix + 1, iy)
  const c = noise2D(ix, iy + 1)
  const d = noise2D(ix + 1, iy + 1)
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}

/**
 * Normales très douces : fluide et rond, aucune ligne ni trace.
 * Bruit à grande échelle, amplitude faible.
 */
export function createWaterNormalsTexture(size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(size, size)
  const data = imageData.data
  const scale = 0.003

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x * scale
      const py = y * scale
      const n1 = smoothNoise(px, py, 256) * 0.025
      const n2 = smoothNoise(px * 0.7 + 50, py * 0.6 + 30, 256) * 0.02
      const n3 = smoothNoise(px * 0.5 + py * 0.4, py * 0.5 - px * 0.3, 256) * 0.015
      const dx = n1 + n2
      const dy = n2 * 0.8 + n3
      const i = (y * size + x) * 4
      data[i] = Math.floor(128 + Math.max(-1, Math.min(1, dx)) * 127)
      data[i + 1] = Math.floor(128 + Math.max(-1, Math.min(1, dy)) * 127)
      data[i + 2] = 250
      data[i + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 3)
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}
