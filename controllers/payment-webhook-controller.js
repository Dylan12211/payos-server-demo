import express from 'express';
import { db } from '../firebase-admin.js';

const router = express.Router();

router.post('/', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const signature = req.headers["x-signature"];
    const rawBody = req.body.toString('utf8');

    if (req.app.locals.payos.verifyWebhookSignature(rawBody, signature)) {
      const data = JSON.parse(rawBody);
      console.log("✅ Webhook verified:", JSON.stringify(data, null, 2));

      if (data.status === 'PAID') {
        const orderCode = data.orderCode;

        /**
         * ✅ Cách đồng bộ userId với orderCode:
         * Nếu bạn đã embed userId vào orderCode khi tạo payment:
         * Ví dụ: `orderCode: `${Date.now()}_${userId}`
         * thì parse lại:
         */

        const userId = orderCode.split('_')[1];

        if (!userId) {
          console.error("❌ Không tìm thấy userId trong orderCode.");
          return res.status(400).json({ error: "Missing userId" });
        }

        // ✅ Update Firestore
        await db.collection('users').doc(userId).update({
          premium: true,
          premiumActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ User ${userId} đã được nâng cấp Premium.`);
      }

      return res.status(200).json({ message: "Webhook received and processed" });
    } else {
      console.warn("⚠️ Invalid signature, ignoring webhook");
      return res.status(400).json({ error: "Invalid signature" });
    }
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
