# Project Context & Memory: Student Attendance & Management System

## 1. Project Overview
This is a multi-tenant, role-based Student Attendance and Academic Management Web Application built for Madrasas/Schools. The UI is primarily in **Bengali**. It allows organizations to manage students, classes, daily attendance, exam results, and announcements.

## 2. Tech Stack
*   **Frontend:** React 19, Vite, TypeScript, Tailwind CSS.
*   **Icons & UI:** Lucide React, Framer Motion, React Hot Toast.
*   **Backend & Database:** Firebase (Auth, Firestore, Storage).
*   **Push Notifications:** Firebase Cloud Messaging (FCM).
*   **Hosting & Serverless:** Vercel (Frontend hosting, Serverless Functions for APIs, Cron Jobs).
*   **PDF/Export:** jsPDF, html2canvas, docx, papaparse.

## 3. Role-Based Access Control (RBAC)
*   **Super Admin:** Can manage all organizations, approve/block orgs, and view global stats. (Hardcoded email: shibbir.ahma.2025@gmail.com).
*   **Org Admin (Admin):** Can manage their specific organization, approve teachers, manage classes, subjects, students, and global org settings.
*   **Teacher:** Can take attendance, enter exam marks, and view reports for their assigned organization.

## 4. Key Features & Modules
*   **Multi-Tenant:** Uses `orgId` to separate data between different institutions.
*   **Student Management:** Add, edit, archive, promote, and manage struck-off (খারিজ) students.
*   **Attendance System:** Daily attendance tracking (Present, Absent, Leave). Includes WhatsApp integration to notify parents of absent students.
*   **Result Management:** Create exams, enter marks, generate PDF marksheets, and a public URL for students to check results using their Roll and Org Code.
*   **Push Notifications (FCM):**
    *   *Local/Foreground:* In-app toasts for reminders and requests.
    *   *Serverless/Background:* Vercel API (`/api/send-announcement.js`) sends multicast push notifications to all teachers when an admin posts an announcement.
    *   *Cron Jobs:* Vercel Cron (`/api/send-reminders.js`) runs hourly to check if attendance was taken and sends FCM reminders to teachers based on their preferred time.

## 5. Firestore Database Schema (Key Collections)
*   `users`: Stores user profile, `role`, `orgId`, `fcmToken`, and `notificationPreferences`.
*   `students`: Stores student info, `orgId`, `classId`, `roll`, `status` (active/archived/struck_off).
*   `classes` & `subjects`: Academic structure per organization.
*   `attendance`: Daily attendance records. Document ID is usually a combination of date and class.
*   `results` & `exams`: Stores exam definitions and student marks.
*   `announcements`: Organization-wide notices.
*   `globalSettings`: System-wide configurations (e.g., `isApprovalEnabled`).

## 6. Important Architectural Rules for AI Agents
1.  **Language:** All user-facing text, alerts, and toasts MUST be in **Bengali**.
2.  **Firebase Security:** Always include `orgId` in Firestore queries to ensure data isolation.
3.  **Push Notifications:** FCM is configured. The Service Worker is at `/public/firebase-messaging-sw.js`. Backend logic for FCM is in `/api/` (Vercel Serverless Functions). Do not break the Vercel API routes.
4.  **Date Formatting:** Use `en-GB` format (`dd mm yyyy`) for storing dates in Firestore to maintain consistency across the app.
5.  **UI Components:** Use Tailwind CSS for styling. Avoid adding new CSS files. Use `react-hot-toast` for notifications.
6.  **Environment Variables:** Vercel uses `FIREBASE_SERVICE_ACCOUNT_KEY` for the Admin SDK. Client uses `firebase-applet-config.json`.

## 7. Recent Updates
*   Added "Leave" (ছুটি) status in the attendance system.
*   Integrated Firebase Cloud Messaging (FCM) for push notifications.
*   Added Vercel Serverless Functions for automated attendance reminders (Cron) and instant announcement notifications.
