const ORGAN_DATA = {
  Heart: {
    system: 'Cardiovascular System',
    icon: '🫀',
    overview:
      'The human heart is a muscular organ about the size of a fist, situated behind and slightly left of the breastbone. It pumps blood through the network of arteries and veins known as the cardiovascular system.',
    functions: [
      'Pumps oxygen-rich blood from lungs to systemic organs',
      'Receives deoxygenated venous return and directs it to pulmonary circulation',
      'Generates physiological systemic blood pressure (~120/80 mmHg)',
      'Adjusts cardiac output dynamically based on physical exertion',
    ],
    stats: [
      { label: 'Average Rest BPM', value: '60–100 BPM' },
      { label: 'Daily Blood Volume', value: '~7,500 Liters' },
      { label: 'Weight', value: '250–350 grams' },
      { label: 'Chambers', value: '4 (2 Atria, 2 Ventricles)' },
    ],
    pathologies: [
      'Coronary Artery Disease (CAD)',
      'Myocardial Infarction (Heart Attack)',
      'Arrhythmias (Atrial Fibrillation)',
      'Congestive Heart Failure',
    ],
  },
  Brain: {
    system: 'Central Nervous System',
    icon: '🧠',
    overview:
      'The brain serves as the central control organ of the human nervous system. Encased in the skull, it coordinates sensory perception, motor control, higher cognition, emotional processing, and homeostatic regulation.',
    functions: [
      'Processes sensory inputs from vision, audition, touch, taste, and olfaction',
      'Executes voluntary motor coordination and balance',
      'Mediates memory formation, reasoning, language, and executive decision-making',
      'Regulates autonomic functions via the brainstem (heartbeat, respiration, digestion)',
    ],
    stats: [
      { label: 'Neuron Count', value: '~86 Billion' },
      { label: 'Glial Cells', value: '~85 Billion' },
      { label: 'Average Weight', value: '1.3–1.4 kg' },
      { label: 'Energy Usage', value: '20% of resting body oxygen' },
    ],
    pathologies: [
      'Ischemic & Hemorrhagic Stroke',
      'Traumatic Brain Injury (Concussion)',
      'Neurodegenerative Disorders (Alzheimer’s, Parkinson’s)',
      'Epileptic Seizure Syndromes',
    ],
  },
  Lungs: {
    system: 'Respiratory System',
    icon: '🫁',
    overview:
      'The lungs are a pair of spongy, air-filled organs located on either side of the chest (thorax). The right lung has three lobes and the left lung has two lobes with a cardiac notch for the heart.',
    functions: [
      'Facilitates pulmonary gas exchange: uptake of oxygen and removal of carbon dioxide',
      'Maintains systemic acid-base (pH) balance via CO2 regulation',
      'Filters small blood clots and releases metabolic biochemicals (e.g. ACE)',
      'Produces immunoglobulins and alveolar macrophages to defend against airborne pathogens',
    ],
    stats: [
      { label: 'Total Lung Capacity', value: '~6.0 Liters' },
      { label: 'Alveoli Count', value: '~480 Million' },
      { label: 'Internal Surface Area', value: '~70 m² (half tennis court)' },
      { label: 'Respiratory Rate', value: '12–20 breaths/min' },
    ],
    pathologies: [
      'Chronic Obstructive Pulmonary Disease (COPD)',
      'Pneumonia & Bronchitis',
      'Asthma & Reactive Airway Disease',
      'Pulmonary Embolism',
    ],
  },
  Liver: {
    system: 'Digestive & Metabolic System',
    icon: '🟤',
    overview:
      'The liver is the largest internal solid organ in the human body. Located in the right upper quadrant of the abdominal cavity, it performs over 500 distinct vital metabolic and filtration functions.',
    functions: [
      'Metabolizes carbohydrates, lipids, and proteins into usable nutrients',
      'Detoxifies pharmaceutical substances, alcohol, and metabolic byproducts (ammonia into urea)',
      'Synthesizes vital plasma proteins including albumin and clotting factors',
      'Produces bile stored in the gallbladder for dietary fat emulsification',
    ],
    stats: [
      { label: 'Average Weight', value: '1.4–1.6 kg' },
      { label: 'Blood Supply Source', value: '75% Portal Vein, 25% Hepatic Artery' },
      { label: 'Regeneration Potential', value: 'Can regenerate from 25% remaining tissue' },
      { label: 'Lobes', value: '4 (Right, Left, Caudate, Quadrate)' },
    ],
    pathologies: [
      'Non-Alcoholic Fatty Liver Disease (NAFLD)',
      'Viral Hepatitis (A, B, C)',
      'Cirrhosis & Hepatic Fibrosis',
      'Hepatocellular Carcinoma',
    ],
  },
  Kidneys: {
    system: 'Urinary & Excretory System',
    icon: '🥜',
    overview:
      'The kidneys are two bean-shaped organs positioned retroperitoneally on either side of the spine. They filter waste products from the bloodstream, balance electrolytes, and produce hormones regulating blood pressure and red blood cell production.',
    functions: [
      'Filters metabolic waste (urea, creatinine, uric acid) from the bloodstream',
      'Maintains fluid, electrolyte (Na+, K+, Cl-), and acid-base homeostasis',
      'Secretes renin to modulate systemic vascular resistance and blood pressure',
      'Synthesizes erythropoietin (EPO) to stimulate bone marrow erythropoiesis',
    ],
    stats: [
      { label: 'Nephrons per Kidney', value: '~1 Million' },
      { label: 'Daily Filtration Rate', value: '~180 Liters/day' },
      { label: 'Daily Urine Output', value: '1.0–2.0 Liters/day' },
      { label: 'Size', value: '10–12 cm length' },
    ],
    pathologies: [
      'Chronic Kidney Disease (CKD)',
      'Acute Kidney Injury (AKI)',
      'Nephrolithiasis (Kidney Stones)',
      'Glomerulonephritis',
    ],
  },
  Stomach: {
    system: 'Gastrointestinal System',
    icon: '🥣',
    overview:
      'The stomach is a hollow, muscular organ in the upper digestive tract. It receives food from the esophagus, secretes digestive enzymes and hydrochloric acid, and churns food into a semi-fluid mass known as chyme.',
    functions: [
      'Stores ingested food and controls progressive release into the duodenum',
      'Secretes hydrochloric acid (HCl) creating a low pH (1.5–3.5) environment to denature proteins',
      'Produces pepsinogen, activated into pepsin for dietary protein breakdown',
      'Secretes intrinsic factor, essential for terminal ileal absorption of Vitamin B12',
    ],
    stats: [
      { label: 'Empty Volume', value: '~50 mL' },
      { label: 'Expanded Capacity', value: '1.0–2.0 Liters' },
      { label: 'Resting Gastric pH', value: '1.5 to 3.5' },
      { label: 'Chyme Transit Time', value: '2–4 hours' },
    ],
    pathologies: [
      'Gastroesophageal Reflux Disease (GERD)',
      'Peptic Ulcer Disease (H. pylori related)',
      'Gastritis & Gastroparesis',
      'Gastric Adenocarcinoma',
    ],
  },
};

