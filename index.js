import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import PayOS from "@payos/node";
import admin from "firebase-admin";
import { readFileSync } from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const YOUR_DOMAIN = process.env.YOUR_DOMAIN;

// ✅ Khởi tạo PayOS SDK
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

// ✅ Khởi tạo Firebase Admin sử dụng biến môi trường GOOGLE_APPLICATION_CREDENTIALS_JSON
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON))
  });
}
const db = admin.firestore();

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ API tạo link thanh toán
app.post("/create-payment-link", async (req, res) => {
  try {
    const { userId, userName, userEmail } = req.body;

    if (!userId || !userName || !userEmail) {
      return res.status(400).json({ error: "Thiếu thông tin cần thiết." });
    }

    const orderCode = Date.now() % 1000000; // ✅ 6 số cuối timestamp, tránh vượt MAX_SAFE_INTEGER

    const paymentData = {
      orderCode: orderCode,
      amount: 20000,
      description: "Nang cap Premium", // <= 25 ký tự
      buyerName: userName,
      buyerEmail: userEmail,
      buyerPhone: "0123456789",
      cancelUrl: `${YOUR_DOMAIN}/cancel.html`,
      returnUrl: `${YOUR_DOMAIN}/success.html`,
    };

    console.log("🚀 Sending paymentData to PayOS:", JSON.stringify(paymentData, null, 2));

    const paymentLink = await payos.createPaymentLink(paymentData);

    // ✅ Lưu mapping orderCode ↔ userId để webhook tra ngược
    await db.collection('payos_payments').doc(orderCode.toString()).set({
      userId: userId,
      status: 'PENDING',
      amount: 20000,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ checkoutUrl:", paymentLink.checkoutUrl);

    return res.status(200).json({ checkoutUrl: paymentLink.checkoutUrl });
  } catch (error) {
    console.error("❌ Error creating payment link:", error.response?.data || error.message);
    res.status(500).json({
      error: "Tạo link thanh toán thất bại",
      detail: error.response?.data || error.message,
    });
  }
});

// ✅ Webhook nhận callback từ PayOS
app.post("/payos-webhook", express.raw({ type: "*/*" }), async (req, res) => {
  try {
    const signature = req.headers["x-signature"];
    const rawBody = req.body;

    if (payos.verifyWebhookSignature(rawBody, signature)) {
      const data = JSON.parse(rawBody.toString('utf8'));
      console.log("✅ Webhook received & verified:", JSON.stringify(data, null, 2));

      if (data.status === 'PAID') {
        const orderCode = data.orderCode.toString();

        // ✅ Lấy userId từ Firestore mapping
        const paymentDoc = await db.collection('payos_payments').doc(orderCode).get();

        if (!paymentDoc.exists) {
          console.error("❌ Không tìm thấy orderCode trong Firestore:", orderCode);
          return res.status(400).json({ error: "OrderCode not found" });
        }

        const userId = paymentDoc.data().userId;

        // ✅ Cập nhật user Premium
        await db.collection('users').doc(userId).update({
          premium: true,
          premiumActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // ✅ Update trạng thái thanh toán
        await db.collection('payos_payments').doc(orderCode).update({
          status: 'PAID',
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
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

// ✅ Khởi chạy server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
