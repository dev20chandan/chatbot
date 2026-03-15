import mongoose from 'mongoose';

const memorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    createdAt: { type: Date, default: Date.now }
});

const Memory = mongoose.model('Memory', memorySchema);
export default Memory;
