const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const payOS = require('./utils/payos');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const YOUR_DOMAIN = process.env.YOUR_DOMAIN || 'http://localhost:3030';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/', express.static('public'));
app.use('/payment', require('./controllers/payment-controller'));
app.use('/order', require('./controllers/order-controller'));
app.use('/payment-request', require('./controllers/payment-request-controller'));

app.post('/create-payment-link', async (req, res) => {
  try {
    const { userId, userName, userEmail } = req.body;

    if (!userId || !userName || !userEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const body = {
      orderCode: `ORDER_${userId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      amount: 20000,
      description: `Nâng cấp Premium cho ${userName}`,
      buyerName: userName,
      buyerEmail: userEmail,
      buyerPhone: "0123456789",
      cancelUrl: `${YOUR_DOMAIN}/cancel.html`,
      returnUrl: `${YOUR_DOMAIN}/success.html`,
    };

    console.log('Sending paymentData to PayOS:', JSON.stringify(body, null, 2));

    const paymentLinkResponse = await payOS.createPaymentLink(body);

    if (paymentLinkResponse.checkoutUrl) {
      return res.status(200).json({
        checkoutUrl: paymentLinkResponse.checkoutUrl
      });
    } else {
      console.error('PayOS did not return checkoutUrl:', paymentLinkResponse);
      res.status(500).json({ error: 'Failed to create payment link', detail: paymentLinkResponse });
    }
  } catch (error) {
    console.error('Error creating payment link:', error.response?.data || error.message);
    res.status(500).json({ error: 'Server error', detail: error.response?.data || error.message });
  }
});

// ✅ Thêm webhook tại đây:
app.post('/payos-webhook', async (req, res) => {
  console.log('✅ Received PayOS webhook:', JSON.stringify(req.body, null, 2));

  // TODO: Xử lý webhook để cập nhật trạng thái thanh toán hoặc cấp Premium tại đây.

  res.status(200).json({ message: 'Webhook received successfully' });
});
app.get('/my-ip', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  res.send(`Your server public IP might be: ${ip}`);
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
