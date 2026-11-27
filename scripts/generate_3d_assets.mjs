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

// 1. Anatomy Body
function createAnatomyBody() {
  const group = new THREE.Group();
  group.name = 'HumanAnatomy';

  // Translucent Skin / Torso
  const torsoGeo = new THREE.CylinderGeometry(0.35, 0.28, 1.1, 16);
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x90caf9,
    transparent: true,
    opacity: 0.45,
    roughness: 0.3,
  });
  const torso = new THREE.Mesh(torsoGeo, skinMat);
  torso.position.y = 1.0;
  group.add(torso);

  // Head
  const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.75;
  group.add(head);

  // Internal Organs (visible inside translucent skin)
  // Brain
  const brainGeo = new THREE.SphereGeometry(0.14, 16, 14);
  const brainMat = new THREE.MeshStandardMaterial({ color: 0xf48fb1, roughness: 0.6 });
  const brain = new THREE.Mesh(brainGeo, brainMat);
  brain.name = 'Brain';
  brain.position.set(0, 1.75, 0);
  group.add(brain);

  // Heart
  const heartGeo = new THREE.DodecahedronGeometry(0.12, 1);
  const heartMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 });
  const heart = new THREE.Mesh(heartGeo, heartMat);
  heart.name = 'Heart';
  heart.position.set(-0.06, 1.25, 0.08);
  group.add(heart);

  // Lungs
  const lungGeo = new THREE.CapsuleGeometry(0.11, 0.32, 8, 12);
  const lungMat = new THREE.MeshStandardMaterial({ color: 0xef9a9a, roughness: 0.5 });
  const leftLung = new THREE.Mesh(lungGeo, lungMat);
  leftLung.name = 'LeftLung';
  leftLung.position.set(0.14, 1.25, 0.02);
  const rightLung = new THREE.Mesh(lungGeo, lungMat);
  rightLung.name = 'RightLung';
  rightLung.position.set(-0.16, 1.25, 0.02);
  group.add(leftLung);
  group.add(rightLung);

  // Liver
  const liverGeo = new THREE.BoxGeometry(0.24, 0.14, 0.16);
  const liverMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.5 });
  const liver = new THREE.Mesh(liverGeo, liverMat);
  liver.name = 'Liver';
  liver.position.set(0.1, 1.0, 0.05);
  group.add(liver);

  // Stomach
  const stomachGeo = new THREE.TorusGeometry(0.1, 0.06, 10, 16, Math.PI);
  const stomachMat = new THREE.MeshStandardMaterial({ color: 0xffb74d, roughness: 0.5 });
  const stomach = new THREE.Mesh(stomachGeo, stomachMat);
  stomach.name = 'Stomach';
  stomach.position.set(-0.08, 0.98, 0.06);
  stomach.rotation.z = Math.PI / 4;
  group.add(stomach);

  // Kidneys
  const kidneyGeo = new THREE.SphereGeometry(0.065, 12, 12);
  const kidneyMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.4 });
  const leftKidney = new THREE.Mesh(kidneyGeo, kidneyMat);
  leftKidney.position.set(-0.12, 0.88, -0.06);
  const rightKidney = new THREE.Mesh(kidneyGeo, kidneyMat);
  rightKidney.position.set(0.12, 0.88, -0.06);
  group.add(leftKidney);
  group.add(rightKidney);

  // Limbs
  const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.85, 10);
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.set(0.48, 1.05, 0);
  const rightArm = new THREE.Mesh(armGeo, skinMat);
  rightArm.position.set(-0.48, 1.05, 0);
  group.add(leftArm);
  group.add(rightArm);

  const legGeo = new THREE.CylinderGeometry(0.11, 0.08, 1.0, 10);
  const leftLeg = new THREE.Mesh(legGeo, skinMat);
  leftLeg.position.set(0.18, 0.0, 0);
  const rightLeg = new THREE.Mesh(legGeo, skinMat);
  rightLeg.position.set(-0.18, 0.0, 0);
  group.add(leftLeg);
  group.add(rightLeg);

  return group;
}

