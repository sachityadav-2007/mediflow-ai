import fs from 'fs';
import path from 'path';
import * as THREE from '../frontend/node_modules/three/build/three.module.js';

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
  };
}

import { GLTFExporter } from '../frontend/node_modules/three/examples/jsm/exporters/GLTFExporter.js';

const OUTPUT_DIR = path.resolve('frontend/public/models');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function exportSceneToGLB(scene, filename) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (glb) => {
        const filePath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filePath, Buffer.from(glb));
        console.log(`Exported ${filename} (${(glb.byteLength / 1024).toFixed(1)} KB)`);
        resolve(filePath);
      },
      (error) => {
        console.error(`Error exporting ${filename}:`, error);
        reject(error);
      },
      { binary: true }
    );
  });
}

// -----------------------------------------------------------------------------
// 1. FULL BODY ANATOMY WITH MULTI-SYSTEM LAYERS
// -----------------------------------------------------------------------------
function createAnatomyBody() {
  const root = new THREE.Group();
  root.name = 'HumanAnatomyModel';

  // --- SKELETAL SYSTEM ---
  const skeletal = new THREE.Group();
  skeletal.name = 'SkeletalSystem';
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc, roughness: 0.45, metalness: 0.1 });

  // Cranium / Skull
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 20), boneMat);
  skull.position.set(0, 1.88, 0);
  skull.scale.set(0.9, 1.05, 1.0);
  skeletal.add(skull);

  // Mandible / Jaw
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.15), boneMat);
  jaw.position.set(0, 1.74, 0.08);
  skeletal.add(jaw);

  // Vertebral Column (Cervical, Thoracic, Lumbar)
  for (let i = 0; i < 22; i++) {
    const y = 1.7 - i * 0.045;
    const vertebra = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), boneMat);
    vertebra.position.set(0, y, -0.06);
    vertebra.rotation.x = Math.PI / 2;
    skeletal.add(vertebra);
  }

  // Sternum (Breastbone)
  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.02), boneMat);
  sternum.position.set(0, 1.32, 0.18);
  skeletal.add(sternum);

  // Rib Cage (10 pairs of curved costal ribs)
  for (let i = 0; i < 8; i++) {
    const y = 1.48 - i * 0.045;
    const radius = 0.22 - i * 0.008;
    const ribGeo = new THREE.TorusGeometry(radius, 0.012, 8, 24, Math.PI * 1.6);
    const ribLeft = new THREE.Mesh(ribGeo, boneMat);
    ribLeft.position.set(0, y, 0.04);
    ribLeft.rotation.x = Math.PI / 2;
    skeletal.add(ribLeft);
  }

  // Clavicles (Collar bones)
  const clavicleL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 8), boneMat);
  clavicleL.position.set(0.16, 1.6, 0.08);
  clavicleL.rotation.z = -Math.PI / 8;
  const clavicleR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 8), boneMat);
  clavicleR.position.set(-0.16, 1.6, 0.08);
  clavicleR.rotation.z = Math.PI / 8;
  skeletal.add(clavicleL);
  skeletal.add(clavicleR);

  // Pelvic Girdle
  const pelvisL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.14), boneMat);
  pelvisL.position.set(0.14, 0.78, 0);
  const pelvisR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.14), boneMat);
  pelvisR.position.set(-0.14, 0.78, 0);
  skeletal.add(pelvisL);
  skeletal.add(pelvisR);

  // Limb Bones
  const armBoneGeo = new THREE.CylinderGeometry(0.025, 0.022, 0.45, 8);
  const humerusL = new THREE.Mesh(armBoneGeo, boneMat);
  humerusL.position.set(0.38, 1.35, 0);
  const humerusR = new THREE.Mesh(armBoneGeo, boneMat);
  humerusR.position.set(-0.38, 1.35, 0);
  skeletal.add(humerusL);
  skeletal.add(humerusR);

  const legBoneGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.65, 8);
  const femurL = new THREE.Mesh(legBoneGeo, boneMat);
  femurL.position.set(0.16, 0.42, 0);
  const femurR = new THREE.Mesh(legBoneGeo, boneMat);
  femurR.position.set(-0.16, 0.42, 0);
  skeletal.add(femurL);
  skeletal.add(femurR);

  root.add(skeletal);

  // --- CIRCULATORY SYSTEM (Arteries & Veins) ---
  const circulatory = new THREE.Group();
  circulatory.name = 'CirculatorySystem';
  const arteryMat = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.3 });
  const veinMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.3 });

  // Aortic Arch & Descending Aorta
  const aortaArch = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 10, 20, Math.PI * 0.9), arteryMat);
  aortaArch.position.set(0.02, 1.38, 0.06);
  aortaArch.rotation.z = -Math.PI / 4;
  circulatory.add(aortaArch);

  const descAorta = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.65, 10), arteryMat);
  descAorta.position.set(-0.02, 1.05, -0.02);
  circulatory.add(descAorta);

  // Vena Cava
  const venaCava = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.68, 10), veinMat);
  venaCava.position.set(0.03, 1.08, -0.02);
  circulatory.add(venaCava);

  // Carotid and Jugular to Head
  const carotidL = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.28, 8), arteryMat);
  carotidL.position.set(0.06, 1.62, 0.02);
  const jugularR = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.28, 8), veinMat);
  jugularR.position.set(-0.06, 1.62, 0.02);
  circulatory.add(carotidL);
  circulatory.add(jugularR);

  root.add(circulatory);

  // --- VISCERAL INTERNAL ORGANS ---
  const organs = new THREE.Group();
  organs.name = 'InternalOrgans';

  // Heart
  const heart = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.13, 2),
    new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.3, emissive: 0x5c0000, emissiveIntensity: 0.2 })
  );
  heart.name = 'Heart';
  heart.position.set(-0.06, 1.28, 0.08);
  heart.scale.set(0.85, 1.1, 0.9);
  organs.add(heart);

  // Brain
  const brain = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xf48fb1, roughness: 0.5, emissive: 0x880e4f, emissiveIntensity: 0.15 })
  );
  brain.name = 'Brain';
  brain.position.set(0, 1.88, 0);
  organs.add(brain);

  // Lungs
  const lungMat = new THREE.MeshStandardMaterial({ color: 0xef9a9a, roughness: 0.5, emissive: 0xb71c1c, emissiveIntensity: 0.1 });
  const lungL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.32, 10, 16), lungMat);
  lungL.name = 'Lungs';
  lungL.position.set(0.16, 1.28, 0.03);
  const lungR = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.34, 10, 16), lungMat);
  lungR.name = 'Lungs';
  lungR.position.set(-0.17, 1.28, 0.03);
  organs.add(lungL);
  organs.add(lungR);

  // Liver
  const liver = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.15, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.45, emissive: 0x3e2723, emissiveIntensity: 0.15 })
  );
  liver.name = 'Liver';
  liver.position.set(0.12, 1.05, 0.06);
  organs.add(liver);

  // Stomach
  const stomach = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.06, 12, 20, Math.PI * 0.9),
    new THREE.MeshStandardMaterial({ color: 0xffb74d, roughness: 0.5, emissive: 0xe65100, emissiveIntensity: 0.15 })
  );
  stomach.name = 'Stomach';
  stomach.position.set(-0.1, 1.02, 0.08);
  stomach.rotation.z = Math.PI * 0.6;
  organs.add(stomach);

  // Kidneys
  const kidneyMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.4 });
  const kidneyL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 14), kidneyMat);
  kidneyL.name = 'Kidneys';
  kidneyL.position.set(-0.13, 0.92, -0.05);
  kidneyL.scale.set(0.8, 1.3, 0.8);
  const kidneyR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 14), kidneyMat);
  kidneyR.name = 'Kidneys';
  kidneyR.position.set(0.13, 0.92, -0.05);
  kidneyR.scale.set(0.8, 1.3, 0.8);
  organs.add(kidneyL);
  organs.add(kidneyR);

  // Intestines
  const colonMat = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.55 });
  const colon = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 12, 24, Math.PI * 1.8), colonMat);
  colon.position.set(0, 0.82, 0.06);
  colon.rotation.z = Math.PI;
  organs.add(colon);

  root.add(organs);

  // --- TRANSLUCENT EPIDERMAL SKIN SHELL ---
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x64b5f6,
    transparent: true,
    opacity: 0.35,
    roughness: 0.3,
    metalness: 0.1,
  });

  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.26, 1.15, 20), skinMat);
  torso.position.set(0, 1.25, 0);
  root.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 20), skinMat);
  head.position.set(0, 1.88, 0);
  root.add(head);

  // Arms
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.9, 12), skinMat);
  armL.position.set(0.46, 1.25, 0);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.9, 12), skinMat);
  armR.position.set(-0.46, 1.25, 0);
  root.add(armL);
  root.add(armR);

  // Legs
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 1.15, 14), skinMat);
  legL.position.set(0.18, 0.15, 0);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 1.15, 14), skinMat);
  legR.position.set(-0.18, 0.15, 0);
  root.add(legL);
  root.add(legR);

  return root;
}

