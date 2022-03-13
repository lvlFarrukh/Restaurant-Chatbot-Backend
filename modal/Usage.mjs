import mongoose from 'mongoose';

const usage = mongoose.Schema({
    skillName: String,
    clientName: String,
    createdOn: { type: Date, default: Date.now },
})

const Usage = mongoose.model("Usage", usage)

export default Usage;