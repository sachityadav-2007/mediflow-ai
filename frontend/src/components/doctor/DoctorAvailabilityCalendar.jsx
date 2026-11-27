import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createDoctorAvailabilitySlot,
  deleteDoctorAvailabilitySlot,
  getDoctorAvailabilityCalendar,
  updateDoctorAvailabilitySlot,
} from '../../services/api';

const pad = (value) => String(value).padStart(2, '0');
const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const addMinutes = (time, minutes) => {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

function DoctorAvailabilityCalendar({ consultationDuration = 30 }) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [slots, setSlots] = useState([]);
  const [startTime, setStartTime] = useState('17:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const monthDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
    ];
  }, [visibleMonth]);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const year = visibleMonth.getFullYear();
      const month = visibleMonth.getMonth();
      const startDate = toDateKey(new Date(year, month, 1));
      const endDate = toDateKey(new Date(year, month + 1, 0));
      const response = await getDoctorAvailabilityCalendar(startDate, endDate);
      setSlots(response.slots || []);
      setMessage({ type: '', text: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to load availability calendar.' });
    } finally {
      setLoading(false);
    }
  }, [visibleMonth]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const selectedSlots = slots.filter((slot) => slot.slotDate?.slice(0, 10) === selectedDate);
  const selectedIsPast = selectedDate < toDateKey(new Date());

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createDoctorAvailabilitySlot({
        date: selectedDate,
        startTime,
        endTime: addMinutes(startTime, Number(consultationDuration) || 30),
      });
      setMessage({ type: 'success', text: 'Additional availability added.' });
      await loadSlots();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to add availability.' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (slot) => {
    try {
      await updateDoctorAvailabilitySlot(slot.id, { status: slot.status === 'BLOCKED' ? 'AVAILABLE' : 'BLOCKED' });
      await loadSlots();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to update this slot.' });
    }
  };

  const handleDelete = async (slot) => {
    if (!window.confirm(`Remove ${slot.startTime}–${slot.endTime} on ${selectedDate}?`)) return;
    try {
      await deleteDoctorAvailabilitySlot(slot.id);
      setMessage({ type: 'success', text: 'Availability slot removed.' });
      await loadSlots();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to remove this slot.' });
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Availability Calendar</h2>
          <p className="text-xs text-slate-500 mt-1">Manage additional date-specific slots without changing your weekly schedule.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50" aria-label="Previous month">‹</button>
          <strong className="min-w-32 text-center text-sm">{visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
          <button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50" aria-label="Next month">›</button>
        </div>
      </div>

      {message.text && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${message.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{message.text}</p>}

      <div className="grid grid-cols-7 gap-1 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-2 text-xs font-semibold text-slate-500">{day}</div>)}
        {monthDays.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} />;
          const key = toDateKey(day);
          const count = slots.filter((slot) => slot.slotDate?.slice(0, 10) === key).length;
          const selected = selectedDate === key;
          return (
            <button key={key} type="button" onClick={() => setSelectedDate(key)} className={`min-h-14 rounded-lg border p-1 text-sm ${selected ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-100 hover:border-blue-300'}`}>
              <span className="block font-semibold">{day.getDate()}</span>
              {count > 0 && <span className="mt-1 block text-[10px] text-blue-700">{count} slot{count === 1 ? '' : 's'}</span>}
            </button>
          );
        })}
      </div>

      <div className="border-t border-slate-100 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <h3 className="font-semibold text-sm text-slate-900">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
          {loading ? <p className="py-5 text-sm text-slate-500">Loading slots…</p> : selectedSlots.length === 0 ? <p className="py-5 text-sm text-slate-500">No date-specific slots for this day.</p> : (
            <div className="mt-3 space-y-2">
              {selectedSlots.map((slot) => {
                const booked = slot.status === 'BOOKED' || (slot.appointment && slot.appointment.status !== 'CANCELLED');
                return <div key={slot.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                  <div><p className="text-sm font-semibold">{slot.startTime} – {slot.endTime}</p><p className={`text-xs ${booked ? 'text-rose-600' : slot.status === 'BLOCKED' ? 'text-amber-600' : 'text-emerald-600'}`}>{booked ? 'Booked' : slot.status === 'BLOCKED' ? 'Blocked' : 'Available'}</p></div>
                  {!booked && <div className="flex gap-2"><button type="button" onClick={() => handleStatus(slot)} className="text-xs font-semibold text-blue-700 hover:underline">{slot.status === 'BLOCKED' ? 'Unblock' : 'Block'}</button><button type="button" onClick={() => handleDelete(slot)} className="text-xs font-semibold text-rose-700 hover:underline">Remove</button></div>}
                </div>;
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleCreate} className="rounded-xl bg-slate-50 p-4 space-y-3">
          <h3 className="font-semibold text-sm text-slate-900">Add extra availability</h3>
          <p className="text-xs text-slate-500">Adds one slot of {consultationDuration} minutes outside your recurring weekly hours.</p>
          <label className="block text-xs font-semibold text-slate-600">Date<input type="date" value={selectedDate} min={toDateKey(new Date())} onChange={(event) => setSelectedDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" required /></label>
          <label className="block text-xs font-semibold text-slate-600">Start time<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" required /></label>
          <p className="text-xs text-slate-500">End time: {addMinutes(startTime, Number(consultationDuration) || 30)}</p>
          <button type="submit" disabled={saving || selectedIsPast} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving…' : 'Add availability'}</button>
        </form>
      </div>
    </section>
  );
}

export default DoctorAvailabilityCalendar;