// -----------------------------------------------------------------------------
// 2. DETAILED MULTI-CHAMBER CARDIAC MODEL
// -----------------------------------------------------------------------------
function createHeartModel() {
  const root = new THREE.Group();
  root.name = 'HumanHeart';

  const muscleMat = new THREE.MeshStandardMaterial({
    color: 0xb71c1c,
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0x5c0000,
    emissiveIntensity: 0.25,
  });
  const arteryMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.3, metalness: 0.15 });
  const veinMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.3, metalness: 0.15 });
  const coronaryMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.2 });

  // Left Ventricle (forming apex, thick myocardium)
  const leftVentricle = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.0, 20), muscleMat);
  leftVentricle.position.set(-0.15, -0.2, 0);
  leftVentricle.rotation.z = Math.PI * 0.9;
  leftVentricle.scale.set(0.9, 1.1, 0.9);
  root.add(leftVentricle);

  // Right Ventricle (anterior to left ventricle)
  const rightVentricle = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.85, 20), muscleMat);
  rightVentricle.position.set(0.2, -0.1, 0.12);
  rightVentricle.rotation.z = Math.PI * 0.85;
  root.add(rightVentricle);

  // Left Atrium (posterior superior)
  const leftAtrium = new THREE.Mesh(new THREE.SphereGeometry(0.35, 18, 16), muscleMat);
  leftAtrium.position.set(-0.25, 0.45, -0.1);
  root.add(leftAtrium);

  // Right Atrium
  const rightAtrium = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 16), muscleMat);
  rightAtrium.position.set(0.32, 0.4, 0.05);
  root.add(rightAtrium);

  // Ascending Aorta & Aortic Arch
  const aortaArch = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.11, 16, 28, Math.PI * 0.9), arteryMat);
  aortaArch.position.set(-0.02, 0.65, 0.04);
  aortaArch.rotation.z = -Math.PI / 5;
  root.add(aortaArch);

  // 3 Brachiocephalic Branches from Aortic Arch
  [-0.1, 0.02, 0.14].forEach((x, i) => {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.35, 10), arteryMat);
    branch.position.set(x, 1.05, 0.02);
    branch.rotation.z = -Math.PI / 16 * (i - 1);
    root.add(branch);
  });

  // Pulmonary Trunk & Bifurcation
  const pulmonaryTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 14), veinMat);
  pulmonaryTrunk.position.set(0.12, 0.5, 0.22);
  pulmonaryTrunk.rotation.z = Math.PI / 4;
  root.add(pulmonaryTrunk);

  // Superior Vena Cava
  const svc = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.75, 12), veinMat);
  svc.position.set(0.42, 0.8, -0.05);
  root.add(svc);

  // Inferior Vena Cava
  const ivc = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 12), veinMat);
  ivc.position.set(0.35, -0.45, -0.15);
  root.add(ivc);

  // Coronary Sulcus Arterial Branch running down anterior groove
  const coronaryArtery = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.025, 8, 20, Math.PI * 0.7), coronaryMat);
  coronaryArtery.position.set(0.05, -0.05, 0.24);
  coronaryArtery.rotation.z = Math.PI * 0.4;
  root.add(coronaryArtery);

  return root;
}

