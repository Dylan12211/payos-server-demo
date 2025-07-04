const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(), // hoặc sử dụng serviceAccountKey nếu cần
});

const db = admin.firestore();

router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    console.log('✅ PayOS webhook received:', JSON.stringify(payload, null, 2));

    // Kiểm tra nếu giao dịch thành công
    if (payload.status === 'PAID') {
      const userId = payload.userId; // hoặc payload.buyerEmail nếu không có userId

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
      }

      // Cập nhật premium = true
      await db.collection('users').doc(userId).update({
        premium: true,
        premiumActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Updated premium for user: ${userId}`);
    }

    res.status(200).json({ message: 'Webhook received and processed.' });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

module.exports = router;
