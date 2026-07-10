const mongoose = require("mongoose");

const LogisticsRequestSchema = new mongoose.Schema({
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    requesterName: { type: String },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    driverName: { type: String, default: null },
    driverPhone: { type: String, default: null },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        default: null,
    },
    pickupRegion: { type: String, required: true },
    pickupCommunity: { type: String, default: null },
    pickupPoint: { type: String, default: null },
    dropoffLocation: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, default: null },
    totalWeightKg: { type: Number, default: null },
    estimatedFee: { type: Number, default: null },
    agreedFee: { type: Number, default: null },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'],
        default: 'pending',
    },
    trackingNote: { type: String, default: null },
    isMilkRun: { type: Boolean, default: false },
    isBackhaul: { type: Boolean, default: false },
}, { timestamps: true });

const LogisticsRequest = mongoose.model("LogisticsRequest", LogisticsRequestSchema);
module.exports = LogisticsRequest;