// 2. Heart Model
function createHeartModel() {
  const group = new THREE.Group();
  group.name = 'HumanHeart';

  // Ventricles / Main Body
  const heartBodyGeo = new THREE.DodecahedronGeometry(0.45, 2);
  const heartMat = new THREE.MeshStandardMaterial({
    color: 0xc62828,
    roughness: 0.35,
    metalness: 0.1,
  });
  const heartBody = new THREE.Mesh(heartBodyGeo, heartMat);
  heartBody.scale.set(0.85, 1.1, 0.9);
  group.add(heartBody);

  // Aorta Arch (Curved Torus/Tubes)
  const aortaGeo = new THREE.TorusGeometry(0.22, 0.08, 12, 24, Math.PI * 0.8);
  const vesselMatRed = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.3 });
  const aorta = new THREE.Mesh(aortaGeo, vesselMatRed);
  aorta.position.set(0.05, 0.45, 0);
  aorta.rotation.z = -Math.PI / 6;
  group.add(aorta);

  // Vena Cava (Blue Vessel)
  const venaCavaGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.6, 12);
  const vesselMatBlue = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.3 });
  const venaCava = new THREE.Mesh(venaCavaGeo, vesselMatBlue);
  venaCava.position.set(-0.25, 0.38, -0.05);
  group.add(venaCava);

  // Pulmonary Artery
  const pulmonaryGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.45, 12);
  const pulmonary = new THREE.Mesh(pulmonaryGeo, vesselMatBlue);
  pulmonary.position.set(0.18, 0.32, 0.12);
  pulmonary.rotation.z = Math.PI / 4;
  group.add(pulmonary);

  return group;
}

// 3. Brain Model
function createBrainModel() {
  const group = new THREE.Group();
  group.name = 'HumanBrain';

  const hemisphereMat = new THREE.MeshStandardMaterial({
    color: 0xf06292,
    roughness: 0.5,
    metalness: 0.05,
  });

  // Left Hemisphere
  const leftHemiGeo = new THREE.SphereGeometry(0.48, 20, 16);
  const leftHemi = new THREE.Mesh(leftHemiGeo, hemisphereMat);
  leftHemi.position.set(-0.16, 0.15, 0);
  leftHemi.scale.set(0.7, 0.85, 1.1);
  group.add(leftHemi);

  // Right Hemisphere
  const rightHemiGeo = new THREE.SphereGeometry(0.48, 20, 16);
  const rightHemi = new THREE.Mesh(rightHemiGeo, hemisphereMat);
  rightHemi.position.set(0.16, 0.15, 0);
  rightHemi.scale.set(0.7, 0.85, 1.1);
  group.add(rightHemi);

  // Cerebellum (Lower Posterior)
  const cerebellumGeo = new THREE.SphereGeometry(0.24, 16, 14);
  const cerebellumMat = new THREE.MeshStandardMaterial({ color: 0xad1457, roughness: 0.6 });
  const cerebellum = new THREE.Mesh(cerebellumGeo, cerebellumMat);
  cerebellum.position.set(0, -0.22, -0.28);
  cerebellum.scale.set(1.4, 0.8, 0.9);
  group.add(cerebellum);

  // Brainstem
  const stemGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.4, 12);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xd81b60, roughness: 0.4 });
  const brainstem = new THREE.Mesh(stemGeo, stemMat);
  brainstem.position.set(0, -0.38, -0.08);
  group.add(brainstem);

  return group;
}

