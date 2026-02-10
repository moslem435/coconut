'use client'

import { useRef, useEffect, useState } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Environment, PerspectiveCamera, Stars, Float, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, ChromaticAberration, Glitch } from '@react-three/postprocessing'
import { Vector2 } from 'three'
import { GlitchMode } from 'postprocessing'
import * as THREE from 'three'
import ProjectStage from './ProjectStage'
import { PROJECTS } from '@/lib/data'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'

interface SceneProps {
  activeProjectIndex: number
  isPortalActive: boolean
  onPortalComplete: () => void
  selectedSubProject?: string | null
}

function ResponsiveCamera({ targetWidth = 6.5, minZ = 10 }) {
  const { camera, size } = useThree()

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return

    const aspect = size.width / size.height
    const vFov = camera.fov * Math.PI / 180
    
    // Calculate required distance to fit targetWidth
    // formula: distance = width / (2 * tan(fov/2) * aspect)
    const distForWidth = targetWidth / (2 * Math.tan(vFov / 2) * aspect)
    
    const finalZ = Math.max(minZ, distForWidth)
    
    camera.position.z = finalZ
    camera.updateProjectionMatrix()
  }, [size, camera, targetWidth, minZ])

  return null
}

function MovingSpot({ color }: { color: string }) {
  const spotRef = useRef<THREE.SpotLight>(null)
  
  useFrame(({ clock }) => {
    if (spotRef.current) {
      const t = clock.getElapsedTime() * 0.5
      spotRef.current.position.x = Math.sin(t) * 2 + 10
      spotRef.current.position.z = Math.cos(t) * 2 + 10
    }
  })

  return (
    <spotLight 
      ref={spotRef}
      position={[10, 10, 10]} 
      angle={0.5} 
      penumbra={1} 
      intensity={20} 
      color={color}
    />
  )
}

export default function Scene({ activeProjectIndex, isPortalActive, onPortalComplete, selectedSubProject }: SceneProps) {
  const project = PROJECTS[activeProjectIndex] || PROJECTS[0]
  const [glitchActive, setGlitchActive] = useState(false)
  const { useAnimations } = useSystemSettings()

  // Trigger glitch on project change
  useEffect(() => {
    setGlitchActive(true)
    const timer = setTimeout(() => setGlitchActive(false), 200)
    return () => clearTimeout(timer)
  }, [activeProjectIndex])

  return (
    <div className="h-full w-full pointer-events-none" style={{ pointerEvents: 'none' }}>
      <Canvas
        eventSource={undefined} // Disable all event listeners
        events={undefined} // Disable internal event manager
        style={{ pointerEvents: 'none' }}
        gl={{ antialias: true, alpha: true, stencil: false, depth: true }}
        dpr={[1, 1.5]}
        shadows
        className="bg-transparent"
      >
        {/* Reset Camera to Standard Position:
            Now that the canvas is flat (not rotated by CSS), we use a standard FOV and Position.
            Z=10 is a good standard distance for full-height objects.
        */}
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={40} />
        
        <ResponsiveCamera targetWidth={6.5} minZ={10} />

        {/* <color attach="background" args={['#050505']} /> */}
        
        {/* Dynamic Lighting based on Project Color */}
        <ambientLight intensity={0.2} />
        
        <MovingSpot color={project.color} />
        
        <pointLight position={[-10, -5, -10]} intensity={10} color={project.accent} />

        {/* The Main Stage */}
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <ProjectStage activeProjectIndex={activeProjectIndex} selectedSubProject={selectedSubProject} />
        </Float>

        {/* Environment: Space / Void */}
        <Environment preset="city" blur={1} />
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={50} scale={12} size={2} speed={0.4} opacity={0.5} color="white" />

        {/* Post Processing Effects - Restored */}
        {useAnimations && (
        <EffectComposer multisampling={0}>
           <ChromaticAberration 
             offset={new Vector2(0.002, 0.002)}
             radialModulation={false}
             modulationOffset={0}
           />
           <Bloom 
             luminanceThreshold={0.2} 
             mipmapBlur 
             intensity={1.5} 
             radius={0.4}
           />
           <Noise opacity={0.1} />
           <Glitch 
              delay={new Vector2(0, 0)} // No random glitches
              duration={new Vector2(0.1, 0.2)}
              strength={new Vector2(0.1, 0.2)}
              mode={glitchActive ? GlitchMode.CONSTANT_MILD : GlitchMode.DISABLED}
              active={glitchActive}
              ratio={0.85}
            />
        </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
