const axios = require('axios');
require('dotenv').config();

const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
const PAYOS_API_KEY = process.env.PAYOS_API_KEY;

async function createPaymentLink(paymentData) {
  try {
    const response = await axios.post(
      'https://api-merchant.payos.vn/v2/payment-requests',
      paymentData,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': PAYOS_CLIENT_ID,
          'x-api-key': PAYOS_API_KEY,
        },
      }
    );

    if (response.data && response.data.data && response.data.data.checkoutUrl) {
      return response.data.data;
    } else {
      throw new Error('Không nhận được checkoutUrl từ PayOS');
    }
  } catch (error) {
    console.error('Error creating PayOS payment link:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  createPaymentLink,
};