// 4. Lungs Model
function createLungsModel() {
  const group = new THREE.Group();
  group.name = 'HumanLungs';

  const lungMat = new THREE.MeshStandardMaterial({
    color: 0xef5350,
    roughness: 0.5,
  });

  // Trachea / Windpipe
  const tracheaGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 16);
  const tracheaMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.3 });
  const trachea = new THREE.Mesh(tracheaGeo, tracheaMat);
  trachea.position.set(0, 0.45, 0);
  group.add(trachea);

  // Bronchial branches
  const branchGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.28, 10);
  const leftBranch = new THREE.Mesh(branchGeo, tracheaMat);
  leftBranch.position.set(0.12, 0.25, 0);
  leftBranch.rotation.z = -Math.PI / 4;
  const rightBranch = new THREE.Mesh(branchGeo, tracheaMat);
  rightBranch.position.set(-0.12, 0.25, 0);
  rightBranch.rotation.z = Math.PI / 4;
  group.add(leftBranch);
  group.add(rightBranch);

  // Right Lung (3 lobes)
  const rightLungGeo = new THREE.CapsuleGeometry(0.24, 0.65, 12, 16);
  const rightLung = new THREE.Mesh(rightLungGeo, lungMat);
  rightLung.position.set(-0.35, 0, 0);
  rightLung.scale.set(1.05, 1.0, 0.85);
  group.add(rightLung);

  // Left Lung (2 lobes, cardiac notch)
  const leftLungGeo = new THREE.CapsuleGeometry(0.22, 0.62, 12, 16);
  const leftLung = new THREE.Mesh(leftLungGeo, lungMat);
  leftLung.position.set(0.35, 0, 0);
  leftLung.scale.set(0.95, 1.0, 0.82);
  group.add(leftLung);

  return group;
}

// 5. Liver Model
function createLiverModel() {
  const group = new THREE.Group();
  group.name = 'HumanLiver';

  const liverMat = new THREE.MeshStandardMaterial({
    color: 0x8d6e63,
    roughness: 0.45,
  });

  // Main Right Lobe
  const rightLobeGeo = new THREE.SphereGeometry(0.48, 16, 16);
  const rightLobe = new THREE.Mesh(rightLobeGeo, liverMat);
  rightLobe.position.set(0.15, 0, 0);
  rightLobe.scale.set(1.2, 0.8, 0.9);
  group.add(rightLobe);

  // Left Lobe
  const leftLobeGeo = new THREE.ConeGeometry(0.35, 0.6, 16);
  const leftLobe = new THREE.Mesh(leftLobeGeo, liverMat);
  leftLobe.position.set(-0.32, -0.05, 0.05);
  leftLobe.rotation.z = Math.PI / 2.3;
  leftLobe.scale.set(0.8, 1.0, 0.7);
  group.add(leftLobe);

  // Gallbladder
  const gallGeo = new THREE.SphereGeometry(0.11, 12, 12);
  const gallMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.3 });
  const gallbladder = new THREE.Mesh(gallGeo, gallMat);
  gallbladder.position.set(0.05, -0.25, 0.22);
  gallbladder.scale.set(0.8, 1.4, 0.7);
  group.add(gallbladder);

  return group;
}

// 6. Kidneys Model
function createKidneysModel() {
  const group = new THREE.Group();
  group.name = 'HumanKidneys';

  const kidneyMat = new THREE.MeshStandardMaterial({
    color: 0x6d4c41,
    roughness: 0.4,
  });

  // Left Kidney
  const leftGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const leftKidney = new THREE.Mesh(leftGeo, kidneyMat);
  leftKidney.position.set(-0.45, 0, 0);
  leftKidney.scale.set(0.7, 1.3, 0.8);
  group.add(leftKidney);

  // Right Kidney
  const rightKidney = new THREE.Mesh(leftGeo, kidneyMat);
  rightKidney.position.set(0.45, -0.05, 0);
  rightKidney.scale.set(0.7, 1.3, 0.8);
  group.add(rightKidney);

  // Aorta & Vena Cava between kidneys
  const vesselGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 12);
  const artery = new THREE.Mesh(vesselGeo, new THREE.MeshStandardMaterial({ color: 0xc62828 }));
  artery.position.set(-0.07, 0, -0.05);
  const vein = new THREE.Mesh(vesselGeo, new THREE.MeshStandardMaterial({ color: 0x1565c0 }));
  vein.position.set(0.07, 0, -0.05);
  group.add(artery);
  group.add(vein);

  // Ureters
  const ureterGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.65, 8);
  const ureterMat = new THREE.MeshStandardMaterial({ color: 0xfff59d });
  const leftUreter = new THREE.Mesh(ureterGeo, ureterMat);
  leftUreter.position.set(-0.25, -0.4, 0);
  leftUreter.rotation.z = -Math.PI / 12;
  const rightUreter = new THREE.Mesh(ureterGeo, ureterMat);
  rightUreter.position.set(0.25, -0.4, 0);
  rightUreter.rotation.z = Math.PI / 12;
  group.add(leftUreter);
  group.add(rightUreter);

  return group;
}

