import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

// Custom Shader Material for Holographic Effect
const HolographicMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color(0.0, 1.0, 1.0),
    uRimColor: new THREE.Color(1.0, 1.0, 1.0),
    uGlitchStrength: 0.5,
    uScanlineFrequency: 50.0,
    uScanlineSpeed: 2.0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    uniform float uTime;
    uniform float uGlitchStrength;

    // Simplex Noise (simplified)
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      // Glitch Effect on Vertex
      vec3 pos = position;
      float glitch = step(0.98, random(vec2(uTime * 10.0, pos.y * 10.0))) * uGlitchStrength * 0.05;
      pos.x += glitch;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
      vPosition = pos;
    }
  `,
  // Fragment Shader
  `
    precision highp float;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uRimColor;
    uniform float uScanlineFrequency;
    uniform float uScanlineSpeed;

    void main() {
      // 1. Fresnel Effect (Rim Light)
      vec3 viewDir = normalize(vViewPosition);
      vec3 normal = normalize(vNormal);
      float fresnel = pow(1.0 - dot(viewDir, normal), 2.0);
      
      // 2. Scanlines
      float scanline = sin(vPosition.y * uScanlineFrequency - uTime * uScanlineSpeed);
      scanline = smoothstep(0.0, 1.0, scanline);
      
      // 3. Hologram Core
      vec3 color = uColor;
      
      // Mix effects
      float alpha = fresnel + scanline * 0.1;
      alpha = clamp(alpha, 0.0, 1.0);
      
      // Rim Color boost
      color += uRimColor * fresnel * 2.0;

      // Add "Interference" noise
      float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
      color += vec3(noise * 0.05);

      gl_FragColor = vec4(color, alpha * 0.8 + 0.2); // Base opacity
    }
  `
)

extend({ HolographicMaterialImpl })

// Declare global JSX for the custom material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      holographicMaterialImpl: {
        ref?: any
        key?: any
        attach?: string
        args?: any[]
        uTime?: number
        uColor?: THREE.Color
        uRimColor?: THREE.Color
        uGlitchStrength?: number
        uScanlineFrequency?: number
        uScanlineSpeed?: number
        // Common props
        transparent?: boolean
        side?: THREE.Side
        depthWrite?: boolean
        blending?: THREE.Blending
        vertexColors?: boolean
        wireframe?: boolean
      }
    }
  }
}

export default HolographicMaterialImpl
