import * as THREE from 'three'

let cached = null

/**
 * Probe WebGL once — Chrome on some Mac GPUs lacks half-float color buffers,
 * which breaks outputBufferType: HalfFloatType and makes the bag look corrupted.
 */
export function getWebGLCapabilities() {
  if (cached) return cached

  const canvas = document.createElement('canvas')
  const gl =
    canvas.getContext('webgl2', {
      antialias: true,
      powerPreference: 'high-performance',
    }) ||
    canvas.getContext('webgl', {
      antialias: true,
      powerPreference: 'high-performance',
    })

  const halfFloatColorBuffer = Boolean(
    gl &&
      (gl.getExtension('EXT_color_buffer_half_float') ||
        gl.getExtension('EXT_color_buffer_float')),
  )

  cached = {
    halfFloatColorBuffer,
    isWebGL2: gl instanceof WebGL2RenderingContext,
    outputBufferType: halfFloatColorBuffer
      ? THREE.HalfFloatType
      : THREE.UnsignedByteType,
    rendererOptions: {
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      ...(halfFloatColorBuffer
        ? { outputBufferType: THREE.HalfFloatType }
        : {}),
    },
  }

  return cached
}

/** Reflection RT for Water — scale with Retina / Apple displays. */
export function getWaterReflectionSize(base = 2048) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  return Math.min(4096, Math.max(base, Math.floor(base * dpr)))
}
