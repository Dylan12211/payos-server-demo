const express = require('express');
const router = express.Router();
const axios = require('axios');

const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
const PAYOS_API_KEY = process.env.PAYOS_API_KEY;
const PAYOS_ENDPOINT = process.env.PAYOS_ENDPOINT || 'https://api-merchant.payos.vn';

router.get('/:id', async (req, res) => {
    try {
        const paymentRequestId = req.params.id;

        const response = await axios.get(`${PAYOS_ENDPOINT}/v2/payment-requests/${paymentRequestId}`, {
            headers: {
                'x-client-id': PAYOS_CLIENT_ID,
                'x-api-key': PAYOS_API_KEY,
                'Content-Type': 'application/json',
            },
        });

        if (response.data.code === '00') {
            // Thành công, trả data cho client
            res.json({
                success: true,
                data: response.data.data,
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to get payment request details',
                detail: response.data,
            });
        }
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Server error',
            detail: error.response?.data || error.message,
        });
    }
});

module.exports = router;
