import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Float } from '@react-three/drei';
import * as THREE from 'three';

// Synthesized heartbeat audio helper
function playStethoscopeBeat() {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(70, now);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.15);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

// Live ECG Screen with animated waveform
function LiveECGScreen() {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulse((prev) => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  return (
    <Html distanceFactor={4} position={[0, 0, 0.06]} center transform>
      <div className="w-56 h-36 bg-slate-950 p-2.5 rounded-lg border border-slate-700 font-mono text-emerald-400 select-none shadow-inner flex flex-col justify-between">
        <div className="flex justify-between items-center text-[10px] border-b border-emerald-900/60 pb-1">
          <span className="font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            ECG LEAD II
          </span>
          <span className="font-black text-xs text-white">72 BPM</span>
        </div>

        {/* Animated Simulated Waveform Canvas */}
        <div className="relative w-full h-14 overflow-hidden border-y border-emerald-900/40 my-1 bg-emerald-950/20">
          <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#00e676"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,20 30,20 40,20 45,15 50,22 55,5 60,35 65,20 75,20 85,20 100,20 130,20 140,20 145,15 150,22 155,5 160,35 165,20 175,20 185,20 200,20"
              style={{
                strokeDasharray: 200,
                strokeDashoffset: (pulse * -4) % 200,
              }}
            />
          </svg>
        </div>

        <div className="flex justify-between items-center text-[9px] text-slate-300">
          <span>SpO2: <strong className="text-cyan-300">98%</strong></span>
          <span>NIBP: <strong className="text-yellow-300">118/76</strong></span>
          <span>RESP: <strong className="text-emerald-300">16/m</strong></span>
        </div>
      </div>
    </Html>
  );
}

export default function ConsultationRoom({ onInspectEquipment }) {
  const [activeItem, setActiveItem] = useState(null);
  const [audioFeedback, setAudioFeedback] = useState(false);

  const handleEquipmentClick = (item) => {
    setActiveItem(item);
    if (item === 'Stethoscope') {
      playStethoscopeBeat();
      setAudioFeedback(true);
      setTimeout(() => setAudioFeedback(false), 2000);
    }
    if (onInspectEquipment) onInspectEquipment(item);
  };

  return (
    <div className="relative w-full h-[580px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col">
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 2.0, 4.8], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 8, 5]} intensity={1.2} />
        <directionalLight position={[-6, -4, -4]} intensity={0.4} color="#80d8ff" />
        <pointLight position={[0, 3, 0]} intensity={0.8} />

        {/* Room Floor */}
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[10, 0.1, 9]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.3} />
        </mesh>

        {/* Walls */}
        <mesh position={[0, 2, -4.5]}>
          <boxGeometry args={[10, 4, 0.1]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
        </mesh>
        <mesh position={[-5, 2, 0]}>
          <boxGeometry args={[0.1, 4, 9]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
        </mesh>
        <mesh position={[5, 2, 0]}>
          <boxGeometry args={[0.1, 4, 9]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
        </mesh>

        {/* Doctor Consultation Desk */}
        <group position={[-1.2, 0, -1.5]}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[2.4, 0.9, 1.2]} />
            <meshStandardMaterial color="#334155" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.92, 0]}>
            <boxGeometry args={[2.5, 0.05, 1.3]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.1} />
          </mesh>

          {/* Doctor Chair */}
          <mesh position={[0, 0.65, -0.9]}>
            <boxGeometry args={[0.6, 1.0, 0.6]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>

          {/* Patient Chair */}
          <mesh position={[0, 0.55, 1.0]}>
            <boxGeometry args={[0.55, 0.8, 0.55]} />
            <meshStandardMaterial color="#0284c7" />
          </mesh>

          {/* Stethoscope on Desk */}
          <group
            position={[0.5, 0.96, 0.2]}
            onClick={(e) => {
              e.stopPropagation();
              handleEquipmentClick('Stethoscope');
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = 'auto')}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.12, 0.03, 12, 24]} />
              <meshStandardMaterial color="#0f172a" metalness={0.7} />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
            </mesh>
            <Html distanceFactor={4} position={[0, 0.2, 0]} center>
              <div className="bg-slate-900/90 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded border border-cyan-400 whitespace-nowrap">
                🩺 Stethoscope (Click)
              </div>
            </Html>
          </group>
        </group>

        {/* Examination Bed */}
        <group position={[2.4, 0, -1.0]}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[1.3, 0.65, 2.5]} />
            <meshStandardMaterial color="#0284c7" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.82, 0]}>
            <boxGeometry args={[1.2, 0.1, 2.4]} />
            <meshStandardMaterial color="#ffffff" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.92, -0.8]}>
            <boxGeometry args={[0.9, 0.1, 0.5]} />
            <meshStandardMaterial color="#bae6fd" roughness={0.6} />
          </mesh>
        </group>

        {/* Interactive Vital Signs / ECG Monitor Stand */}
        <group position={[1.4, 0, -2.6]}>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.8, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
          </mesh>
          <mesh
            position={[0, 1.7, 0]}
            onClick={(e) => {
              e.stopPropagation();
              handleEquipmentClick('ECG Monitor');
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = 'auto')}
          >
            <boxGeometry args={[0.8, 0.55, 0.1]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} />
          </mesh>
          <group position={[0, 1.7, 0]}>
            <LiveECGScreen />
          </group>
        </group>

        {/* Sphygmomanometer (BP Cuff) on Stand */}
        <group
          position={[-2.8, 0.95, -1.5]}
          onClick={(e) => {
            e.stopPropagation();
            handleEquipmentClick('Sphygmomanometer');
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = 'auto')}
        >
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.25, 0.35, 0.2]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, 0.15, 0.11]}>
            <circleGeometry args={[0.08, 16]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <Html distanceFactor={4} position={[0, 0.35, 0]} center>
            <div className="bg-slate-900/90 text-yellow-300 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-400 whitespace-nowrap">
              🩹 BP Monitor
            </div>
          </Html>
        </group>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1.8}
          maxDistance={7.0}
          target={[0, 1.0, -1.0]}
        />
      </Canvas>

      {/* Floating Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-white pointer-events-auto shadow-xs">
          <span className="text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Simulated Doctor Consultation Chamber
          </span>
        </div>

        {audioFeedback && (
          <div className="bg-rose-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-lg animate-bounce pointer-events-auto">
            🔊 Stethoscope Auscultation Pulse: 72 BPM
          </div>
        )}
      </div>

      {/* Equipment Detail Drawer (Bottom) */}
      <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {activeItem === 'Stethoscope'
              ? '🩺'
              : activeItem === 'ECG Monitor'
              ? '📈'
              : activeItem === 'Sphygmomanometer'
              ? '🩹'
              : '👨‍⚕️'}
          </span>
          <div>
            <h5 className="text-xs font-bold text-cyan-300">
              {activeItem
                ? `Inspecting: ${activeItem}`
                : 'Click any medical instrument in the room to inspect'}
            </h5>
            <p className="text-[11px] text-slate-300">
              {activeItem === 'Stethoscope'
                ? 'Used for cardiac auscultation and pulmonary lung sound assessment.'
                : activeItem === 'ECG Monitor'
                ? 'Multi-parameter patient monitor showing real-time Lead-II telemetry, SpO2, and NIBP.'
                : activeItem === 'Sphygmomanometer'
                ? 'Aneroid blood pressure monitor for measuring arterial systolic/diastolic pressure.'
                : 'Doctor examination suite for outpatient medical diagnosis.'}
            </p>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 italic shrink-0">
          ⚠️ Educational simulation only. Does not replace actual medical consultation.
        </div>
      </div>
    </div>
  );
}
