import { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Center, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import ExperienceLoader from '../common/ExperienceLoader';

// Web Audio API Synthesized Heartbeat Sound
class HeartbeatAudio {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playThump(volume = 0.3) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const now = this.ctx.currentTime;

    // "Lub" sound (S1 - mitral and tricuspid valve closure, lower pitch, 65Hz)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.frequency.setValueAtTime(65, now);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.12);
    gain1.gain.setValueAtTime(volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // "Dub" sound (S2 - aortic and pulmonary valve closure, slightly higher pitch, 85Hz) after 140ms
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.frequency.setValueAtTime(85, now + 0.14);
    osc2.frequency.exponentialRampToValueAtTime(40, now + 0.24);
    gain2.gain.setValueAtTime(volume * 0.7, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.24);
  }
}

const heartbeatAudio = new HeartbeatAudio();

// Realistic GLB Organ Loader with Error Fallback
function RealisticOrganGLB({ modelName }) {
  const fileMap = {
    heart: '/models/heart.glb',
    brain: '/models/brain.glb',
    lungs: '/models/lungs.glb',
    liver: '/models/liver.glb',
    kidneys: '/models/kidneys.glb',
    stomach: '/models/stomach.glb',
  };
  const url = fileMap[modelName.toLowerCase()] || '/models/heart.glb';
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

// 3D Procedural Heart Mesh with real-time systolic contraction and cross-section cutaway
function HeartMesh({ bpm = 72, isBeating = true, soundEnabled = false, showCrossSection = false }) {
  const meshRef = useRef();
  const lastBeatTime = useRef(0);

  useFrame(({ clock }) => {
    if (!meshRef.current || !isBeating) return;
    const t = clock.getElapsedTime();
    const beatFrequency = bpm / 60; // beats per second
    const phase = (t * beatFrequency) % 1;

    // Systolic pulse formula
    let scale = 1.0;
    if (phase < 0.18) {
      scale = 1.0 + Math.sin((phase / 0.18) * Math.PI) * 0.12;
      // Trigger sound on start of beat
      if (soundEnabled && t - lastBeatTime.current > 60 / bpm * 0.8) {
        heartbeatAudio.playThump(0.25);
        lastBeatTime.current = t;
      }
    } else if (phase > 0.22 && phase < 0.36) {
      scale = 1.0 + Math.sin(((phase - 0.22) / 0.14) * Math.PI) * 0.06;
    }
    meshRef.current.scale.set(scale, scale * 1.08, scale * 0.95);
  });

  return (
    <group ref={meshRef}>
      {/* Ventricles / Main Body */}
      <mesh position={[0, -0.05, 0]}>
        <dodecahedronGeometry args={[1.2, 3]} />
        <meshStandardMaterial
          color="#c62828"
          roughness={0.3}
          metalness={0.15}
          emissive="#5c0000"
          emissiveIntensity={0.2}
          wireframe={showCrossSection}
        />
      </mesh>

      {/* Internal Chambers (Visible in Cross-Section Mode) */}
      {showCrossSection && (
        <group>
          {/* Left Ventricle Chamber */}
          <mesh position={[0.3, -0.1, 0]}>
            <sphereGeometry args={[0.45, 16, 16]} />
            <meshStandardMaterial color="#b71c1c" roughness={0.3} />
          </mesh>
          {/* Right Ventricle Chamber */}
          <mesh position={[-0.3, -0.1, 0]}>
            <sphereGeometry args={[0.42, 16, 16]} />
            <meshStandardMaterial color="#c2185b" roughness={0.3} />
          </mesh>
          {/* Interventricular Septum */}
          <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[0.1, 0.9, 0.8]} />
            <meshStandardMaterial color="#880e4f" roughness={0.4} />
          </mesh>
        </group>
      )}

      {/* Aorta Arch */}
      <mesh position={[0.1, 1.0, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <torusGeometry args={[0.55, 0.2, 16, 32, Math.PI * 0.85]} />
        <meshStandardMaterial color="#b71c1c" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Superior Vena Cava (Blue vessel) */}
      <mesh position={[-0.6, 0.9, -0.1]}>
        <cylinderGeometry args={[0.18, 0.18, 1.2, 16]} />
        <meshStandardMaterial color="#1565c0" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Pulmonary Artery Branch */}
      <mesh position={[0.45, 0.7, 0.3]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.16, 0.16, 1.0, 16]} />
        <meshStandardMaterial color="#1976d2" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Coronary Artery Sulcus (Red Vessel) */}
      <mesh position={[-0.1, -0.05, 1.15]} rotation={[0, 0, Math.PI / 5]}>
        <cylinderGeometry args={[0.04, 0.03, 1.2, 12]} />
        <meshStandardMaterial color="#ff1744" roughness={0.2} />
      </mesh>
    </group>
  );
}

