import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * VRControls Component
 * Provides smooth first-person WASD/Arrow keyboard navigation and mouse looking
 * within the 3D Virtual Hospital bounds.
 */
export default function VRControls({
  speed = 4.5,
  boundaries = { minX: -7.5, maxX: 7.5, minZ: -6.5, maxZ: 6.5 },
  teleportTarget,
  onTeleportComplete,
}) {
  const { camera } = useThree();
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = true;
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = false;
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle programmatic teleportation
  useEffect(() => {
    if (teleportTarget) {
      camera.position.set(teleportTarget[0], teleportTarget[1] || 1.6, teleportTarget[2]);
      if (onTeleportComplete) onTeleportComplete();
    }
  }, [teleportTarget, camera, onTeleportComplete]);

  useFrame((_, delta) => {
    // Forward / Lateral movement vectors based on camera yaw
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    const moveVector = new THREE.Vector3();

    if (keys.current.forward) moveVector.add(forward);
    if (keys.current.backward) moveVector.sub(forward);
    if (keys.current.right) moveVector.add(right);
    if (keys.current.left) moveVector.sub(right);

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize().multiplyScalar(speed * delta);
      const newPos = camera.position.clone().add(moveVector);

      // Enforce room boundaries
      newPos.x = Math.max(boundaries.minX, Math.min(boundaries.maxX, newPos.x));
      newPos.z = Math.max(boundaries.minZ, Math.min(boundaries.maxZ, newPos.z));
      newPos.y = 1.6; // Constant eye level

      camera.position.copy(newPos);
    }
  });

  return null;
}
