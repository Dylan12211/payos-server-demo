const axios = require('axios');
require('dotenv').config();

const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
const PAYOS_API_KEY = process.env.PAYOS_API_KEY;
const PAYOS_ENDPOINT = process.env.PAYOS_ENDPOINT || 'https://api-merchant.payos.vn';

if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY) {
  console.error('❌ PAYOS_CLIENT_ID hoặc PAYOS_API_KEY chưa được cấu hình trong .env');
  process.exit(1);
}

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
    const response = await axios.post(
      `${PAYOS_ENDPOINT}/v2/payment-requests`,
      paymentData,
      axiosConfig
    );

    if (response.data && response.data.data && response.data.data.checkoutUrl) {
      return response.data.data;
    } else {
      console.error('PayOS response:', JSON.stringify(response.data, null, 2));
      throw new Error('Không nhận được checkoutUrl từ PayOS');
    }
  } catch (error) {
    console.error('Error creating PayOS payment link:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Lấy thông tin đơn thanh toán
 */
async function getPaymentLinkInformation(paymentRequestId) {
  try {
    const response = await axios.get(
      `${PAYOS_ENDPOINT}/v2/payment-requests/${paymentRequestId}`,
      axiosConfig
    );

    if (response.data && response.data.data) {
      return response.data.data;
    } else {
      console.error('PayOS response:', JSON.stringify(response.data, null, 2));
      throw new Error('Không nhận được thông tin đơn từ PayOS');
    }
  } catch (error) {
    console.error('Error getting PayOS payment info:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Hủy đơn thanh toán
 */
async function cancelPaymentLink(paymentRequestId, cancellationReason = 'User canceled') {
  try {
    const response = await axios.post(
      `${PAYOS_ENDPOINT}/v2/payment-requests/${paymentRequestId}/cancel`,
      { cancellationReason },
      axiosConfig
    );

    if (response.data && response.data.data) {
      return response.data.data;
    } else {
      console.error('PayOS response:', JSON.stringify(response.data, null, 2));
      throw new Error('Không nhận được phản hồi hủy đơn từ PayOS');
    }
  } catch (error) {
    console.error('Error canceling PayOS payment link:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Xác nhận webhook
 */
async function confirmWebhook(webhookData) {
  try {
    const response = await axios.post(
      `${PAYOS_ENDPOINT}/confirm-webhook`,
      webhookData,
      axiosConfig
    );

    if (response.data && response.data.code === '00') {
      return true;
    } else {
      console.error('PayOS response:', JSON.stringify(response.data, null, 2));
      throw new Error('Webhook xác minh thất bại');
    }
  } catch (error) {
    console.error('Error confirming PayOS webhook:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  createPaymentLink,
  getPaymentLinkInformation,
  cancelPaymentLink,
  confirmWebhook,
};