// 7. Stomach Model
function createStomachModel() {
  const group = new THREE.Group();
  group.name = 'HumanStomach';

  const stomachMat = new THREE.MeshStandardMaterial({
    color: 0xffb74d,
    roughness: 0.5,
  });

  // J-Shape Body (Curved Torus segment)
  const torusGeo = new THREE.TorusGeometry(0.38, 0.16, 16, 24, Math.PI * 0.9);
  const body = new THREE.Mesh(torusGeo, stomachMat);
  body.rotation.z = Math.PI * 0.7;
  group.add(body);

  // Fundus (Upper dome)
  const fundusGeo = new THREE.SphereGeometry(0.26, 16, 14);
  const fundus = new THREE.Mesh(fundusGeo, stomachMat);
  fundus.position.set(-0.22, 0.28, 0);
  fundus.scale.set(1.1, 0.9, 0.85);
  group.add(fundus);

  // Esophagus Entrance
  const inletGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.35, 12);
  const inletMat = new THREE.MeshStandardMaterial({ color: 0xffa726 });
  const inlet = new THREE.Mesh(inletGeo, inletMat);
  inlet.position.set(-0.15, 0.48, 0);
  group.add(inlet);

  // Pylorus Exit
  const exitGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.3, 12);
  const exit = new THREE.Mesh(exitGeo, inletMat);
  exit.position.set(0.36, -0.15, 0);
  exit.rotation.z = Math.PI / 3;
  group.add(exit);

  return group;
}

// 8. Hospital Suite Model
function createHospitalSuiteModel() {
  const group = new THREE.Group();
  group.name = 'HospitalSuite';

  // Floor
  const floorGeo = new THREE.BoxGeometry(16, 0.2, 14);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe0e7ff, roughness: 0.2 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = -0.1;
  group.add(floor);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  const backWallGeo = new THREE.BoxGeometry(16, 3.5, 0.2);
  const backWall = new THREE.Mesh(backWallGeo, wallMat);
  backWall.position.set(0, 1.65, -7);
  group.add(backWall);

  const leftWallGeo = new THREE.BoxGeometry(0.2, 3.5, 14);
  const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
  leftWall.position.set(-8, 1.65, 0);
  group.add(leftWall);

  // Reception Desk
  const deskGeo = new THREE.BoxGeometry(3.5, 1.05, 1.2);
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
  const desk = new THREE.Mesh(deskGeo, deskMat);
  desk.position.set(-3.5, 0.525, -2);
  group.add(desk);

  // Examination Bed
  const bedGeo = new THREE.BoxGeometry(1.4, 0.75, 2.6);
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9 });
  const bed = new THREE.Mesh(bedGeo, bedMat);
  bed.position.set(4, 0.375, -2);
  group.add(bed);

  // Medical Monitor Stand
  const standGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8);
  const standMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
  const stand = new THREE.Mesh(standGeo, standMat);
  stand.position.set(3, 0.9, -3.2);
  group.add(stand);

  // ECG Screen
  const screenGeo = new THREE.BoxGeometry(0.8, 0.5, 0.08);
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(3, 1.7, -3.2);
  group.add(screen);

  return group;
}

async function generateAll() {
  console.log('Generating 3D Assets for MediFlow Immersive Care...');
  await exportSceneToGLB(createAnatomyBody(), 'anatomy_body.glb');
  await exportSceneToGLB(createHeartModel(), 'heart.glb');
  await exportSceneToGLB(createBrainModel(), 'brain.glb');
  await exportSceneToGLB(createLungsModel(), 'lungs.glb');
  await exportSceneToGLB(createLiverModel(), 'liver.glb');
  await exportSceneToGLB(createKidneysModel(), 'kidneys.glb');
  await exportSceneToGLB(createStomachModel(), 'stomach.glb');
  await exportSceneToGLB(createHospitalSuiteModel(), 'hospital_suite.glb');
  console.log('All 3D models exported successfully!');
}

generateAll().catch(console.error);