// -----------------------------------------------------------------------------
// 3. DETAILED CEREBRAL BRAIN MODEL
// -----------------------------------------------------------------------------
function createBrainModel() {
  const root = new THREE.Group();
  root.name = 'HumanBrain';

  const cortexMat = new THREE.MeshStandardMaterial({
    color: 0xf48fb1,
    roughness: 0.55,
    metalness: 0.05,
    emissive: 0x880e4f,
    emissiveIntensity: 0.15,
  });

  // Dual Cerebral Hemispheres with Sulcal/Gyral Convolutions
  const leftCerebrum = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 20), cortexMat);
  leftCerebrum.position.set(-0.25, 0.22, 0);
  leftCerebrum.scale.set(0.72, 0.88, 1.15);
  root.add(leftCerebrum);

  const rightCerebrum = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 20), cortexMat);
  rightCerebrum.position.set(0.25, 0.22, 0);
  rightCerebrum.scale.set(0.72, 0.88, 1.15);
  root.add(rightCerebrum);

  // Longitudinal Cerebral Fissure groove divider
  const fissure = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: 0xad1457, roughness: 0.6 }));
  fissure.position.set(0, 0.25, 0);
  root.add(fissure);

  // Cerebellum (Left & Right folia lobes)
  const cerebMat = new THREE.MeshStandardMaterial({ color: 0xad1457, roughness: 0.65 });
  const cerebL = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 16), cerebMat);
  cerebL.position.set(-0.2, -0.35, -0.38);
  cerebL.scale.set(1.1, 0.85, 0.9);
  const cerebR = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 16), cerebMat);
  cerebR.position.set(0.2, -0.35, -0.38);
  cerebR.scale.set(1.1, 0.85, 0.9);
  root.add(cerebL);
  root.add(cerebR);

  // Brainstem: Midbrain, Pons, Medulla Oblongata
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xd81b60, roughness: 0.4 });
  const pons = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), stemMat);
  pons.position.set(0, -0.32, -0.05);
  pons.scale.set(1.1, 0.9, 1.0);
  root.add(pons);

  const medulla = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.55, 14), stemMat);
  medulla.position.set(0, -0.65, -0.08);
  root.add(medulla);

  return root;
}