export default function OrganInfoPanel({ selectedOrgan = 'Heart', onSelectOrgan }) {
  const organ = ORGAN_DATA[selectedOrgan] || ORGAN_DATA.Heart;
  const organNames = Object.keys(ORGAN_DATA);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col h-full overflow-y-auto">
      {/* Organ Selection Pills */}
      <div className="mb-4">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Select Organ
        </label>
        <div className="flex flex-wrap gap-1.5">
          {organNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onSelectOrgan && onSelectOrgan(name)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                selectedOrgan.toLowerCase() === name.toLowerCase()
                  ? 'bg-[#0072CE] text-white border-[#0072CE] shadow-2xs font-bold'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{ORGAN_DATA[name].icon}</span>
              <span>{name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Header Info */}
      <div className="pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{organ.icon}</span>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">
              {selectedOrgan}
            </h3>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              {organ.system}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          {organ.overview}
        </p>
      </div>

      {/* Key Stats Grid */}
      <div className="py-4 border-b border-slate-100">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          Physiological Metrics
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {organ.stats.map((st) => (
            <div key={st.label} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block uppercase truncate">
                {st.label}
              </span>
              <span className="text-xs font-black text-slate-800 block mt-0.5">
                {st.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Functions */}
      <div className="py-4 border-b border-slate-100">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Key Functions
        </h4>
        <ul className="space-y-1.5">
          {organ.functions.map((fn, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
              <span className="text-blue-500 font-bold mt-0.5">•</span>
              <span className="leading-snug">{fn}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Common Pathologies */}
      <div className="py-4 border-b border-slate-100">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Common Clinical Conditions
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {organ.pathologies.map((pat) => (
            <span
              key={pat}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60"
            >
              {pat}
            </span>
          ))}
        </div>
      </div>

      {/* Medical Disclaimer */}
      <div className="mt-auto pt-4">
        <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
          <span className="font-bold">⚠️ Educational Notice:</span> This 3D visualization and informational data is intended strictly for anatomical education and hospital navigation familiarity. It is not intended for self-diagnosis or clinical prescription.
        </div>
      </div>
    </div>
  );
}
