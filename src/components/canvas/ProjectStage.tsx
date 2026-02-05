import { useRef, useMemo } from 'react'
import { Text, Center } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PROJECTS, WORK_ITEMS } from '@/lib/data'
import './materials/HolographicMaterial' // Import to register

interface ProjectStageProps {
  activeProjectIndex: number
  selectedSubProject?: string | null
}

export default function ProjectStage({ activeProjectIndex, selectedSubProject }: ProjectStageProps) {
  const project = PROJECTS[activeProjectIndex] || PROJECTS[0]
  const isAbout = project.id === "02"
  
  // Find the selected sub-project if available
  const subProject = selectedSubProject 
    ? WORK_ITEMS.find(w => w.id === selectedSubProject) 
    : null

  // Memoize colors to avoid unnecessary re-creation and help R3F reactive props
  const color = useMemo(() => new THREE.Color(project.color), [project.color])
  
  // Refs for animation
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<any>(null)
  const coreRef = useRef<THREE.Group>(null)

  // DEBUG: Check props
  useFrame(() => {
    // console.log("ProjectStage Render:", { isAbout, subProject: subProject?.title })
  })

  // Restore subtle hologram animation
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    
    // Update Shader Uniforms for Text
    // IMPORTANT: Check that we are NOT in "About" mode before animating text material
    if (!isAbout && materialRef.current) {
      // If we have a sub-project selected, freeze the hologram (make it static)
      // Otherwise, keep the scanning animation
      if (subProject) {
        materialRef.current.uTime = 100.0 // Use a fixed large value for static
        materialRef.current.uGlitchStrength = 0.0 // DISABLE GLITCH
      } else {
        materialRef.current.uTime = t
        materialRef.current.uGlitchStrength = 0.5 // Enable Glitch
      }
    } else if (isAbout) {
       // Animate Core if About Page
       // Ensure materialRef is also updated for the core if it exists there
       if (materialRef.current) {
          materialRef.current.uTime = t
          materialRef.current.uGlitchStrength = 0.5
       }
       if (coreRef.current) {
          coreRef.current.rotation.y = t * 0.2
          coreRef.current.rotation.z = t * 0.1
       }
    }
  })

  return (
    // REFACTORED:
    // 1. Position: Centered [0, 0, 0] because Canvas is no longer rotated/distorted.
    // 2. Rotation: -75deg on Y axis to match the visual perspective of the frame (TriptychLayout RIGHT_WALL).
    // 3. Scale: Normal scale, no longer fighting CSS compression.
    <group ref={groupRef} position={[0, 0, 0]} rotation={[0, -55 * (Math.PI / 180), 0]}>
      <Center>
        {isAbout ? (
          // ABOUT PAGE: Abstract Data Core
          <group key="about-stage" ref={coreRef}>
             {/* Outer Shell */}
             <mesh>
               <icosahedronGeometry args={[2.5, 1]} />
               <meshBasicMaterial color={color} wireframe transparent opacity={0.15} />
             </mesh>
             
             {/* Inner Structure */}
             <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
               <octahedronGeometry args={[1.8, 0]} />
               <meshBasicMaterial color="white" wireframe transparent opacity={0.3} />
             </mesh>

             {/* Core */}
             <mesh>
               <dodecahedronGeometry args={[1, 0]} />
               {/* @ts-ignore */}
               <holographicMaterialImpl 
                  ref={materialRef}
                  transparent 
                  side={THREE.DoubleSide} 
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                  uColor={color}
               />
             </mesh>
             
             {/* Floating Particles/Data Points */}
             {Array.from({ length: 8 }).map((_, i) => (
                <mesh key={i} position={[Math.sin(i) * 3, Math.cos(i * 2) * 3, Math.sin(i * 3) * 3]} scale={0.05}>
                   <sphereGeometry args={[1, 8, 8]} />
                   <meshBasicMaterial color="white" />
                </mesh>
             ))}
          </group>
        ) : (
          // PROJECT PAGE: Holographic Text Title
          <group key="project-stage" position={[0, 0, 0]} rotation={[0, 0, 0]}>
            {/* Main Text with Holographic Shader */}
            <Text
                fontSize={subProject ? 0.8 : 1.0} // Slightly smaller for sub-project titles to ensure fit
                letterSpacing={-0.05}
                anchorX="center"
                anchorY="middle"
                maxWidth={5}
                textAlign="center"
              >
                {/* Display Sub-Project Title if selected, otherwise Main Category Title */}
                {subProject ? subProject.title : project.title}
                
                {/* @ts-ignore - Custom element defined in HolographicMaterial */}
                <holographicMaterialImpl 
                  ref={materialRef}
                  transparent 
                  side={THREE.DoubleSide} 
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                  uColor={color}
                  // uTime will be updated by useFrame
                />
              </Text>
  
              {/* Decorative Elements */}
              <Text
                fontSize={0.2}
                position={[0, -1.0, 0]}
                anchorX="center"
                color="white"
                fillOpacity={0.5}
              >
                {/* Show different system ID based on context */}
                {`// SYSTEM_ID: ${subProject ? subProject.id : project.id}`}
              </Text>
               <Text
                fontSize={0.2}
                position={[0, -1.3, 0]}
                anchorX="center"
                color="white"
                fillOpacity={0.5}
              >
                {`// CLASS: ${subProject ? subProject.type : project.category}`}
              </Text>
          </group>
        )}
      </Center>
    </group>
  )
}