// -----------------------------------------------------------------------------
// 4. DETAILED RESPIRATORY LUNGS MODEL
// -----------------------------------------------------------------------------
function createLungsModel() {
  const root = new THREE.Group();
  root.name = 'HumanLungs';

  const lungMat = new THREE.MeshStandardMaterial({
    color: 0xef5350,
    roughness: 0.5,
    emissive: 0xb71c1c,
    emissiveIntensity: 0.15,
  });
  const airwayMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.35 });

  // Trachea with segmented cartilage rings
  const trachea = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.85, 16), airwayMat);
  trachea.position.set(0, 0.85, 0);
  root.add(trachea);

  for (let i = 0; i < 7; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.015, 8, 20), airwayMat);
    ring.position.set(0, 0.55 + i * 0.09, 0);
    ring.rotation.x = Math.PI / 2;
    root.add(ring);
  }

  // Carina and Primary Bronchi
  const bronchusL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.45, 12), airwayMat);
  bronchusL.position.set(0.18, 0.38, 0);
  bronchusL.rotation.z = -Math.PI / 3.5;
  const bronchusR = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.42, 12), airwayMat);
  bronchusR.position.set(-0.18, 0.38, 0);
  bronchusR.rotation.z = Math.PI / 3.5;
  root.add(bronchusL);
  root.add(bronchusR);

  // Right Lung (3 lobes: Superior, Middle, Inferior)
  const rightSupLobe = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 16), lungMat);
  rightSupLobe.position.set(-0.52, 0.32, 0);
  rightSupLobe.scale.set(0.85, 1.0, 0.9);
  const rightMidLobe = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 16), lungMat);
  rightMidLobe.position.set(-0.54, -0.05, 0.05);
  rightMidLobe.scale.set(0.9, 0.8, 0.9);
  const rightInfLobe = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.65, 18), lungMat);
  rightInfLobe.position.set(-0.52, -0.42, 0);
  rightInfLobe.rotation.z = Math.PI;
  root.add(rightSupLobe);
  root.add(rightMidLobe);
  root.add(rightInfLobe);

  // Left Lung (2 lobes with Cardiac Notch)
  const leftSupLobe = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 16), lungMat);
  leftSupLobe.position.set(0.52, 0.28, 0);
  leftSupLobe.scale.set(0.82, 1.1, 0.88);
  const leftInfLobe = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.72, 18), lungMat);
  leftInfLobe.position.set(0.52, -0.38, 0);
  leftInfLobe.rotation.z = Math.PI;
  root.add(leftSupLobe);
  root.add(leftInfLobe);

  return root;
}

