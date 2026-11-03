import { useState } from 'react';
import { Link } from 'react-router-dom';

// High-resolution clinical portraits for verified medical specialist directory
export const DOCTOR_PORTRAITS = {
  'Dr. Ketan Vartak':
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
  'Dr. Rajesh Parasnis':
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80',
  'Dr. Naresh Munot':
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80',
  'Dr. Smruti Hindaria':
    'https://images.unsplash.com/photo-1594824813589-b14cf6df5331?auto=format&fit=crop&w=400&q=80',
  'Dr. Sunil Jawale':
    'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80',
  'Dr. Vidita Powle':
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
  'Dr. Suyog Doshi':
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80',
  'Dr. Ananya Patel':
    'https://images.unsplash.com/photo-1594824813608-251f92e3425e?auto=format&fit=crop&w=400&q=80',
  'Dr. Rajesh Sharma':
    'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&w=400&q=80',
};

// MediFlow AI Verified Specialist Clinical Designations
export const DOCTOR_HEADLINES = {
  'Dr. Ketan Vartak': 'Senior Consultant Urologist',
  'Dr. Rajesh Parasnis': 'Senior Orthopedic & Spine Surgeon',
  'Dr. Naresh Munot': 'Consultant Cardiologist',
  'Dr. Smruti Hindaria': 'Consultant CTVS Surgeon',
  'Dr. Sunil Jawale': 'Consultant Nephrologist',
  'Dr. Vidita Powle': 'Senior Consultant Oncologist',
  'Dr. Suyog Doshi': 'Senior Consultant Neurosurgeon',
  'Dr. Rajesh Sharma': 'Consultant Cardiologist',
  'Dr. Ananya Patel': 'Consultant Neurologist',
};

// Doctor Portrait Component
export function DoctorPortraitImage({ name, specialization }) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = DOCTOR_PORTRAITS[name];

  if (!imageUrl || imgError) {
    const isFemale =
      name.includes('Ananya') || name.includes('Smruti') || name.includes('Vidita');
    return (
      <div className="w-28 h-36 sm:w-32 sm:h-40 rounded-xl bg-gradient-to-b from-blue-50 to-indigo-100 border border-blue-200 flex flex-col items-center justify-between p-2 shrink-0 relative overflow-hidden shadow-xs">
        <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-white/90 text-blue-800 shadow-2xs">
          {(specialization || 'CLINIC').slice(0, 10)}
        </span>
        <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl border border-gray-100 my-auto">
          {isFemale ? '👩‍⚕️' : '👨‍⚕️'}
        </div>
        <span className="text-[9px] font-semibold text-blue-700 bg-white/80 px-1.5 py-0.5 rounded">
          Verified
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-28 h-36 sm:w-32 sm:h-40 rounded-xl overflow-hidden shrink-0 border border-gray-200 shadow-xs bg-slate-100 group">
      <img
        src={imageUrl}
        alt={name}
        onError={() => setImgError(true)}
        className="w-full h-full object-cover object-top transition duration-300 group-hover:scale-105"
      />
      {/* Teleconsultation / Video Badge */}
      <div
        className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white p-1 rounded-full text-[10px] shadow-sm"
        title="Teleconsultation & Video Intro Available"
      >
        📹
      </div>
    </div>
  );
}

// Presence Badge Helper
export function renderPresenceBadge(status) {
  switch (status) {
    case 'PRESENT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          PRESENT
        </span>
      );
    case 'IN_CONSULTATION':
    case 'BUSY':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          IN CONSULTATION
        </span>
      );
    case 'AWAY':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          AWAY
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-50 text-gray-500 border border-gray-200">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
          OFFLINE
        </span>
      );
  }
}

// Complete MediFlow AI Specialist Doctor Card
export default function DoctorCard({ doctor, selectedCity = 'Pune', onCallDoctor, onShare }) {
  const doctorName = doctor.user?.name || 'Dr. Specialist';
  const headline = DOCTOR_HEADLINES[doctorName];
  const fullTitle = headline ? `${doctorName} | ${headline}` : doctorName;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-2xs">
      {/* Top Section: Photo + Doctor Info */}
      <div className="p-4 sm:p-5 flex gap-4 items-start">
        {/* Doctor Portrait */}
        <DoctorPortraitImage
          name={doctorName}
          specialization={doctor.specialization}
        />

        {/* Doctor Details */}
        <div className="flex-1 min-w-0">
          {/* Name + Share Button */}
          <div className="flex items-start justify-between gap-1 mb-1">
            <h3 className="text-base sm:text-[17px] font-black text-gray-900 truncate leading-snug group-hover:text-blue-700 transition" title={fullTitle}>
              {fullTitle}
            </h3>
            {onShare && (
              <button
                type="button"
                onClick={() => onShare(doctor)}
                className="text-gray-400 hover:text-blue-600 p-1 rounded-md hover:bg-gray-100 transition cursor-pointer shrink-0"
                title="Share Doctor Profile"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z" />
                </svg>
              </button>
            )}
          </div>

          {/* Speciality Badge + Demo Roster Tag */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-[#0072CE]">
              {doctor.specialization}
            </span>
            <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded border border-blue-200">
              Verified Specialist
            </span>
            <span className="text-[9px] bg-gray-100 text-gray-500 font-semibold px-1.5 py-0.2 rounded" title="Clinical simulation profile for portfolio evaluation">
              Demo Roster
            </span>
          </div>

          {/* Experience & Qualification */}
          <p className="text-xs text-gray-600 font-medium mb-2 truncate">
            <strong>{doctor.experience}+ Years</strong> , {doctor.qualification || 'MBBS, MD'}
          </p>

          {/* MediFlow Hospital Campus Location */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2.5">
            <span className="w-3.5 h-3.5 rounded-full border border-[#0072CE] text-[#0072CE] flex items-center justify-center text-[9px] shrink-0 font-bold">
              ●
            </span>
            <span className="truncate">
              MediFlow Central Hospital, {selectedCity === 'ALL' ? 'Pune Campus' : selectedCity} ({doctor.roomNumber || 'Room 101'})
            </span>
          </div>

          {/* Fee, Duration, Presence & Live Queue Link */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] pt-2 border-t border-gray-100">
            <span className="font-extrabold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
              ₹{doctor.consultationFee}
            </span>
            <span className="text-gray-400">&bull;</span>
            <span className="text-gray-500 font-medium">
              {doctor.consultationDuration || 30} mins
            </span>
            <span className="ml-auto">
              {renderPresenceBadge(doctor.currentPresence)}
            </span>
            <Link
              to={`/queue/${doctor.id}`}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline ml-1"
            >
              Live Queue &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons: Amber Book & White/Blue Call Now */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50/80 border-t border-gray-100">
        <Link
          to={`/book?doctorId=${doctor.id}`}
          className="w-full py-2.5 px-3 bg-[#F5A623] hover:bg-[#E09823] active:bg-[#C9841B] text-gray-950 font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition text-center"
        >
          <span>Book Appointment</span>
          <span className="text-sm">↗</span>
        </Link>

        <button
          type="button"
          onClick={() => onCallDoctor && onCallDoctor(doctor)}
          className="w-full py-2.5 px-3 bg-white hover:bg-blue-50 text-[#0072CE] hover:text-[#005ea2] font-black text-xs rounded-xl border border-[#0072CE] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <span>📞 Call Clinic Desk</span>
        </button>
      </div>
    </div>
  );
}
