import mongoose from 'mongoose';

const errorLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    errorMessage: { type: String, required: true },
    stack: { type: String },
    createdAt: { type: Date, default: Date.now, index: true }
});

const ErrorLog = mongoose.model('ErrorLog', errorLogSchema);
export default ErrorLog;