// -----------------------------------------------------------------------------
// 5. DETAILED HEPATIC LIVER MODEL
// -----------------------------------------------------------------------------
function createLiverModel() {
  const root = new THREE.Group();
  root.name = 'HumanLiver';

  const liverMat = new THREE.MeshStandardMaterial({
    color: 0x795548,
    roughness: 0.42,
    metalness: 0.08,
    emissive: 0x3e2723,
    emissiveIntensity: 0.18,
  });

  // Large Right Lobe (convex diaphragmatic surface)
  const rightLobe = new THREE.Mesh(new THREE.SphereGeometry(0.68, 24, 20), liverMat);
  rightLobe.position.set(0.24, 0.08, 0);
  rightLobe.scale.set(1.25, 0.85, 0.95);
  root.add(rightLobe);

  // Left Lobe (tapering wedge)
  const leftLobe = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.95, 20), liverMat);
  leftLobe.position.set(-0.48, -0.05, 0.06);
  leftLobe.rotation.z = Math.PI / 2.3;
  leftLobe.scale.set(0.85, 1.0, 0.75);
  root.add(leftLobe);

  // Falciform Ligament divider
  const falciform = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.75, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xa1887f, roughness: 0.5 })
  );
  falciform.position.set(-0.06, 0.12, 0.42);
  root.add(falciform);

  // Gallbladder (pear-shaped organ with cystic duct)
  const gallMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.3, metalness: 0.15 });
  const gallbladder = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), gallMat);
  gallbladder.position.set(0.12, -0.42, 0.28);
  gallbladder.scale.set(0.8, 1.45, 0.75);
  root.add(gallbladder);

  const cysticDuct = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8), gallMat);
  cysticDuct.position.set(0.08, -0.22, 0.22);
  cysticDuct.rotation.z = -Math.PI / 4;
  root.add(cysticDuct);

  // Portal Triad (Hepatic Artery, Portal Vein, Common Bile Duct)
  const portalVein = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.35, 10), new THREE.MeshStandardMaterial({ color: 0x1565c0 }));
  portalVein.position.set(-0.02, -0.28, -0.05);
  root.add(portalVein);

  return root;
}

// -----------------------------------------------------------------------------
// 6. DETAILED RENAL KIDNEYS & CROSS-SECTION
// -----------------------------------------------------------------------------
function createKidneysModel() {
  const root = new THREE.Group();
  root.name = 'HumanKidneys';

  const kidneyMat = new THREE.MeshStandardMaterial({
    color: 0x5d4037,
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0x3e2723,
    emissiveIntensity: 0.2,
  });

  // Left Kidney
  const kidneyL = new THREE.Mesh(new THREE.SphereGeometry(0.48, 22, 20), kidneyMat);
  kidneyL.position.set(-0.75, 0.05, 0);
  kidneyL.scale.set(0.72, 1.35, 0.82);
  root.add(kidneyL);

  // Right Kidney
  const kidneyR = new THREE.Mesh(new THREE.SphereGeometry(0.48, 22, 20), kidneyMat);
  kidneyR.position.set(0.75, -0.08, 0);
  kidneyR.scale.set(0.72, 1.35, 0.82);
  root.add(kidneyR);

  // Central Abdominal Aorta & Inferior Vena Cava
  const arteryMat = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.3 });
  const veinMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.3 });

  const aorta = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.8, 14), arteryMat);
  aorta.position.set(-0.12, 0, -0.06);
  root.add(aorta);

  const vCava = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 14), veinMat);
  vCava.position.set(0.14, 0, -0.06);
  root.add(vCava);

  // Left & Right Renal Arteries/Veins
  const lRenalA = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 10), arteryMat);
  lRenalA.position.set(-0.42, 0.1, -0.02);
  lRenalA.rotation.z = Math.PI / 2;
  const rRenalV = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.65, 10), veinMat);
  rRenalV.position.set(0.45, -0.05, -0.02);
  rRenalV.rotation.z = Math.PI / 2;
  root.add(lRenalA);
  root.add(rRenalV);

  // Ureters funneling from renal pelvis to bladder
  const ureterMat = new THREE.MeshStandardMaterial({ color: 0xfff59d, roughness: 0.4 });
  const ureterL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 1.2, 10), ureterMat);
  ureterL.position.set(-0.48, -0.72, 0.02);
  ureterL.rotation.z = -Math.PI / 14;
  const ureterR = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 1.2, 10), ureterMat);
  ureterR.position.set(0.48, -0.75, 0.02);
  ureterR.rotation.z = Math.PI / 14;
  root.add(ureterL);
  root.add(ureterR);

  return root;
}

