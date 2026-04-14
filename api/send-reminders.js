import admin from 'firebase-admin';

export default async function handler(req, res) {
  try {
    // Check if the environment variable is set
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      return res.status(500).json({ error: 'Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable' });
    }

    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    const db = admin.firestore();
    const messaging = admin.messaging();

    // Get current time in Bangladesh (UTC+6)
    const now = new Date();
    const bdTime = new Date(now.getTime() + (6 * 60 * 60 * 1000));
    const currentHours = bdTime.getUTCHours().toString().padStart(2, '0');
    
    // Format date as "DD MM YYYY" to match the database format
    const todayFormatted = bdTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' ');

    // Fetch all users who have reminders enabled
    const usersSnapshot = await db.collection('users')
      .where('attendanceReminderEnabled', '==', true)
      .get();

    let sentCount = 0;

    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      
      // Skip if no token, orgId, or reminder time
      if (!user.fcmToken || !user.orgId || !user.attendanceReminderTime) continue;

      // Check if the current hour matches the user's reminder hour
      const reminderHour = user.attendanceReminderTime.split(':')[0];
      if (reminderHour !== currentHours) continue;

      // Check if attendance is taken for this org today
      const attendanceSnapshot = await db.collection('attendance')
        .where('orgId', '==', user.orgId)
        .where('date', '==', todayFormatted)
        .limit(1)
        .get();

      // If attendance is not taken, send the notification
      if (attendanceSnapshot.empty) {
        const message = {
          notification: {
            title: 'হাজিরা নেওয়ার সময় হয়েছে!',
            body: 'আজ কি হাজিরা নিয়েছেন? শিক্ষার্থীদের দৈনিক উপস্থিতি নেওয়ার সময় হয়েছে।'
          },
          token: user.fcmToken
        };

        try {
          await messaging.send(message);
          sentCount++;
        } catch (err) {
          console.error('Error sending message to user', doc.id, err);
        }
      }
    }

    res.status(200).json({ success: true, sentCount, message: `Sent ${sentCount} reminders.` });
  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({ error: error.message });
  }
}
