const axios = require('axios');
const crypto = require('crypto');
const Order = require('../models/Order');
const { BadRequestError, NotFoundError, UnauthenticatedError } = require('../errors');
const { StatusCodes } = require('http-status-codes');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const paystack = axios.create({
    baseURL: PAYSTACK_BASE_URL,
    headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
    },
});

// Paystack requires an email even for a MoMo-only charge. Most of your users
// won't have one (phone-first signup), so we synthesize a stable placeholder
// tied to the order — Paystack never actually emails this address.
const emailForOrder = (order) => `order-${order._id}@seedbridge.app`;

// =========================
// POST /payments/charge
// Kicks off a MoMo charge for an order. Works from both the web app
// (buyer taps "Pay") and the USSD flow (see ussd.controller.js).
// =========================
const chargeMobileMoney = async (req, res) => {
    const { orderId, phone, provider } = req.body;

    if (!orderId || !phone || !provider) {
        throw new BadRequestError('Please provide orderId, phone and provider (mtn, vod, or atl)');
    }

    if (!['mtn', 'vod', 'atl'].includes(provider)) {
        throw new BadRequestError('provider must be one of: mtn, vod, atl');
    }

    const order = await Order.findById(orderId);
    if (!order) {
        throw new NotFoundError(`No order with id: ${orderId}`);
    }

    if (order.paymentStatus !== 'unpaid') {
        throw new BadRequestError(`This order is already ${order.paymentStatus}`);
    }

    // Amount owed: full amount, minus any deposit already paid.
    const amountDue = order.totalAmount - (order.depositPaid || 0);
    // Paystack expects the amount in the currency's smallest unit (pesewas for GHS).
    const amountInPesewas = Math.round(amountDue * 100);

    const reference = `sb_${order._id}_${Date.now()}`;

    let response;
    try {
        response = await paystack.post('/charge', {
            email: emailForOrder(order),
            amount: amountInPesewas,
            currency: 'GHS',
            reference,
            mobile_money: { phone, provider },
        });
    } catch (err) {
        const message = err.response?.data?.message || err.message;
        throw new BadRequestError(`Payment initiation failed: ${message}`);
    }

    const data = response.data.data;

    order.paystackReference = reference;
    order.paymentProvider = provider;
    order.paymentGatewayResponse = data.status; // e.g. "pay_offline", "send_otp", "success"
    await order.save();

    // data.status will be "send_otp" for providers (e.g. Vodafone/Telecel)
    // that require the customer to confirm with a code, or "pay_offline"
    // for providers (e.g. MTN) where the customer just approves on their
    // phone — no OTP step needed on your end for the latter.
    return res.status(StatusCodes.OK).json({
        reference,
        status: data.status,
        displayText: data.display_text || null,
    });
};

// =========================
// POST /payments/submit-otp
// Only needed when chargeMobileMoney returned status: "send_otp".
// =========================
const submitOtp = async (req, res) => {
    const { reference, otp } = req.body;

    if (!reference || !otp) {
        throw new BadRequestError('Please provide reference and otp');
    }

    let response;
    try {
        response = await paystack.post('/charge/submit_otp', { reference, otp });
    } catch (err) {
        const message = err.response?.data?.message || err.message;
        throw new BadRequestError(`OTP submission failed: ${message}`);
    }

    const data = response.data.data;

    return res.status(StatusCodes.OK).json({
        reference,
        status: data.status,
    });
};

// =========================
// GET /payments/verify/:reference
// Lets the frontend poll for the final status while waiting on the
// customer to approve the charge on their phone.
// =========================
const verifyPayment = async (req, res) => {
    const { reference } = req.params;

    let response;
    try {
        response = await paystack.get(`/transaction/verify/${reference}`);
    } catch (err) {
        const message = err.response?.data?.message || err.message;
        throw new BadRequestError(`Verification failed: ${message}`);
    }

    const data = response.data.data;

    if (data.status === 'success') {
        await markOrderPaid(reference, data);
    }

    return res.status(StatusCodes.OK).json({
        status: data.status,
        amount: data.amount / 100,
    });
};

// Shared helper: marks the matching order as paid. Called from both the
// verify endpoint (polling) and the webhook (authoritative, async).
const markOrderPaid = async (reference, gatewayData) => {
    const order = await Order.findOne({ paystackReference: reference });
    if (!order) return;

    if (order.paymentStatus === 'released' || order.paymentStatus === 'escrow_held') {
        return; // already processed — webhook and poll can race, this makes it idempotent
    }

    order.paymentStatus = 'escrow_held'; // held until delivery is confirmed; adjust to your settlement flow
    order.paymentGatewayResponse = gatewayData?.gateway_response || 'success';
    if (order.status === 'pending') {
        order.status = 'confirmed';
    }
    await order.save();
};

// =========================
// POST /payments/webhook
// Paystack's authoritative notification — must read the RAW body (see
// app.js) so the signature can be verified before trusting the payload.
// =========================
const paystackWebhook = async (req, res) => {
    const signature = req.headers['x-paystack-signature'];
    const rawBody = req.body; // Buffer, thanks to express.raw() in app.js

    const expectedSignature = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
        .update(rawBody)
        .digest('hex');

    if (signature !== expectedSignature) {
        // Do not process — this request did not actually come from Paystack.
        return res.sendStatus(StatusCodes.UNAUTHORIZED);
    }

    const event = JSON.parse(rawBody.toString('utf8'));

    if (event.event === 'charge.success') {
        await markOrderPaid(event.data.reference, event.data);
    }

    // Paystack just needs a 200 to know we received it — respond immediately,
    // don't make it wait on anything slow.
    return res.sendStatus(StatusCodes.OK);
};

module.exports = {
    chargeMobileMoney,
    submitOtp,
    verifyPayment,
    paystackWebhook,
};