// 3D Procedural Brain Mesh with dual hemispheres, lobes, and interactive callouts
function BrainMesh({ animated = true, selectedLobe, onSelectLobe }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (!meshRef.current || !animated) return;
    const t = clock.getElapsedTime();
    meshRef.current.position.y = Math.sin(t * 1.5) * 0.04;
  });

  return (
    <group ref={meshRef}>
      {/* Frontal Lobe */}
      <mesh
        position={[0, 0.5, 0.6]}
        scale={[1.1, 0.75, 0.8]}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectLobe) onSelectLobe('Frontal Lobe');
        }}
      >
        <sphereGeometry args={[0.85, 20, 20]} />
        <meshStandardMaterial
          color={selectedLobe === 'Frontal Lobe' ? '#38bdf8' : '#f06292'}
          emissive={selectedLobe === 'Frontal Lobe' ? '#0284c7' : '#880e4f'}
          emissiveIntensity={selectedLobe === 'Frontal Lobe' ? 0.6 : 0.15}
          roughness={0.45}
        />
      </mesh>

      {/* Parietal Lobe */}
      <mesh
        position={[0, 0.7, -0.1]}
        scale={[1.05, 0.7, 0.8]}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectLobe) onSelectLobe('Parietal Lobe');
        }}
      >
        <sphereGeometry args={[0.85, 20, 20]} />
        <meshStandardMaterial
          color={selectedLobe === 'Parietal Lobe' ? '#38bdf8' : '#ec4899'}
          emissive={selectedLobe === 'Parietal Lobe' ? '#0284c7' : '#880e4f'}
          emissiveIntensity={selectedLobe === 'Parietal Lobe' ? 0.6 : 0.15}
          roughness={0.45}
        />
      </mesh>

      {/* Occipital Lobe */}
      <mesh
        position={[0, 0.2, -0.85]}
        scale={[0.9, 0.65, 0.65]}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectLobe) onSelectLobe('Occipital Lobe');
        }}
      >
        <sphereGeometry args={[0.75, 18, 18]} />
        <meshStandardMaterial
          color={selectedLobe === 'Occipital Lobe' ? '#38bdf8' : '#d946ef'}
          emissive={selectedLobe === 'Occipital Lobe' ? '#0284c7' : '#880e4f'}
          emissiveIntensity={selectedLobe === 'Occipital Lobe' ? 0.6 : 0.15}
          roughness={0.45}
        />
      </mesh>

      {/* Temporal Lobes Left & Right */}
      {[-0.85, 0.85].map((x, i) => (
        <mesh
          key={i}
          position={[x, 0, 0.1]}
          scale={[0.55, 0.6, 0.8]}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectLobe) onSelectLobe('Temporal Lobe');
          }}
        >
          <sphereGeometry args={[0.8, 18, 18]} />
          <meshStandardMaterial
            color={selectedLobe === 'Temporal Lobe' ? '#38bdf8' : '#f43f5e'}
            emissive={selectedLobe === 'Temporal Lobe' ? '#0284c7' : '#880e4f'}
            emissiveIntensity={selectedLobe === 'Temporal Lobe' ? 0.6 : 0.15}
            roughness={0.45}
          />
        </mesh>
      ))}

      {/* Cerebellum */}
      <mesh
        position={[0, -0.6, -0.65]}
        scale={[1.4, 0.8, 0.9]}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectLobe) onSelectLobe('Cerebellum');
        }}
      >
        <sphereGeometry args={[0.65, 18, 16]} />
        <meshStandardMaterial
          color={selectedLobe === 'Cerebellum' ? '#38bdf8' : '#ad1457'}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Brainstem */}
      <mesh
        position={[0, -1.0, -0.2]}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectLobe) onSelectLobe('Brainstem');
        }}
      >
        <cylinderGeometry args={[0.2, 0.16, 1.0, 16]} />
        <meshStandardMaterial
          color={selectedLobe === 'Brainstem' ? '#38bdf8' : '#c2185b'}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

