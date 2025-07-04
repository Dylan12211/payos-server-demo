const express = require("express");
const router = express.Router();
const payOS = require("../utils/payos");

// Tạo link thanh toán
router.post("/create", async (req, res) => {
  const { description, returnUrl, cancelUrl, amount } = req.body;

  if (!description || !returnUrl || !cancelUrl || !amount) {
    return res.status(400).json({
      error: -1,
      message: "Thiếu thông tin tạo đơn",
      data: null,
    });
  }

  const body = {
    orderCode: Number(String(new Date().getTime()).slice(-6)),
    amount,
    description,
    cancelUrl,
    returnUrl,
  };

  try {
    const paymentLinkRes = await payOS.createPaymentLink(body);

    return res.status(200).json({
      error: 0,
      message: "Success",
      data: {
        bin: paymentLinkRes.bin,
        checkoutUrl: paymentLinkRes.checkoutUrl,
        accountNumber: paymentLinkRes.accountNumber,
        accountName: paymentLinkRes.accountName,
        amount: paymentLinkRes.amount,
        description: paymentLinkRes.description,
        orderCode: paymentLinkRes.orderCode,
        qrCode: paymentLinkRes.qrCode,
      },
    });
  } catch (error) {
    console.error(error.response?.data || error.message || error);
    return res.status(500).json({
      error: -1,
      message: "Tạo link thanh toán thất bại",
      data: null,
    });
  }
});

// Lấy thông tin order
router.get("/:orderId", async (req, res) => {
  try {
    const order = await payOS.getPaymentLinkInfomation(req.params.orderId);
    if (!order) {
      return res.status(404).json({
        error: -1,
        message: "Không tìm thấy đơn",
        data: null,
      });
    }
    return res.status(200).json({
      error: 0,
      message: "Thành công",
      data: order,
    });
  } catch (error) {
    console.error(error.response?.data || error.message || error);
    return res.status(500).json({
      error: -1,
      message: "Lấy thông tin đơn thất bại",
      data: null,
    });
  }
});

// Hủy đơn
router.put("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancellationReason } = req.body;
    if (!cancellationReason) {
      return res.status(400).json({
        error: -1,
        message: "Thiếu lý do hủy",
        data: null,
      });
    }

    const order = await payOS.cancelPaymentLink(orderId, cancellationReason);
    if (!order) {
      return res.status(404).json({
        error: -1,
        message: "Không tìm thấy đơn",
        data: null,
      });
    }
    return res.status(200).json({
      error: 0,
      message: "Đã hủy đơn thành công",
      data: order,
    });
  } catch (error) {
    console.error(error.response?.data || error.message || error);
    return res.status(500).json({
      error: -1,
      message: "Hủy đơn thất bại",
      data: null,
    });
  }
});

// Xác nhận webhook
router.post("/confirm-webhook", async (req, res) => {
  const { webhookUrl } = req.body;
  if (!webhookUrl) {
    return res.status(400).json({
      error: -1,
      message: "Thiếu webhookUrl",
      data: null,
    });
  }

  try {
    await payOS.confirmWebhook(webhookUrl);
    return res.status(200).json({
      error: 0,
      message: "Xác nhận webhook thành công",
      data: null,
    });
  } catch (error) {
    console.error(error.response?.data || error.message || error);
    return res.status(500).json({
      error: -1,
      message: "Xác nhận webhook thất bại",
      data: null,
    });
  }
});

module.exports = router;
