import * as THREE from 'three'
import { FIELD_HALF_SIZE, SPHERE_RADIUS } from './BouncySphere.const'

export function randomPosition(): THREE.Vector3 {
  return new THREE.Vector3(
    (Math.random() - 0.5) * FIELD_HALF_SIZE * 2,
    (Math.random() - 0.5) * FIELD_HALF_SIZE * 2,
    (Math.random() - 0.5) * FIELD_HALF_SIZE * 2
  )
}

export function setupEventHandlers(
  domElement: HTMLElement,
  rotation: React.MutableRefObject<{ yaw: number; pitch: number }>,
  panOffset: React.MutableRefObject<THREE.Vector3>,
  zoom: React.MutableRefObject<number>
) {
  let isRotating = false
  let isPanning = false
  let lastMouse = { x: 0, y: 0 }

  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      isRotating = true
    } else if (e.button === 2) {
      isPanning = true
    }
    lastMouse = { x: e.clientX, y: e.clientY }
  }
  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      isRotating = false
    } else if (e.button === 2) {
      isPanning = false
    }
  }
  const onMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - lastMouse.x
    const deltaY = e.clientY - lastMouse.y

    if (isRotating) {
      rotation.current.yaw -= deltaX * 0.01
      rotation.current.pitch -= deltaY * 0.01
      rotation.current.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, rotation.current.pitch))
    } else if (isPanning) {
      panOffset.current.x += deltaX * 0.01
      panOffset.current.y -= deltaY * 0.01
    }

    lastMouse = { x: e.clientX, y: e.clientY }
  }
  const onWheel = (e: WheelEvent) => {
    zoom.current += e.deltaY * 0.01
    zoom.current = Math.max(2, Math.min(zoom.current, 30))
  }

  domElement.addEventListener('mousedown', onMouseDown)
  domElement.addEventListener('mouseup', onMouseUp)
  domElement.addEventListener('mouseleave', onMouseUp)
  domElement.addEventListener('mousemove', onMouseMove)
  domElement.addEventListener('wheel', onWheel)
  domElement.addEventListener('contextmenu', (e) => e.preventDefault())

  return () => {
    domElement.removeEventListener('mousedown', onMouseDown)
    domElement.removeEventListener('mouseup', onMouseUp)
    domElement.removeEventListener('mouseleave', onMouseUp)
    domElement.removeEventListener('mousemove', onMouseMove)
    domElement.removeEventListener('wheel', onWheel)
    domElement.removeEventListener('contextmenu', (e) => e.preventDefault())
  }
}

export function handleCollisions(spheres: { mesh: THREE.Mesh; velocity: THREE.Vector3 }[], scene: THREE.Scene) {
  const toRemove = new Set<number>()
  for (let i = 0; i < spheres.length; i++) {
    for (let j = i + 1; j < spheres.length; j++) {
      const a = spheres[i]
      const b = spheres[j]
      const dist = a.mesh.position.distanceTo(b.mesh.position)
      if (dist < SPHERE_RADIUS * 2) {
        toRemove.add(i)
        toRemove.add(j)
      }
    }
  }
  Array.from(toRemove)
    .sort((a, b) => b - a)
    .forEach(idx => {
      scene.remove(spheres[idx].mesh)
      spheres.splice(idx, 1)
    })
}

export function animateScene(
  spheres: { mesh: THREE.Mesh; velocity: THREE.Vector3 }[],
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  requestRef: React.MutableRefObject<number>,
  zoom: React.MutableRefObject<number>,
  rotation: React.MutableRefObject<{ yaw: number; pitch: number }>,
  panOffset: React.MutableRefObject<THREE.Vector3>
) {
  for (const s of spheres) {
    s.mesh.position.add(s.velocity)
    const pos = s.mesh.position
    const normal = pos.clone().normalize()
    if (pos.length() > FIELD_HALF_SIZE - SPHERE_RADIUS && s.velocity.dot(normal) > 0) {
      s.velocity.reflect(normal)
      pos.copy(normal.multiplyScalar(FIELD_HALF_SIZE - SPHERE_RADIUS))
    }
  }
  handleCollisions(spheres, scene)

  const r = zoom.current
  const { yaw, pitch } = rotation.current
  camera.position.x = r * Math.cos(pitch) * Math.sin(yaw)
  camera.position.y = r * Math.sin(pitch)
  camera.position.z = r * Math.cos(pitch) * Math.cos(yaw)

  const target = new THREE.Vector3(panOffset.current.x, panOffset.current.y, panOffset.current.z)
  camera.lookAt(target)

  renderer.render(scene, camera)
  requestRef.current = requestAnimationFrame(() => animateScene(spheres, scene, camera, renderer, requestRef, zoom, rotation, panOffset))
}