// 3D Procedural Lungs Mesh with breathing expansion
function LungsMesh({ respRate = 16, animated = true }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (!meshRef.current || !animated) return;
    const t = clock.getElapsedTime();
    const breath = Math.sin(t * (respRate / 60) * 2 * Math.PI) * 0.5 + 0.5;
    const scale = 1.0 + breath * 0.08;
    meshRef.current.scale.set(scale, scale * 1.05, scale);
  });

  return (
    <group ref={meshRef}>
      {/* Trachea with Cartilaginous Rings */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 1.3, 16]} />
        <meshStandardMaterial color="#90a4ae" roughness={0.3} metalness={0.3} />
      </mesh>

      {/* Bronchial branches */}
      <mesh position={[0.3, 0.6, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.12, 0.1, 0.7, 12]} />
        <meshStandardMaterial color="#90a4ae" roughness={0.3} />
      </mesh>
      <mesh position={[-0.3, 0.6, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.12, 0.1, 0.7, 12]} />
        <meshStandardMaterial color="#90a4ae" roughness={0.3} />
      </mesh>

      {/* Right Lung (3 lobes: Superior, Middle, Inferior) */}
      <mesh position={[-0.85, 0, 0]} scale={[1.05, 1.0, 0.85]}>
        <capsuleGeometry args={[0.65, 1.5, 16, 20]} />
        <meshStandardMaterial
          color="#ef5350"
          roughness={0.5}
          emissive="#b71c1c"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Left Lung (2 lobes with Cardiac Notch) */}
      <mesh position={[0.85, 0, 0]} scale={[0.95, 1.0, 0.82]}>
        <capsuleGeometry args={[0.6, 1.45, 16, 20]} />
        <meshStandardMaterial
          color="#ef5350"
          roughness={0.5}
          emissive="#b71c1c"
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}

// 3D Procedural Liver Mesh
function LiverMesh() {
  return (
    <group>
      {/* Right Lobe */}
      <mesh position={[0.35, 0, 0]} scale={[1.3, 0.9, 1.0]}>
        <sphereGeometry args={[1.2, 20, 20]} />
        <meshStandardMaterial
          color="#795548"
          roughness={0.4}
          metalness={0.1}
          emissive="#3e2723"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Left Lobe */}
      <mesh position={[-0.8, -0.15, 0.1]} rotation={[0, 0, Math.PI / 2.4]} scale={[0.8, 1.1, 0.8]}>
        <coneGeometry args={[0.9, 1.5, 20]} />
        <meshStandardMaterial color="#6d4c41" roughness={0.45} />
      </mesh>

      {/* Falciform Ligament Divider */}
      <mesh position={[-0.1, 0.1, 0.9]} rotation={[0, 0, Math.PI / 8]}>
        <boxGeometry args={[0.04, 1.1, 0.3]} />
        <meshStandardMaterial color="#d7ccc8" roughness={0.3} />
      </mesh>

      {/* Gallbladder */}
      <mesh position={[0.1, -0.65, 0.6]} scale={[0.8, 1.4, 0.7]}>
        <sphereGeometry args={[0.3, 14, 14]} />
        <meshStandardMaterial color="#2e7d32" roughness={0.3} metalness={0.2} />
      </mesh>
    </group>
  );
}

