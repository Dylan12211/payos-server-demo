const axios = require('axios');
require('dotenv').config();

const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
const PAYOS_API_KEY = process.env.PAYOS_API_KEY;
const PAYOS_ENDPOINT = process.env.PAYOS_ENDPOINT || 'https://api-merchant.payos.vn';

if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY) {
  console.error('❌ PAYOS_CLIENT_ID hoặc PAYOS_API_KEY chưa được cấu hình trong .env');
  process.exit(1);
}

console.log('✅ PAYOS CONFIG:');
console.log('PAYOS_CLIENT_ID:', PAYOS_CLIENT_ID);
console.log('PAYOS_API_KEY:', PAYOS_API_KEY ? 'Loaded ✅' : 'Not loaded ❌');
console.log('PAYOS_ENDPOINT:', PAYOS_ENDPOINT);

const headers = {
  'Content-Type': 'application/json',
  'x-client-id': PAYOS_CLIENT_ID,
  'x-api-key': PAYOS_API_KEY,
};

const axiosConfig = { headers, timeout: 10000 };

/**
 * Tạo link thanh toán PayOS
 */
async function createPaymentLink(paymentData) {
  try {
    console.log('🚀 Sending paymentData to PayOS:', JSON.stringify(paymentData, null, 2));

    const response = await axios.post(
      `${PAYOS_ENDPOINT}/v2/payment-requests`,
      paymentData,
      axiosConfig
    );

    console.log('✅ PayOS raw response:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.data && response.data.data.checkoutUrl) {
      console.log('✅ Successfully received checkoutUrl:', response.data.data.checkoutUrl);
      return response.data.data;
    } else {
      console.error('⚠️ PayOS response missing checkoutUrl:', JSON.stringify(response.data, null, 2));
      throw new Error('Không nhận được checkoutUrl từ PayOS');
    }
  } catch (error) {
    console.error('❌ Error creating PayOS payment link:', JSON.stringify(error.response?.data, null, 2) || error.message);
    throw error;
  }
}

/**
 * Lấy thông tin đơn thanh toán
 */
async function getPaymentLinkInformation(paymentRequestId) {
  try {
    console.log(`🚀 Fetching payment info for ID: ${paymentRequestId}`);

    const response = await axios.get(
      `${PAYOS_ENDPOINT}/v2/payment-requests/${paymentRequestId}`,
      axiosConfig
    );

    console.log('✅ PayOS raw response:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.data) {
      return response.data.data;
    } else {
      console.error('⚠️ PayOS response missing data:', JSON.stringify(response.data, null, 2));
      throw new Error('Không nhận được thông tin đơn từ PayOS');
    }
  } catch (error) {
    console.error('❌ Error getting PayOS payment info:', JSON.stringify(error.response?.data, null, 2) || error.message);
    throw error;
  }
}

/**
 * Hủy đơn thanh toán
 */
async function cancelPaymentLink(paymentRequestId, cancellationReason = 'User canceled') {
  try {
    console.log(`🚀 Cancelling payment with ID: ${paymentRequestId}, reason: ${cancellationReason}`);

    const response = await axios.post(
      `${PAYOS_ENDPOINT}/v2/payment-requests/${paymentRequestId}/cancel`,
      { cancellationReason },
      axiosConfig
    );

    console.log('✅ PayOS raw response:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.data) {
      return response.data.data;
    } else {
      console.error('⚠️ PayOS response missing data on cancel:', JSON.stringify(response.data, null, 2));
      throw new Error('Không nhận được phản hồi hủy đơn từ PayOS');
    }
  } catch (error) {
    console.error('❌ Error canceling PayOS payment link:', JSON.stringify(error.response?.data, null, 2) || error.message);
    throw error;
  }
}

/**
 * Xác nhận webhook
 */
async function confirmWebhook(webhookData) {
  try {
    console.log('🚀 Sending confirmWebhook payload to PayOS:', JSON.stringify(webhookData, null, 2));

    const response = await axios.post(
      `${PAYOS_ENDPOINT}/confirm-webhook`,
      webhookData,
      axiosConfig
    );

    console.log('✅ PayOS raw response:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.code === '00') {
      console.log('✅ Webhook confirmed successfully with PayOS');
      return true;
    } else {
      console.error('⚠️ Webhook confirm failed, PayOS response:', JSON.stringify(response.data, null, 2));
      throw new Error('Webhook xác minh thất bại');
    }
  } catch (error) {
    console.error('❌ Error confirming PayOS webhook:', JSON.stringify(error.response?.data, null, 2) || error.message);
    throw error;
  }
}

module.exports = {
  createPaymentLink,
  getPaymentLinkInformation,
  cancelPaymentLink,
  confirmWebhook,
};