// -----------------------------------------------------------------------------
// 7. DETAILED GASTRIC STOMACH MODEL
// -----------------------------------------------------------------------------
function createStomachModel() {
  const root = new THREE.Group();
  root.name = 'HumanStomach';

  const stomachMat = new THREE.MeshStandardMaterial({
    color: 0xffb74d,
    roughness: 0.48,
    metalness: 0.08,
    emissive: 0xe65100,
    emissiveIntensity: 0.18,
  });

  // J-Curved Gastric Corpus (Body)
  const body = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.25, 20, 32, Math.PI * 0.92), stomachMat);
  body.rotation.z = Math.PI * 0.72;
  root.add(body);

  // Fundus Dome (Superior expansion)
  const fundus = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 18), stomachMat);
  fundus.position.set(-0.35, 0.48, 0);
  fundus.scale.set(1.12, 0.92, 0.88);
  root.add(fundus);

  // Cardia / Lower Esophageal Entrance
  const inletMat = new THREE.MeshStandardMaterial({ color: 0xffa726, roughness: 0.4 });
  const inlet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.55, 14), inletMat);
  inlet.position.set(-0.25, 0.85, 0);
  root.add(inlet);

  // Pyloric Antrum & Sphincter Outlet to Duodenum
  const outlet = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.5, 14), inletMat);
  outlet.position.set(0.55, -0.22, 0);
  outlet.rotation.z = Math.PI / 2.8;
  root.add(outlet);

  // Longitudinal Rugae Folds along Greater Curvature
  for (let i = 0; i < 4; i++) {
    const rugae = new THREE.Mesh(
      new THREE.TorusGeometry(0.58 + i * 0.015, 0.018, 6, 24, Math.PI * 0.65),
      new THREE.MeshStandardMaterial({ color: 0xff9800, roughness: 0.5 })
    );
    rugae.position.set(-0.02, -0.05, 0.12 - i * 0.06);
    rugae.rotation.z = Math.PI * 0.72;
    root.add(rugae);
  }

  return root;
}

// -----------------------------------------------------------------------------
// 8. ARCHITECTURAL VIRTUAL HOSPITAL SUITE
// -----------------------------------------------------------------------------
function createHospitalSuiteModel() {
  const root = new THREE.Group();
  root.name = 'HospitalSuite';

  // Floor with polished linoleum reflection
  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25 }));
  floor.position.y = -0.075;
  root.add(floor);

  // Perimeter Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(18, 3.8, 0.2), wallMat);
  backWall.position.set(0, 1.85, -8);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.8, 16), wallMat);
  leftWall.position.set(-9, 1.85, 0);
  root.add(backWall);
  root.add(leftWall);

  // Reception Desk
  const desk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 1.2), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 }));
  desk.position.set(-5.5, 0.55, -4);
  root.add(desk);

  // Consultation Desk & Examination Bed
  const consultDesk = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 1.4), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 }));
  consultDesk.position.set(5.8, 0.425, -4);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 2.6), new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.4 }));
  bed.position.set(5.8, 0.375, 4.5);
  root.add(consultDesk);
  root.add(bed);

  return root;
}

async function generateAll() {
  console.log('Generating High-Fidelity 3D Assets for MediFlow Immersive Care 3.0...');
  await exportSceneToGLB(createAnatomyBody(), 'anatomy_body.glb');
  await exportSceneToGLB(createHeartModel(), 'heart.glb');
  await exportSceneToGLB(createBrainModel(), 'brain.glb');
  await exportSceneToGLB(createLungsModel(), 'lungs.glb');
  await exportSceneToGLB(createLiverModel(), 'liver.glb');
  await exportSceneToGLB(createKidneysModel(), 'kidneys.glb');
  await exportSceneToGLB(createStomachModel(), 'stomach.glb');
  await exportSceneToGLB(createHospitalSuiteModel(), 'hospital_suite.glb');
  console.log('All 3D assets generated successfully!');
}

generateAll().catch(console.error);
