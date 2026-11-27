import { useRef } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// Hotspot Marker for clickable hospital areas
function HospitalHotspot({ position, title, subtitle, onClick }) {
  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color="#00e5ff"
          emissive="#00b0ff"
          emissiveIntensity={0.8}
          roughness={0.2}
        />
      </mesh>

      <Html distanceFactor={8} position={[0, 0.45, 0]} center>
        <div
          onClick={onClick}
          className="bg-slate-900/90 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-xl border border-cyan-400 shadow-lg whitespace-nowrap cursor-pointer hover:bg-[#0072CE] transition transform hover:scale-105"
        >
          <p className="font-bold text-[11px] text-cyan-300">{title}</p>
          {subtitle && <p className="text-[10px] text-slate-300">{subtitle}</p>}
        </div>
      </Html>
    </group>
  );
}

export default function HospitalScene({ onSelectZone }) {
  return (
    <group>
      {/* 1. Main Hospital Floor (18m x 16m) */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[18, 0.1, 16]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.25} metalness={0.1} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 3.8, 0]}>
        <boxGeometry args={[18, 0.1, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} />
      </mesh>

      {/* Perimeter Walls */}
      {/* Back Wall */}
      <mesh position={[0, 1.85, -8]}>
        <boxGeometry args={[18, 3.8, 0.2]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
      </mesh>
      {/* Front Wall */}
      <mesh position={[0, 1.85, 8]}>
        <boxGeometry args={[18, 3.8, 0.2]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
      </mesh>
      {/* Left Wall */}
      <mesh position={[-9, 1.85, 0]}>
        <boxGeometry args={[0.2, 3.8, 16]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
      </mesh>
      {/* Right Wall */}
      <mesh position={[9, 1.85, 0]}>
        <boxGeometry args={[0.2, 3.8, 16]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
      </mesh>

      {/* Interior Dividing Walls */}
      {/* Dividing Wall separating Consultation Room from Main Corridor */}
      <mesh position={[2.5, 1.85, -2]}>
        <boxGeometry args={[0.2, 3.8, 8]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
      </mesh>
      {/* Wall between Reception and Waiting Area */}
      <mesh position={[-3.5, 1.85, 2]}>
        <boxGeometry args={[7, 3.8, 0.2]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
      </mesh>

      {/* Overhead Fluorescent Light Panels */}
      {[-4, 0, 4].map((x) =>
        [-4, 0, 4].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 3.75, z]}>
            <boxGeometry args={[1.6, 0.05, 0.8]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={1.0}
            />
          </mesh>
        ))
      )}

      {/* ------------------------------------------------------------- */}
      {/* ZONE 1: RECEPTION & OPD CHECK-IN (Left Side, Z: -5 to -1) */}
      {/* ------------------------------------------------------------- */}
      {/* Reception Counter Desk */}
      <group position={[-5.5, 0, -4]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[4.2, 1.1, 1.2]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0, 1.12, 0]}>
          <boxGeometry args={[4.4, 0.06, 1.3]} />
          <meshStandardMaterial color="#ffffff" roughness={0.1} />
        </mesh>
        {/* Reception Sign on Front of Desk */}
        <mesh position={[0, 0.6, 0.61]}>
          <planeGeometry args={[2.8, 0.4]} />
          <meshStandardMaterial color="#0369a1" />
        </mesh>

        {/* Desktop Computers on Reception Counter */}
        {[-1.2, 1.2].map((xOffset, i) => (
          <group key={i} position={[xOffset, 1.2, 0.1]}>
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[0.6, 0.4, 0.05]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.04, 0.08, 0.1, 8]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
          </group>
        ))}

        {/* Hotspot */}
        <HospitalHotspot
          position={[0, 1.7, 0]}
          title="Reception Desk"
          subtitle="Click to approach check-in counter"
          onClick={() => onSelectZone && onSelectZone('reception')}
        />
      </group>

      {/* Brand Sign on Wall behind Reception */}
      <group position={[-5.5, 2.6, -7.88]}>
        <mesh>
          <planeGeometry args={[4.2, 1.0]} />
          <meshStandardMaterial color="#0072CE" roughness={0.2} />
        </mesh>
        <Html position={[0, 0, 0.02]} center>
          <div className="text-white font-black text-sm tracking-wide text-center uppercase select-none whitespace-nowrap">
            🏥 MediFlow AI Smart Hospital
            <p className="text-[9px] font-bold text-blue-200">Outpatient Services &bull; OPD Wing</p>
          </div>
        </Html>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* ZONE 2: PATIENT WAITING LOUNGE (Left-Front, Z: 3 to 7) */}
      {/* ------------------------------------------------------------- */}
      <group position={[-5.5, 0, 4.5]}>
        {/* Rows of Waiting Chairs */}
        {[-1.8, 0, 1.8].map((zRow, idx) => (
          <group key={idx} position={[0, 0, zRow]}>
            {/* Bench Frame */}
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[3.4, 0.1, 0.7]} />
              <meshStandardMaterial color="#0284c7" roughness={0.5} />
            </mesh>
            {/* Backrest */}
            <mesh position={[0, 0.85, -0.32]}>
              <boxGeometry args={[3.4, 0.7, 0.08]} />
              <meshStandardMaterial color="#0369a1" roughness={0.5} />
            </mesh>
            {/* Legs */}
            {[-1.5, 1.5].map((xLeg, lIdx) => (
              <mesh key={lIdx} position={[xLeg, 0.2, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
                <meshStandardMaterial color="#64748b" metalness={0.7} />
              </mesh>
            ))}
          </group>
        ))}

        {/* Hotspot */}
        <HospitalHotspot
          position={[0, 1.6, 0]}
          title="Waiting Lounge"
          subtitle="Patient seating & display monitors"
          onClick={() => onSelectZone && onSelectZone('waiting')}
        />
      </group>

      {/* Health Info Poster on Side Wall */}
      <group position={[-8.88, 2.2, 4.5]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[2.2, 1.4]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <Html position={[0, 0, 0.02]} center>
          <div className="bg-white text-slate-800 p-2 text-center rounded w-48 shadow select-none">
            <h6 className="font-bold text-[10px] text-[#0072CE] uppercase">Preventive Health Guide</h6>
            <p className="text-[8px] text-slate-500 mt-1">
              Regular cardiac check-ups reduce risk by 60%. Consult a specialist today.
            </p>
          </div>
        </Html>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* ZONE 3: DOCTOR CONSULTATION SUITE (Right Side, Z: -6 to 0) */}
      {/* ------------------------------------------------------------- */}
      <group position={[5.8, 0, -4]}>
        {/* Doctor Executive Desk */}
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[2.8, 0.8, 1.4]} />
          <meshStandardMaterial color="#475569" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.82, 0]}>
          <boxGeometry args={[3.0, 0.05, 1.5]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.1} />
        </mesh>

        {/* Doctor Chair */}
        <mesh position={[0, 0.6, -1.0]}>
          <boxGeometry args={[0.6, 0.9, 0.6]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>

        {/* Patient Chair */}
        <mesh position={[0, 0.5, 1.1]}>
          <boxGeometry args={[0.55, 0.8, 0.55]} />
          <meshStandardMaterial color="#0284c7" roughness={0.4} />
        </mesh>

        {/* Laptop on Desk */}
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.45, 0.03, 0.32]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
        </mesh>
        <mesh position={[0, 1.05, -0.15]} rotation={[Math.PI / 6, 0, 0]}>
          <boxGeometry args={[0.45, 0.28, 0.02]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Hotspot */}
        <HospitalHotspot
          position={[0, 1.6, 0]}
          title="Doctor Consultation Suite"
          subtitle="Room 101: Clinical Consultation"
          onClick={() => onSelectZone && onSelectZone('consultation')}
        />
      </group>

      {/* ------------------------------------------------------------- */}
      {/* ZONE 4: PATIENT EXAMINATION BED & ECG (Right Side, Z: 2 to 7) */}
      {/* ------------------------------------------------------------- */}
      <group position={[5.8, 0, 4.5]}>
        {/* Examination Bed */}
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[1.5, 0.65, 2.6]} />
          <meshStandardMaterial color="#0284c7" roughness={0.4} />
        </mesh>
        {/* Bed Mattress & Pillow */}
        <mesh position={[0, 0.82, 0]}>
          <boxGeometry args={[1.4, 0.12, 2.5]} />
          <meshStandardMaterial color="#ffffff" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.94, -0.9]}>
          <boxGeometry args={[1.1, 0.12, 0.5]} />
          <meshStandardMaterial color="#e0f2fe" roughness={0.7} />
        </mesh>

        {/* ECG Vital Signs Stand */}
        <group position={[-1.2, 0, -0.5]}>
          <mesh position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.7, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} />
          </mesh>
          {/* ECG Monitor Box */}
          <mesh position={[0, 1.6, 0]}>
            <boxGeometry args={[0.65, 0.45, 0.15]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} />
          </mesh>
          {/* ECG Glowing Screen */}
          <mesh position={[0, 1.6, 0.08]}>
            <planeGeometry args={[0.55, 0.36]} />
            <meshStandardMaterial
              color="#00e676"
              emissive="#00e676"
              emissiveIntensity={0.6}
            />
          </mesh>
        </group>

        {/* IV Drip Pole */}
        <group position={[1.1, 0, -0.8]}>
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 2.0, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
          <mesh position={[0, 1.85, 0]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color="#bae6fd" transparent opacity={0.6} />
          </mesh>
        </group>

        {/* Hotspot */}
        <HospitalHotspot
          position={[0, 1.6, 0]}
          title="Patient Examination Area"
          subtitle="Clinical exam table & vital telemetry"
          onClick={() => onSelectZone && onSelectZone('exam')}
        />
      </group>

      {/* Directional Corridor Signs */}
      <group position={[0, 3.1, 0]}>
        <mesh>
          <boxGeometry args={[3.2, 0.5, 0.1]} />
          <meshStandardMaterial color="#0369a1" roughness={0.3} />
        </mesh>
        <Html position={[0, 0, 0.06]} center>
          <div className="text-white text-[10px] font-black uppercase tracking-wider text-center select-none whitespace-nowrap">
            ← OPD Reception &bull; Consultation Suites →
          </div>
        </Html>
      </group>
    </group>
  );
}
