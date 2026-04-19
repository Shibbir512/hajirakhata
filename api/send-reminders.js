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

    // Filter target users matching the current hour
    const targetUsers = usersSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(u => u.fcmToken && u.orgId && u.attendanceReminderTime && u.attendanceReminderTime.split(':')[0] === currentHours);

    if (targetUsers.length === 0) {
      return res.status(200).json({ success: true, message: 'No reminders to send for this hour.' });
    }

    const uniqueOrgIds = [...new Set(targetUsers.map(u => u.orgId))];
    
    // Batch fetch attendance for these unique organizations
    const orgsWithAttendance = new Set();
    
    // Execute all queries in parallel for efficiency
    await Promise.all(uniqueOrgIds.map(async (currOrgId) => {
      const attSnapshot = await db.collection('organizations').doc(currOrgId).collection('attendance_sessions')
        .where('date', '==', todayFormatted)
        .limit(1)
        .get();
        
      if (!attSnapshot.empty) {
        orgsWithAttendance.add(currOrgId);
      }
    }));

    const tokensToSend = [];
    const tokensToUserIds = {};

    for (const user of targetUsers) {
      if (!orgsWithAttendance.has(user.orgId)) {
        tokensToSend.push(user.fcmToken);
        tokensToUserIds[user.fcmToken] = user.id;
      }
    }

    let sentCount = 0;

    if (tokensToSend.length > 0) {
      // Chunk tokensToSend due to Firebase 500 tokens limit for sendEachForMulticast
      const tokenChunks = [];
      for (let i = 0; i < tokensToSend.length; i += 500) {
        tokenChunks.push(tokensToSend.slice(i, i + 500));
      }

      for (const chunk of tokenChunks) {
        const message = {
          notification: {
            title: 'হাজিরা নেওয়ার সময় হয়েছে!',
            body: 'আজ কি হাজিরা নিয়েছেন? শিক্ষার্থীদের দৈনিক উপস্থিতি নেওয়ার সময় হয়েছে।'
          },
          tokens: chunk
        };
        
        try {
          const response = await messaging.sendEachForMulticast(message);
          sentCount += response.successCount;
          
          // Cleanup stale FCM tokens
          if (response.failureCount > 0) {
            const batch = db.batch();
            let batchCount = 0;
            
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                const error = resp.error;
                if (error && (error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered')) {
                  const token = chunk[idx];
                  const userId = tokensToUserIds[token];
                  if (userId) {
                    batch.update(db.collection('users').doc(userId), { fcmToken: admin.firestore.FieldValue.delete() });
                    batchCount++;
                  }
                }
              }
            });
            
            if (batchCount > 0) {
              await batch.commit();
            }
          }
        } catch (error) {
          console.error("Error sending multicast message:", error);
        }
      }
    }

    res.status(200).json({ success: true, sentCount, message: `Sent ${sentCount} reminders via FCM.` });
  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({ error: error.message });
  }
}
