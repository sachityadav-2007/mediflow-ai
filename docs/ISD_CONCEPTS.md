# ISD Capstone: Concepts Mapped to My Contributions

**Project:** MediFlow AI (team project with @sachityadav-2007)
**Author of this document:** Ishita (@ishitahas)

This document maps the software-design concepts from the ISD course to the code I personally wrote. My commits are visible in the repository history:

| Commit | Summary |
| ------ | ------- |
| `5f864ca` | Sort dropdown and "Accepting Patients" filter on the doctors directory |
| `b0b8497` | Doctor availability calendar and slot management (frontend, backend, booking integration) |

---

## 1. My Contributions

### Feature A: Doctor Availability Calendar and Slot Management
Doctors can add extra, date-specific consultation slots outside their recurring weekly schedule, block or unblock a slot, and remove a slot. Patients see these slots when booking, and blocked slots are never offered.

### Feature B: Doctor Directory Sorting and Filtering
Patients can sort doctors by experience, fee or name, and filter to doctors who are currently accepting patients (not offline).

---

## 2. Concept-to-Code Mapping

| Concept | Where it appears in my work |
| ------- | --------------------------- |
| **Client-server architecture / REST APIs** | `frontend/src/services/api.js` calls four REST endpoints: `GET /api/doctors/availability/calendar`, `POST /api/doctors/availability/slots`, `PATCH /api/doctors/availability/slots/:slotId`, `DELETE /api/doctors/availability/slots/:slotId` |
| **Layered design / separation of concerns** | Routes (`backend/src/routes/doctor.routes.js`), controllers (`backend/src/controllers/doctor.controller.js`), services (`backend/src/services/doctor.service.js`), database (Prisma) |
| **CRUD operations** | Create, read, update (status change) and delete of availability slots in `doctor.service.js` |
| **Authentication and role-based access control** | All four routes use `authenticateUser` and `authorizeRoles('DOCTOR')`; each controller resolves the doctor from the logged-in user so a doctor can only modify their own slots |
| **Input validation** | `isValidCalendarDate`, `availabilityTimeToMinutes`; rules: valid date, no past dates, valid HH:MM times, end after start, slot length equal to the doctor's consultation duration |
| **Business rules / integrity constraints** | Slots cannot overlap the recurring weekly schedule or another slot; slots linked to an appointment cannot be edited or deleted |
| **Database design and ORM** | `AppointmentSlot` model (status `AVAILABLE`, `BOOKED`, `BLOCKED`) queried and modified through Prisma |
| **Transactions and concurrency** | Booking in `appointment.service.js` runs inside `prisma.$transaction`; I extended the pre-checks so a booking must match a real recurring or one-off slot and blocked slots are rejected |
| **Component-based UI** | `frontend/src/components/doctor/DoctorAvailabilityCalendar.jsx`, a self-contained component placed into `DoctorDashboard.jsx` |
| **State management (React hooks)** | `useState` for selected date, slots, form and messages; `useMemo` for the calendar grid; `useEffect` + `useCallback` for loading data when the month changes |
| **Derived data and filtering/sorting** | `DoctorDirectoryPage.jsx`: `sortBy` state and a `sortedDoctors` memo applied after the existing filters; `ACCEPTING` presence filter |
| **Error handling and user feedback** | Backend returns `{ success, message }` with proper status codes; the component shows success/error banners and a confirmation dialog before removal |
| **Responsive design** | Tailwind utility classes (grid, flex-wrap, breakpoint classes) so the calendar works on small screens |

---

## 3. Design Decisions

1. **Additive, not destructive.** Date-specific slots extend the weekly schedule and never replace it, so existing booking behaviour is unchanged.
2. **Single source of truth.** The UI reloads slots from the server after every action instead of editing local state, so it always matches the database.
3. **Validation on the server.** The frontend limits obvious mistakes (min date, computed end time), but all rules are enforced in `doctor.service.js` so they cannot be bypassed.
4. **Booking integration.** `getAvailableSlots` merges recurring generated slots with one-off available slots, removes booked or blocked times and removes duplicate start times.

---

## 4. Testing Evidence

Automated tests for the new endpoints have not been written yet (see Limitations). I verified the feature manually with the checklist below.

| # | Scenario | Expected | Result |
| - | -------- | -------- | ------ |
| 1 | Doctor adds a valid slot on a future date | Slot appears on the calendar with a count badge | Pass |
| 2 | Doctor adds a slot on a past date | Rejected (button disabled) | |
| 3 | Doctor adds a slot overlapping the weekly schedule | Rejected with an error message | |
| 4 | Doctor adds a slot overlapping another slot | Rejected with an error message | Pass |
| 5 | Patient opens `/book` for that date | New slot is listed as available | |
| 6 | Patient books the new slot | Booking succeeds | |
| 7 | Doctor tries to delete the booked slot | Rejected: linked to an appointment | |
| 8 | Doctor blocks a free slot | Patient no longer sees it | |
| 9 | Doctor unblocks it | Patient sees it again | |
| 10 | Directory: sort by experience, fee, name | List reorders correctly | |
| 11 | Directory: "Accepting Patients" filter | Offline doctors are hidden | |

---

## 5. Limitations and Future Work

- No automated tests yet for the availability endpoints; adding Jest or Supertest tests is the next step.
- Slots must be exactly the doctor's consultation duration; custom lengths are not supported.
- Dates are handled in UTC with the hospital timezone (default `Asia/Kolkata`) used for the "past date" check.
- The calendar manages one slot at a time; bulk creation is not yet available.
