import mongoose from 'mongoose';

const order = mongoose.Schema({
    customerName: String,
    customerEmail: String,
    orderId: String,
    status: { type: String, default: 'pending' },
    items: [{
        dishName: String,
        quantity: Number,
    }],
    baverages: [
        {
            beverageFlavour: String,
            size: String,
        }
    ],
    totalBill: {type: Number, default: 0},
    createdOn: { type: Date, default: Date.now },
})

const Order = mongoose.model("order", order)

export default Order;