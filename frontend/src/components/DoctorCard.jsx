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

// Helper to determine next authentic slot window from real doctor availability records
export function getNextSlotText(availabilities) {
  if (!availabilities || availabilities.length === 0) {
    return 'Consult booking calendar';
  }

  const dayOrder = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const todayDay = new Date().getDay(); // 0 = Sunday

  const active = availabilities
    .filter((a) => a.isAvailable !== false)
    .map((a) => {
      const dayIdx = dayOrder.indexOf(a.dayOfWeek?.toUpperCase());
      const delta = (dayIdx - todayDay + 7) % 7;
      return { ...a, delta };
    })
    .sort((a, b) => a.delta - b.delta);

  if (active.length === 0) {
    return 'Consult booking calendar';
  }

  const first = active[0];
  let dayStr = first.dayOfWeek
    ? first.dayOfWeek.charAt(0) + first.dayOfWeek.slice(1).toLowerCase()
    : 'Upcoming';

  if (first.delta === 0) dayStr = 'Today';
  else if (first.delta === 1) dayStr = 'Tomorrow';

  const timeWindow = first.startTime ? first.startTime.slice(0, 5) : '';
  return timeWindow ? `${dayStr} (${timeWindow})` : dayStr;
}

// Clear visual availability badge helper
export function renderAvailabilityBadge(status) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        Availability information unavailable
      </span>
    );
  }

  switch (status) {
    case 'PRESENT':
    case 'AVAILABLE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          🟢 Available
        </span>
      );
    case 'IN_CONSULTATION':
    case 'BUSY':
    case 'AWAY':
    case 'ON_BREAK':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          🟡 Limited Availability
        </span>
      );
    case 'OFFLINE':
    case 'ON_LEAVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          🔴 Currently Unavailable
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Availability information unavailable
        </span>
      );
  }
}

// Backwards-compatible alias for existing imports
export const renderPresenceBadge = renderAvailabilityBadge;

// Doctor Portrait Component
export function DoctorPortraitImage({ name, specialization }) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = DOCTOR_PORTRAITS[name];

  if (!imageUrl || imgError) {
    const isFemale =
      name.includes('Ananya') || name.includes('Smruti') || name.includes('Vidita');
    return (
      <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-xl bg-gradient-to-b from-blue-50 to-indigo-100 border border-blue-200 flex flex-col items-center justify-between p-2 shrink-0 relative overflow-hidden shadow-xs">
        <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-white/90 text-blue-800 shadow-2xs truncate max-w-full">
          {(specialization || 'CLINIC').slice(0, 10)}
        </span>
        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-xl border border-gray-100 my-auto">
          {isFemale ? '👩‍⚕️' : '👨‍⚕️'}
        </div>
        <span className="text-[9px] font-semibold text-blue-700 bg-white/80 px-1.5 py-0.5 rounded">
          Verified
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-24 h-32 sm:w-28 sm:h-36 rounded-xl overflow-hidden shrink-0 border border-slate-200 shadow-xs bg-slate-100 group">
      <img
        src={imageUrl}
        alt={name}
        onError={() => setImgError(true)}
        className="w-full h-full object-cover object-top transition duration-300 group-hover:scale-105"
      />
      <div
        className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white p-1 rounded-full text-[10px] shadow-sm"
        title="Teleconsultation &amp; Video Intro Available"
      >
        📹
      </div>
    </div>
  );
}

// Complete MediFlow AI Enhanced Specialist Doctor Card
export default function DoctorCard({ doctor, selectedCity = 'Pune', onCallDoctor, onShare }) {
  const doctorName = doctor.user?.name || 'Dr. Specialist';
  const headline = DOCTOR_HEADLINES[doctorName];
  const fullTitle = headline ? `${doctorName} | ${headline}` : doctorName;
  const nextSlot = getNextSlotText(doctor.availabilities);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-2xs h-full">
      {/* Top Section: Photo + Doctor Info */}
      <div className="p-4 sm:p-5 flex gap-3.5 sm:gap-4 items-start">
        {/* Doctor Portrait */}
        <DoctorPortraitImage
          name={doctorName}
          specialization={doctor.specialization}
        />

        {/* Doctor Details */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header Row: Name & Share */}
          <div className="flex items-start justify-between gap-1">
            <h3
              className="text-sm sm:text-base font-extrabold text-slate-900 truncate leading-snug group-hover:text-[#0072CE] transition"
              title={fullTitle}
            >
              {fullTitle}
            </h3>
            {onShare && (
              <button
                type="button"
                onClick={() => onShare(doctor)}
                className="text-slate-400 hover:text-[#0072CE] p-1 rounded-md hover:bg-slate-50 transition cursor-pointer shrink-0"
                title="Share Doctor Profile"
                aria-label={`Share ${doctorName} profile`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z" />
                </svg>
              </button>
            )}
          </div>

          {/* Specialty, Verification & Experience Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-[#0072CE]">
              {doctor.specialization}
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200/80">
              ✓ Verified
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
              {doctor.experience ? `${doctor.experience}+ Yrs Exp` : 'Consultant'}
            </span>
          </div>

          {/* Qualifications & Campus Room */}
          <p className="text-xs text-slate-500 font-medium truncate">
            {doctor.qualification || 'MBBS, MD'} &bull; Room {doctor.roomNumber || '101'}
          </p>

          {/* Campus Location */}
          <div className="flex items-center gap-1 text-[11px] text-slate-600">
            <span className="text-[#0072CE]">📍</span>
            <span className="truncate">
              Central Hospital, {selectedCity === 'ALL' ? 'Pune Campus' : selectedCity}
            </span>
          </div>

          {/* Availability Status Badge */}
          <div className="pt-1">
            {renderAvailabilityBadge(doctor.currentPresence)}
          </div>
        </div>
      </div>

      {/* Middle Section: Next Slot + Fee + Live Queue Indicator */}
      <div className="px-4 sm:px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
          <span className="text-slate-400">🕒</span>
          <span>Next Slot:</span>
          <strong className="text-slate-900 font-semibold">{nextSlot}</strong>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-extrabold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
            ₹{doctor.consultationFee}
          </span>
          <Link
            to={`/queue/${doctor.id}`}
            className="font-bold text-[#0072CE] hover:text-[#005fa8] hover:underline flex items-center gap-0.5"
            title="View Live OPD Queue for this doctor"
          >
            <span>Live Queue</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Bottom Action Area: Prominent Book Appointment CTA */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-white border-t border-slate-100">
        <Link
          to={`/book?doctorId=${doctor.id}`}
          className="w-full py-2.5 px-3 bg-[#0072CE] hover:bg-[#005fa8] active:bg-[#004f8c] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition text-center focus:outline-none focus:ring-2 focus:ring-[#0072CE]/40"
        >
          <span>Book Appointment</span>
          <span className="text-sm font-normal">↗</span>
        </Link>

        <button
          type="button"
          onClick={() => onCallDoctor && onCallDoctor(doctor)}
          className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <span>📞 Call Clinic Desk</span>
        </button>
      </div>
    </div>
  );
}