// 3D Procedural Kidneys Mesh
function KidneysMesh() {
  return (
    <group>
      {/* Left Kidney */}
      <mesh position={[-1.1, 0, 0]} scale={[0.75, 1.35, 0.85]}>
        <sphereGeometry args={[0.75, 20, 20]} />
        <meshStandardMaterial
          color="#5d4037"
          roughness={0.35}
          metalness={0.1}
          emissive="#3e2723"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Right Kidney */}
      <mesh position={[1.1, -0.1, 0]} scale={[0.75, 1.35, 0.85]}>
        <sphereGeometry args={[0.75, 20, 20]} />
        <meshStandardMaterial
          color="#5d4037"
          roughness={0.35}
          metalness={0.1}
          emissive="#3e2723"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Aorta & Vena Cava */}
      <mesh position={[-0.18, 0, -0.1]}>
        <cylinderGeometry args={[0.15, 0.15, 2.4, 16]} />
        <meshStandardMaterial color="#c62828" roughness={0.3} />
      </mesh>
      <mesh position={[0.18, 0, -0.1]}>
        <cylinderGeometry args={[0.15, 0.15, 2.4, 16]} />
        <meshStandardMaterial color="#1565c0" roughness={0.3} />
      </mesh>

      {/* Ureters */}
      <mesh position={[-0.6, -1.0, 0]} rotation={[0, 0, -Math.PI / 12]}>
        <cylinderGeometry args={[0.06, 0.06, 1.6, 10]} />
        <meshStandardMaterial color="#fff59d" roughness={0.4} />
      </mesh>
      <mesh position={[0.6, -1.0, 0]} rotation={[0, 0, Math.PI / 12]}>
        <cylinderGeometry args={[0.06, 0.06, 1.6, 10]} />
        <meshStandardMaterial color="#fff59d" roughness={0.4} />
      </mesh>
    </group>
  );
}

// 3D Procedural Stomach Mesh
function StomachMesh({ motility = true }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (!meshRef.current || !motility) return;
    const t = clock.getElapsedTime();
    const wave = Math.sin(t * 2.0) * 0.03;
    meshRef.current.scale.set(1 + wave, 1 - wave, 1 + wave);
  });

  return (
    <group ref={meshRef}>
      {/* J-Curved Torus Body */}
      <mesh rotation={[0, 0, Math.PI * 0.7]}>
        <torusGeometry args={[0.9, 0.42, 20, 32, Math.PI * 0.9]} />
        <meshStandardMaterial
          color="#ffb74d"
          roughness={0.5}
          metalness={0.1}
          emissive="#e65100"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Fundus Dome */}
      <mesh position={[-0.55, 0.7, 0]} scale={[1.1, 0.9, 0.85]}>
        <sphereGeometry args={[0.65, 18, 16]} />
        <meshStandardMaterial color="#ffa726" roughness={0.5} />
      </mesh>

      {/* Esophagus Inlet */}
      <mesh position={[-0.38, 1.25, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.8, 14]} />
        <meshStandardMaterial color="#fb8c00" roughness={0.4} />
      </mesh>

      {/* Pylorus Exit */}
      <mesh position={[0.9, -0.38, 0]} rotation={[0, 0, Math.PI / 3]}>
        <cylinderGeometry args={[0.16, 0.18, 0.7, 14]} />
        <meshStandardMaterial color="#fb8c00" roughness={0.4} />
      </mesh>
    </group>
  );
}

