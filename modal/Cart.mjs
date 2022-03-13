import mongoose from 'mongoose';

const card = mongoose.Schema({
    customerName: String,
    customerEmail: String,
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
    createdOn: { type: Date, default: Date.now },
})

const Cart = mongoose.model("cart", card)

export default Cart;