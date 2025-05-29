import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FIELD_HALF_SIZE, SPHERE_COUNT, SPHERE_RADIUS } from './BouncySphere.const'
import { randomPosition, setupEventHandlers, animateScene } from './BouncySphere.util'
import { containerStyle } from './BouncySphere.stlye'

export default function BouncySpheres() {
  const mountRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<number>(0)
  const zoom = useRef(8)
  const rotation = useRef({ yaw: 0, pitch: 0 })
  const panOffset = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    const width = mountRef.current!.clientWidth
    const height = mountRef.current!.clientHeight

    // Remove any previous renderer canvas (important for React 18 StrictMode)
    while (mountRef.current!.firstChild) {
      mountRef.current!.removeChild(mountRef.current!.firstChild)
    }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 100)
    camera.position.set(0, 0, zoom.current)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setClearColor(0x000000)
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    mountRef.current!.appendChild(renderer.domElement)

    const sphereGeometry = new THREE.SphereGeometry(FIELD_HALF_SIZE, 64, 64)
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      depthWrite: false
    })
    const boundingSphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    scene.add(boundingSphere)

    // Spheres setup
    const spheres: { mesh: THREE.Mesh, velocity: THREE.Vector3 }[] = []
    for (let i = 0; i < SPHERE_COUNT; i++) {
      const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32)
      const material = new THREE.MeshNormalMaterial()
      const mesh = new THREE.Mesh(geometry, material)
      let pos: THREE.Vector3
      do {
        pos = randomPosition()
      } while (pos.length() > FIELD_HALF_SIZE - SPHERE_RADIUS)
      mesh.position.copy(pos)
      scene.add(mesh)
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      )
      spheres.push({ mesh, velocity })
    }

    // Setup event handlers
    const cleanupEventHandlers = setupEventHandlers(renderer.domElement, rotation, panOffset, zoom)

    // Start animation
    const animate = () => animateScene(spheres, scene, camera, renderer, requestRef, zoom, rotation, panOffset)
    animate()

    return () => {
      cleanupEventHandlers()
      cancelAnimationFrame(requestRef.current!)
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={containerStyle}
    />
  )
}