import { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import ExperienceLoader from '../common/ExperienceLoader';

// 3D GLB Model Loader with automatic error fallback
function RealisticAnatomyGLB({ opacity = 0.35 }) {
  const { scene } = useGLTF('/models/anatomy_body.glb');
  
  // Clone or adjust material opacity
  scene.traverse((child) => {
    if (child.isMesh && child.name.includes('Skin')) {
      child.material.transparent = true;
      child.material.opacity = opacity;
    }
  });

  return <primitive object={scene} position={[0, -0.6, 0]} />;
}

// Interactive Clickable Organ Component inside Anatomy
function SelectableOrgan({
  name,
  position,
  geometry,
  color,
  emissiveColor,
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
  isSelected,
  onSelect,
  isAnimated = false,
  animationType = 'pulse',
}) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!meshRef.current || !isAnimated) return;
    const t = clock.getElapsedTime();
    if (animationType === 'heartbeat') {
      const pulse = 1.0 + Math.sin(t * 5.0) * 0.06;
      meshRef.current.scale.set(scale[0] * pulse, scale[1] * pulse, scale[2] * pulse);
    } else if (animationType === 'breath') {
      const breath = 1.0 + Math.sin(t * 2.0) * 0.04;
      meshRef.current.scale.set(scale[0] * breath, scale[1] * breath, scale[2] * breath);
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh
        ref={meshRef}
        scale={scale}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(name);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {geometry}
        <meshStandardMaterial
          color={hovered || isSelected ? '#ffffff' : color}
          emissive={hovered || isSelected ? (emissiveColor || '#00e5ff') : '#000000'}
          emissiveIntensity={hovered || isSelected ? 0.75 : 0.08}
          roughness={0.35}
          metalness={0.1}
        />
      </mesh>

      {/* 3D Floating Tag on Selected or Hovered */}
      {(hovered || isSelected) && (
        <Html distanceFactor={4} position={[0, 0.25, 0]} center>
          <div className="bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-cyan-400 shadow-md whitespace-nowrap pointer-events-none transform -translate-y-2 transition-all">
            <span className="text-cyan-400 mr-1">✦</span>
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

// 3D Procedural Multi-System Anatomical Body Model
function ProceduralAnatomyModel({
  selectedOrgan,
  onSelectOrgan,
  activeLayer = 'all',
  opacity = 0.35,
}) {
  const showSkeletal = activeLayer === 'all' || activeLayer === 'skeletal';
  const showMuscular = activeLayer === 'all' || activeLayer === 'muscular';
  const showCirculatory = activeLayer === 'all' || activeLayer === 'circulatory';
  const showRespiratory = activeLayer === 'all' || activeLayer === 'respiratory';
  const showDigestive = activeLayer === 'all' || activeLayer === 'digestive';
  const showNervous = activeLayer === 'all' || activeLayer === 'nervous';
  const showSkin = activeLayer === 'all' || activeLayer === 'skin';

  return (
    <group position={[0, -0.6, 0]}>
      {/* 1. Translucent Skin Shell (Torso, Head, Limbs) */}
      {showSkin && (
        <group>
          {/* Torso Shell */}
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.38, 0.28, 1.25, 20]} />
            <meshStandardMaterial
              color="#60a5fa"
              transparent={true}
              opacity={opacity}
              roughness={0.25}
              metalness={0.1}
              depthWrite={false}
            />
          </mesh>

          {/* Head Shell */}
          <mesh position={[0, 1.95, 0]}>
            <sphereGeometry args={[0.26, 20, 20]} />
            <meshStandardMaterial
              color="#60a5fa"
              transparent={true}
              opacity={opacity}
              roughness={0.25}
              depthWrite={false}
            />
          </mesh>

          {/* Arms & Legs Shell */}
          <mesh position={[0.54, 1.15, 0]}>
            <cylinderGeometry args={[0.09, 0.07, 1.05, 12]} />
            <meshStandardMaterial color="#60a5fa" transparent opacity={opacity * 0.7} depthWrite={false} />
          </mesh>
          <mesh position={[-0.54, 1.15, 0]}>
            <cylinderGeometry args={[0.09, 0.07, 1.05, 12]} />
            <meshStandardMaterial color="#60a5fa" transparent opacity={opacity * 0.7} depthWrite={false} />
          </mesh>
          <mesh position={[0.2, -0.1, 0]}>
            <cylinderGeometry args={[0.12, 0.09, 1.2, 12]} />
            <meshStandardMaterial color="#60a5fa" transparent opacity={opacity * 0.7} depthWrite={false} />
          </mesh>
          <mesh position={[-0.2, -0.1, 0]}>
            <cylinderGeometry args={[0.12, 0.09, 1.2, 12]} />
            <meshStandardMaterial color="#60a5fa" transparent opacity={opacity * 0.7} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* 2. Skeletal System */}
      {showSkeletal && (
        <group>
          {/* Cranium / Skull Bone */}
          <mesh position={[0, 1.95, 0]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
          </mesh>

          {/* Spine / Vertebral Column */}
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh key={`vert-${i}`} position={[0, 0.6 + i * 0.09, -0.06]}>
              <cylinderGeometry args={[0.045, 0.045, 0.06, 12]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
            </mesh>
          ))}

          {/* Rib Cage */}
          {[-0.14, -0.07, 0, 0.07, 0.14].map((yOffset, i) => (
            <mesh key={`rib-${i}`} position={[0, 1.25 + yOffset, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.26 - Math.abs(yOffset) * 0.4, 0.022, 8, 24, Math.PI * 1.8]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
            </mesh>
          ))}

          {/* Pelvis Structure */}
          <mesh position={[0, 0.52, 0]}>
            <torusGeometry args={[0.22, 0.06, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
          </mesh>
        </group>
      )}

      {/* 3. Muscular System */}
      {showMuscular && (
        <group>
          {/* Pectoralis Major Left & Right */}
          <mesh position={[-0.14, 1.35, 0.14]} rotation={[0, 0.2, -0.1]}>
            <boxGeometry args={[0.18, 0.12, 0.04]} />
            <meshStandardMaterial color="#dc2626" roughness={0.6} />
          </mesh>
          <mesh position={[0.14, 1.35, 0.14]} rotation={[0, -0.2, 0.1]}>
            <boxGeometry args={[0.18, 0.12, 0.04]} />
            <meshStandardMaterial color="#dc2626" roughness={0.6} />
          </mesh>

          {/* Rectus Abdominis (Abs) */}
          {[-0.08, 0.08].map((x) =>
            [0.85, 0.98, 1.1].map((y, idx) => (
              <mesh key={`abs-${x}-${idx}`} position={[x, y, 0.14]}>
                <boxGeometry args={[0.11, 0.09, 0.03]} />
                <meshStandardMaterial color="#b91c1c" roughness={0.6} />
              </mesh>
            ))
          )}
        </group>
      )}

      {/* 4. Circulatory Vessels (Aorta & Vena Cava) */}
      {showCirculatory && (
        <group>
          {/* Descending Aorta (Red) */}
          <mesh position={[-0.03, 1.0, 0.0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.8, 12]} />
            <meshStandardMaterial color="#e11d48" roughness={0.3} metalness={0.2} />
          </mesh>
          {/* Inferior Vena Cava (Blue) */}
          <mesh position={[0.04, 1.0, 0.0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.8, 12]} />
            <meshStandardMaterial color="#2563eb" roughness={0.3} metalness={0.2} />
          </mesh>
        </group>
      )}

      {/* 5. Visceral Organs */}
      {/* Brain */}
      {showNervous && (
        <SelectableOrgan
          name="Brain"
          position={[0, 1.95, 0]}
          geometry={<sphereGeometry args={[0.16, 20, 16]} />}
          color="#f48fb1"
          emissiveColor="#ff4081"
          scale={[1.1, 0.9, 1.1]}
          isSelected={selectedOrgan === 'Brain'}
          onSelect={onSelectOrgan}
          isAnimated={true}
        />
      )}

      {/* Heart */}
      {showCirculatory && (
        <SelectableOrgan
          name="Heart"
          position={[-0.08, 1.35, 0.1]}
          geometry={<dodecahedronGeometry args={[0.14, 2]} />}
          color="#d32f2f"
          emissiveColor="#ff1744"
          scale={[0.9, 1.1, 0.9]}
          isSelected={selectedOrgan === 'Heart'}
          onSelect={onSelectOrgan}
          isAnimated={true}
          animationType="heartbeat"
        />
      )}

      {/* Lungs */}
      {showRespiratory && (
        <>
          <SelectableOrgan
            name="Lungs"
            position={[0.18, 1.36, 0.04]}
            geometry={<capsuleGeometry args={[0.12, 0.36, 12, 16]} />}
            color="#ef9a9a"
            emissiveColor="#ff5252"
            isSelected={selectedOrgan === 'Lungs'}
            onSelect={onSelectOrgan}
            isAnimated={true}
            animationType="breath"
          />
          <SelectableOrgan
            name="Lungs"
            position={[-0.19, 1.36, 0.04]}
            geometry={<capsuleGeometry args={[0.11, 0.35, 12, 16]} />}
            color="#ef9a9a"
            emissiveColor="#ff5252"
            isSelected={selectedOrgan === 'Lungs'}
            onSelect={onSelectOrgan}
            isAnimated={true}
            animationType="breath"
          />
        </>
      )}

      {/* Liver */}
      {showDigestive && (
        <SelectableOrgan
          name="Liver"
          position={[0.12, 1.05, 0.08]}
          geometry={<boxGeometry args={[0.26, 0.15, 0.18]} />}
          color="#8d6e63"
          emissiveColor="#bcaaa4"
          isSelected={selectedOrgan === 'Liver'}
          onSelect={onSelectOrgan}
        />
      )}

      {/* Stomach */}
      {showDigestive && (
        <SelectableOrgan
          name="Stomach"
          position={[-0.1, 1.02, 0.09]}
          geometry={<torusGeometry args={[0.12, 0.07, 12, 20, Math.PI * 0.9]} />}
          color="#ffb74d"
          emissiveColor="#ffa726"
          rotation={[0, 0, Math.PI * 0.6]}
          isSelected={selectedOrgan === 'Stomach'}
          onSelect={onSelectOrgan}
        />
      )}

      {/* Kidneys */}
      {showCirculatory && (
        <>
          <SelectableOrgan
            name="Kidneys"
            position={[-0.14, 0.92, -0.06]}
            geometry={<sphereGeometry args={[0.075, 14, 14]} />}
            color="#5d4037"
            emissiveColor="#8d6e63"
            scale={[0.8, 1.3, 0.8]}
            isSelected={selectedOrgan === 'Kidneys'}
            onSelect={onSelectOrgan}
          />
          <SelectableOrgan
            name="Kidneys"
            position={[0.14, 0.92, -0.06]}
            geometry={<sphereGeometry args={[0.075, 14, 14]} />}
            color="#5d4037"
            emissiveColor="#8d6e63"
            scale={[0.8, 1.3, 0.8]}
            isSelected={selectedOrgan === 'Kidneys'}
            onSelect={onSelectOrgan}
          />
        </>
      )}
    </group>
  );
}

export default function AnatomyViewer({
  selectedOrgan = 'Heart',
  onSelectOrgan,
  onOpenAR,
}) {
  const [activeLayer, setActiveLayer] = useState('all');
  const [skinOpacity, setSkinOpacity] = useState(0.35);
  const [viewMode, setViewMode] = useState('schematic'); // 'schematic' or 'scan'
  const controlsRef = useRef();

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const focusPreset = (region) => {
    if (!controlsRef.current) return;
    if (region === 'head') {
      controlsRef.current.target.set(0, 1.3, 0);
      controlsRef.current.object.position.set(0, 1.3, 1.8);
    } else if (region === 'chest') {
      controlsRef.current.target.set(0, 0.7, 0);
      controlsRef.current.object.position.set(0, 0.7, 2.2);
    } else if (region === 'abdomen') {
      controlsRef.current.target.set(0, 0.3, 0);
      controlsRef.current.object.position.set(0, 0.3, 2.0);
    } else if (region === 'posterior') {
      controlsRef.current.target.set(0, 0.5, 0);
      controlsRef.current.object.position.set(0, 0.5, -3.5);
    } else {
      controlsRef.current.target.set(0, 0.3, 0);
      controlsRef.current.object.position.set(0, 0.5, 3.8);
    }
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-[620px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col">
      {/* 3D Canvas */}
      <Suspense fallback={<ExperienceLoader message="Loading 3D Anatomy Model..." />}>
        <Canvas
          camera={{ position: [0, 0.5, 3.8], fov: 45 }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.75} />
          <directionalLight position={[10, 10, 10]} intensity={1.3} />
          <directionalLight position={[-10, -5, -5]} intensity={0.5} color="#80d8ff" />
          <pointLight position={[0, 2, 2]} intensity={0.7} color="#ffffff" />

          {viewMode === 'scan' ? (
            <RealisticAnatomyGLB opacity={skinOpacity} />
          ) : (
            <ProceduralAnatomyModel
              selectedOrgan={selectedOrgan}
              onSelectOrgan={onSelectOrgan}
              activeLayer={activeLayer}
              opacity={skinOpacity}
            />
          )}

          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={1.2}
            maxDistance={6.0}
            target={[0, 0.3, 0]}
          />
        </Canvas>
      </Suspense>

      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-white pointer-events-auto shadow-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold">Interactive Human Anatomy 3.0</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Model Mode Toggle: Schematic vs Realistic Scan */}
          <div className="bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setViewMode('schematic')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                viewMode === 'schematic'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Schematic
            </button>
            <button
              type="button"
              onClick={() => setViewMode('scan')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                viewMode === 'scan'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Realistic 3D Scan
            </button>
          </div>

          <button
            type="button"
            onClick={resetCamera}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer backdrop-blur-md"
            title="Reset Camera View"
          >
            ↺ Reset
          </button>

          {onOpenAR && (
            <button
              type="button"
              onClick={onOpenAR}
              className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#0072CE] to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <span>📱</span>
              <span>Launch AR Mode</span>
            </button>
          )}
        </div>
      </div>

      {/* Layer Filter Toolbar (Left Side) */}
      <div className="absolute left-4 top-16 bg-slate-900/85 backdrop-blur-md p-2 rounded-2xl border border-slate-700/70 text-white flex flex-col gap-1.5 shadow-lg max-h-[480px] overflow-y-auto">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
          Anatomical Systems
        </span>
        {[
          { id: 'all', label: 'All Systems', icon: '🌐' },
          { id: 'skeletal', label: 'Skeletal', icon: '🦴' },
          { id: 'muscular', label: 'Muscular', icon: '💪' },
          { id: 'circulatory', label: 'Circulatory', icon: '🫀' },
          { id: 'respiratory', label: 'Respiratory', icon: '🫁' },
          { id: 'digestive', label: 'Digestive', icon: '🥣' },
          { id: 'nervous', label: 'Nervous', icon: '🧠' },
          { id: 'skin', label: 'Skin Shell', icon: '👤' },
        ].map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => setActiveLayer(layer.id)}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl transition text-left flex items-center gap-2 cursor-pointer ${
              activeLayer === layer.id
                ? 'bg-[#0072CE] text-white font-bold shadow-2xs'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>{layer.icon}</span>
            <span className="hidden sm:inline">{layer.label}</span>
          </button>
        ))}

        <div className="mt-2 pt-2 border-t border-slate-800 px-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Skin Opacity: {Math.round(skinOpacity * 100)}%
          </label>
          <input
            type="range"
            min="0.05"
            max="0.8"
            step="0.05"
            value={skinOpacity}
            onChange={(e) => setSkinOpacity(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Camera Focus Presets (Bottom Bar) */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/70 text-white pointer-events-auto flex items-center gap-2 shadow-lg">
          <span className="text-[11px] font-bold text-slate-400">View Presets:</span>
          {[
            { id: 'full', label: 'Full Body' },
            { id: 'head', label: 'Cranium' },
            { id: 'chest', label: 'Thorax' },
            { id: 'abdomen', label: 'Abdomen' },
            { id: 'posterior', label: 'Posterior' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => focusPreset(preset.id)}
              className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 pointer-events-auto">
          <span>Click any organ pin to inspect detailed anatomical specs.</span>
        </div>
      </div>
    </div>
  );
}
