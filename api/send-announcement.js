import admin from 'firebase-admin';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orgId, title, body, senderName } = req.body;

    if (!orgId || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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

    // Fetch all users in this organization who have an FCM token
    const usersSnapshot = await db.collection('users')
      .where('orgId', '==', orgId)
      .get();

    let sentCount = 0;
    const tokens = [];
    const tokenToUserId = {};

    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      if (user.fcmToken) {
        tokens.push(user.fcmToken);
        tokenToUserId[user.fcmToken] = doc.id;
      }
    }

    if (tokens.length > 0) {
      // Chunk tokensToSend due to Firebase 500 tokens limit for sendEachForMulticast
      const tokenChunks = [];
      for (let i = 0; i < tokens.length; i += 500) {
        tokenChunks.push(tokens.slice(i, i + 500));
      }

      for (const chunk of tokenChunks) {
        const message = {
          notification: {
            title: title,
            body: `${senderName ? senderName + ': ' : ''}${body}`
          },
          tokens: chunk
        };

        try {
          // Send to multiple devices
          const response = await messaging.sendEachForMulticast(message);
          sentCount += response.successCount;
          console.log(`${response.successCount} messages were sent successfully`);

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
                  const userId = tokenToUserId[token];
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
        } catch (err) {
          console.error('Error sending multicast message:', err);
        }
      }
    }

    res.status(200).json({ success: true, sentCount, message: `Sent ${sentCount} notifications.` });
  } catch (error) {
    console.error('Announcement notification error:', error);
    res.status(500).json({ error: error.message });
  }
}
