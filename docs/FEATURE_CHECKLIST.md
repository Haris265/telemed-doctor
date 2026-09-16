# PatientCare — Feature Checklist

Use this document for the website Features page and product claims.

**Legend**

| Status | Meaning |
|--------|---------|
| Live | Built and usable today |
| Partial | Backend or flow exists; UI / polish incomplete |

---

## 1. Patient

### Live

- [ ] Book appointment on WhatsApp (no app install required)
- [ ] Request OTP on WhatsApp for patient app login
- [ ] Book by speciality → doctor → clinic → date → time slot
- [ ] Find nearby clinics (location-based)
- [ ] View clinic details and browse specialities
- [ ] Live queue / token position (“how many ahead”)
- [ ] Receive doctor visit photos and voice notes on WhatsApp after visit
- [ ] View past visit reports / history in the patient app
- [ ] Symptom checker (rule-based urgency + suggested speciality)
- [ ] Patient profile and sign out

---

## 2. Doctor

### Live

- [ ] Secure doctor login (email / password)
- [ ] Today’s OPD dashboard (queue + stats)
- [ ] Appointments list with filters (today, future, completed, rejected)
- [ ] Search appointments
- [ ] Book appointment for a patient (walk-in / by phone)
- [ ] Appointment detail (token, patient, clinic, timing)
- [ ] Start / end visit timer
- [ ] Complete or reject visit (optional rejection reason)
- [ ] Capture visit photos and voice notes
- [ ] Auto-send visit media to patient WhatsApp on complete
- [ ] Patients list and search
- [ ] Patient profile and visit history
- [ ] Manage clinics (add / edit / delete; address, city, area, phone)
- [ ] Set primary clinic
- [ ] Weekly clinic schedule (per weekday time windows)
- [ ] Profile (name, specialities, session length)
- [ ] Connect own WhatsApp Business number
- [ ] Disconnect WhatsApp number
- [ ] Patients book on doctor’s connected WhatsApp (clinics & slots for that doctor only)

### Partial

- [ ] SOAP / clinical notes (API ready; not in doctor app UI yet)
- [ ] Digital prescriptions (API ready; no compose UI in doctor app yet)
- [ ] Doctor subscription / billing (models & admin API; no doctor billing screen)

---

## 3. WhatsApp bot

### Live

- [ ] Main menu: OTP | Book appointment | My appointments
- [ ] Guided booking: speciality → doctor → clinic → date → slot → confirm
- [ ] Type doctor name to find doctor (marketplace / platform number)
- [ ] Per-doctor number: skip speciality/doctor pickers; show that doctor’s clinics and slots only
- [ ] First-time patient name capture
- [ ] Booking confirmation with clinic token code
- [ ] View upcoming appointments
- [ ] Meta webhook for live messages
- [ ] Simulate endpoint for local testing (DEBUG)

### Partial

- [ ] Meta Embedded Signup for doctor connect (code exists; config / production onboarding still fragile vs manual connect)
- [ ] Patient app “Book on WhatsApp” still uses clinic / platform default number (not always the doctor’s connected number)

---

## 4. Platform / Admin

### Live

- [ ] Specialities catalog
- [ ] Clinics and doctor–clinic linking
- [ ] Weekly doctor availability / session length
- [ ] Token-based daily appointments (Pakistan time)
- [ ] Roles: admin, doctor, patient
- [ ] Admin onboarding of doctors
- [ ] Admin: specialities, clinics, patients, appointments
- [ ] Doctor subscriptions / deactivate unsubscribed doctors (backend)
- [ ] Django Admin for ops (users, doctors, clinics, WhatsApp accounts, etc.)
- [ ] Admin REST API (`/api/admin/`)

---

## 5. Website copy guide

### Safe to claim on the marketing site (Live)

| Short title | One-line description |
|-------------|----------------------|
| WhatsApp booking | Patients book a clinic token on WhatsApp — no app required |
| Doctor OPD queue | Doctors run today’s token queue from their phone |
| Clinic hours | Doctors manage clinics and weekly timings |
| Visit media to WhatsApp | Photos and voice notes go to the patient after the visit |
| Own WhatsApp number | Doctors connect their Business WhatsApp for patient booking |
| Live queue | Patients see their token position |
| Nearby clinics | Find clinics near you and book by speciality |
| Symptom guidance | Quick triage suggests the right speciality |

### Suggested hero supporting line

> Patients book on WhatsApp. Doctors manage the OPD queue, clinics, and visit notes from their phone — with media delivered to the patient’s WhatsApp.

---

## 6. Product flow (for “How it works”)

1. Doctor connects WhatsApp and sets clinics + weekly hours  
2. Patient messages the doctor’s WhatsApp number  
3. Bot shows that doctor’s clinics and available slots  
4. Patient confirms → receives token  
5. Doctor sees the patient in today’s queue  
6. Doctor completes visit → photos / voice notes sent to patient WhatsApp  

---

## 7. Checklist for website editors

Before publishing a feature on the site:

1. Is it marked **Live** in this doc?  
2. If **Partial**, phrase carefully or omit from the public Features page.  
3. Prefer patient outcomes (“book on WhatsApp”) over internal tech names (“FSM”, “phone_number_id”).  

---

*Generated from the PatientCare / telemed monorepo (doctor app, patient app, Django API, WhatsApp bot). Update this file when features ship.*