export default function OrganViewer({
  organName = 'Heart',
  onOpenAR,
}) {
  const [bpm, setBpm] = useState(72);
  const [respRate, setRespRate] = useState(16);
  const [isBeating, setIsBeating] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showCrossSection, setShowCrossSection] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewMode, setViewMode] = useState('schematic'); // 'schematic' or 'scan'
  const [selectedLobe, setSelectedLobe] = useState(null);
  const controlsRef = useRef();

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleSoundToggle = () => {
    if (!soundEnabled) {
      heartbeatAudio.init();
    }
    setSoundEnabled((prev) => !prev);
  };

  const renderOrganMesh = () => {
    if (viewMode === 'scan') {
      return <RealisticOrganGLB modelName={organName} />;
    }

    switch (organName.toLowerCase()) {
      case 'heart':
        return (
          <HeartMesh
            bpm={bpm}
            isBeating={isBeating}
            soundEnabled={soundEnabled}
            showCrossSection={showCrossSection}
          />
        );
      case 'brain':
        return (
          <BrainMesh
            animated={isBeating}
            selectedLobe={selectedLobe}
            onSelectLobe={(lobe) => setSelectedLobe(lobe)}
          />
        );
      case 'lungs':
        return <LungsMesh respRate={respRate} animated={isBeating} />;
      case 'liver':
        return <LiverMesh />;
      case 'kidneys':
        return <KidneysMesh />;
      case 'stomach':
        return <StomachMesh motility={isBeating} />;
      default:
        return (
          <HeartMesh
            bpm={bpm}
            isBeating={isBeating}
            soundEnabled={soundEnabled}
            showCrossSection={showCrossSection}
          />
        );
    }
  };

  return (
    <div className="relative w-full h-[580px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col">
      {/* 3D Canvas */}
      <Suspense fallback={<ExperienceLoader message={`Loading 3D ${organName} Mesh...`} />}>
        <Canvas
          camera={{ position: [0, 0, 4.5], fov: 45 }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.75} />
          <directionalLight position={[10, 10, 10]} intensity={1.2} />
          <directionalLight position={[-10, -10, -5]} intensity={0.4} color="#80d8ff" />
          <pointLight position={[0, 3, 2]} intensity={0.6} color="#ffffff" />

          <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.2}>
            <Center>{renderOrganMesh()}</Center>
          </Float>

          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={autoRotate}
            autoRotateSpeed={1.0}
            minDistance={1.8}
            maxDistance={8.0}
          />
        </Canvas>
      </Suspense>

      {/* Floating Controls Bar (Top) */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-white pointer-events-auto shadow-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold">3D {organName} Interactive Simulation</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Mode Switcher */}
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

          <button
            type="button"
            onClick={() => setAutoRotate((prev) => !prev)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer backdrop-blur-md ${
              autoRotate
                ? 'bg-blue-600/80 text-white border-blue-500'
                : 'bg-slate-800/80 text-slate-300 border-slate-700'
            }`}
            title="Toggle Auto-Rotation"
          >
            {autoRotate ? '⏸ Pause Rotate' : '▶ Rotate'}
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

      {/* Organ-Specific Controls Panel (Bottom Left) */}
      <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/70 text-white max-w-xs shadow-xl pointer-events-auto">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Physiological Controls
        </span>

        {organName.toLowerCase() === 'heart' && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-medium">Heart Rate:</span>
                <span className="font-bold text-cyan-400">{bpm} BPM</span>
              </div>
              <input
                type="range"
                min="40"
                max="180"
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Bradycardia (40)</span>
                <span>Normal (72)</span>
                <span>Tachycardia (180)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSoundToggle}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                  soundEnabled
                    ? 'bg-emerald-600/80 text-white border-emerald-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <span>{soundEnabled ? '🔊' : '🔈'}</span>
                <span>Auscultation Sound</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCrossSection((prev) => !prev)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                  showCrossSection
                    ? 'bg-amber-600/80 text-white border-amber-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {showCrossSection ? 'Cross-Section On' : 'Cutaway View'}
              </button>
            </div>
          </div>
        )}

        {organName.toLowerCase() === 'brain' && (
          <div className="space-y-2">
            <span className="text-xs text-slate-300 block">
              Click any lobe to inspect neurological functions:
            </span>
            {selectedLobe ? (
              <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700 text-xs">
                <p className="font-bold text-cyan-300">{selectedLobe}</p>
                <p className="text-[11px] text-slate-300 mt-1">
                  {selectedLobe === 'Frontal Lobe' && 'Executive function, motor control, decision making, speech production (Broca area).'}
                  {selectedLobe === 'Parietal Lobe' && 'Somatosensory processing, spatial perception, tactile integration.'}
                  {selectedLobe === 'Temporal Lobe' && 'Auditory processing, memory retrieval (hippocampus), language comprehension (Wernicke area).'}
                  {selectedLobe === 'Occipital Lobe' && 'Primary visual cortex, visual-spatial processing and color recognition.'}
                  {selectedLobe === 'Cerebellum' && 'Motor coordination, fine movement calibration, procedural balance.'}
                  {selectedLobe === 'Brainstem' && 'Autonomic cardiorespiratory control, sleep cycles, cranial nerves.'}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">Select Frontal, Parietal, Temporal, or Occipital lobe above.</p>
            )}
          </div>
        )}

        {organName.toLowerCase() === 'lungs' && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-medium">Respiration Rate:</span>
                <span className="font-bold text-cyan-400">{respRate} breaths/min</span>
              </div>
              <input
                type="range"
                min="10"
                max="32"
                value={respRate}
                onChange={(e) => setRespRate(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        )}

        {['liver', 'kidneys', 'stomach'].includes(organName.toLowerCase()) && (
          <div>
            <p className="text-xs text-slate-300">
              Interactive 3D model with anatomical landmarks, arterial and venous supplies, and motility simulations.
            </p>
          </div>
        )}
      </div>

      {/* Landmark Tooltip (Bottom Right) */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 pointer-events-auto">
        <span>Drag to rotate &bull; Scroll to zoom &bull; Right-click to pan</span>
      </div>
    </div>
  );
}
