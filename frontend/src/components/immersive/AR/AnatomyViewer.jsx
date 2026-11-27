import { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import ExperienceLoader from '../common/ExperienceLoader';

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
          emissiveIntensity={hovered || isSelected ? 0.7 : 0.05}
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

// 3D Human Body Model with anatomical layers
function HumanBodyModel({
  selectedOrgan,
  onSelectOrgan,
  activeLayer = 'all',
  opacity = 0.35,
}) {
  const showNervous = activeLayer === 'all' || activeLayer === 'nervous';
  const showCirculatory = activeLayer === 'all' || activeLayer === 'circulatory';
  const showRespiratory = activeLayer === 'all' || activeLayer === 'respiratory';
  const showDigestive = activeLayer === 'all' || activeLayer === 'digestive';

  return (
    <group position={[0, -0.6, 0]}>
      {/* 1. Translucent Skin Shell (Torso, Head, Limbs) */}
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

      {/* 2. Embedded Visceral Organs */}
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
    } else {
      controlsRef.current.target.set(0, 0.3, 0);
      controlsRef.current.object.position.set(0, 0.5, 3.8);
    }
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-[580px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col">
      {/* 3D Canvas */}
      <Suspense fallback={<ExperienceLoader message="Loading 3D Anatomy Model..." />}>
        <Canvas
          camera={{ position: [0, 0.5, 3.8], fov: 45 }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 10, 10]} intensity={1.2} />
          <directionalLight position={[-10, -5, -5]} intensity={0.5} color="#80d8ff" />
          <pointLight position={[0, 2, 2]} intensity={0.7} color="#ffffff" />

          <HumanBodyModel
            selectedOrgan={selectedOrgan}
            onSelectOrgan={onSelectOrgan}
            activeLayer={activeLayer}
            opacity={skinOpacity}
          />

          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={1.4}
            maxDistance={6.0}
            target={[0, 0.3, 0]}
          />
        </Canvas>
      </Suspense>

      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-white pointer-events-auto shadow-xs">
          <span className="text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Interactive Human Anatomy
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
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
      <div className="absolute left-4 top-16 bg-slate-900/85 backdrop-blur-md p-2 rounded-2xl border border-slate-700/70 text-white flex flex-col gap-1.5 shadow-lg">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
          Anatomical Systems
        </span>
        {[
          { id: 'all', label: 'All Systems', icon: '🌐' },
          { id: 'circulatory', label: 'Circulatory', icon: '🫀' },
          { id: 'respiratory', label: 'Respiratory', icon: '🫁' },
          { id: 'digestive', label: 'Digestive', icon: '🥣' },
          { id: 'nervous', label: 'Nervous', icon: '🧠' },
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
            Skin Opacity
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
          <span>Click any organ to inspect detailed anatomical specs.</span>
        </div>
      </div>
    </div>
  );
}
