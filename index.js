import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import PayOS from "@payos/node";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const YOUR_DOMAIN = process.env.YOUR_DOMAIN;

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Tạo link thanh toán
app.post("/create-payment-link", async (req, res) => {
  try {
    const { userId, userName, userEmail } = req.body;

    if (!userId || !userName || !userEmail) {
      return res.status(400).json({ error: "Thiếu thông tin cần thiết." });
    }

    const paymentData = {
      orderCode: Date.now(), // Sử dụng timestamp làm orderCode (number, nhỏ hơn MAX_SAFE_INTEGER)
      amount: 20000,
      description: "Nâng cấp Premium", // <= 25 ký tự
      buyerName: userName,
      buyerEmail: userEmail,
      buyerPhone: "0123456789",
      cancelUrl: `${YOUR_DOMAIN}/cancel.html`,
      returnUrl: `${YOUR_DOMAIN}/success.html`,
    };


    console.log("🚀 Sending paymentData to PayOS:", JSON.stringify(paymentData, null, 2));

    const paymentLink = await payos.createPaymentLink(paymentData);

    console.log("✅ checkoutUrl:", paymentLink.checkoutUrl);

    return res.status(200).json({ checkoutUrl: paymentLink.checkoutUrl });
  } catch (error) {
    console.error("❌ Error creating payment link:", error.response?.data || error.message);
    res.status(500).json({ error: "Tạo link thanh toán thất bại", detail: error.response?.data || error.message });
  }
});

// Webhook nhận callback từ PayOS
app.post("/payos-webhook", express.raw({ type: "*/*" }), (req, res) => {
  try {
    const signature = req.headers["x-signature"];
    const rawBody = req.body;

    if (payos.verifyWebhookSignature(rawBody, signature)) {
      const data = JSON.parse(rawBody);
      console.log("✅ Webhook received & verified:", JSON.stringify(data, null, 2));

      /**
       * TODO:
       * - Lấy `orderCode` từ `data`.
       * - Xác minh `status === PAID`.
       * - Update Firestore nâng cấp Premium cho user.
       */

      return res.status(200).json({ message: "Webhook received and verified" });
    } else {
      console.warn("⚠️ Invalid signature, ignoring webhook");
      return res.status(400).json({ error: "Invalid signature" });
    }
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
