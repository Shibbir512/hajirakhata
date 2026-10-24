export default async function handler(req, res) {
  // Push notifications have been completely disabled
  return res.status(200).json({ success: true, message: 'Push notifications are disabled.' });
}
