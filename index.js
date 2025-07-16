import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import PayOS from "@payos/node";
import admin from "firebase-admin";

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

    const orderCode = Date.now() % 1000000;

    const paymentData = {
      orderCode: orderCode,
      amount: 20000,
      description: "Nang cap Premium",
      buyerName: userName,
      buyerEmail: userEmail,
      buyerPhone: "0123456789",
      cancelUrl: `${YOUR_DOMAIN}/cancel.html`,
      returnUrl: `${YOUR_DOMAIN}/success.html`,
    };

    console.log("🚀 Sending paymentData to PayOS:", JSON.stringify(paymentData, null, 2));

    const paymentLink = await payos.createPaymentLink(paymentData);

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
// ✅ Webhook nhận callback từ PayOS
app.post("/payos-webhook", express.raw({ type: "*/*" }), async (req, res) => {
  try {
    const payload = payos.verifyPaymentWebhookData(req.body);
    console.log("✅ Webhook verified payload:", JSON.stringify(payload, null, 2));

    if (payload.code === "00" && payload.desc === "success") {
      const orderCode = payload.orderCode.toString();

      const paymentDoc = await db.collection('payos_payments').doc(orderCode).get();
      if (!paymentDoc.exists) {
        console.error(`❌ Không tìm thấy orderCode ${orderCode} trong Firestore`);
        return res.status(400).json({ error: "OrderCode not found" });
      }

      const userId = paymentDoc.data().userId;

      // ✅ Tính ngày hết hạn (sau 1 tháng)
      const now = new Date();
      const expiredDate = new Date();
      expiredDate.setMonth(now.getMonth() + 1);

      // ✅ Cập nhật user thành Premium
      await db.collection('users').doc(userId).update({
        premium: true,
        premiumActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        premiumExpiredAt: expiredDate, // Thêm ngày hết hạn
      });

      // ✅ Cập nhật bảng thanh toán
      await db.collection('payos_payments').doc(orderCode).update({
        status: 'SUCCESS',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ User ${userId} đã được nâng cấp Premium. Hết hạn vào: ${expiredDate}`);
    }

    return res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return res.status(500).json({ error: "Server error" });
  }
});




// ✅ Khởi chạy server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
