const mongoose = require('mongoose');

const ingestionSchema = new mongoose.Schema({
    ingestionId: {
        type: String,
        required: true,
        unique: true
    },
    batches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Ingestion', ingestionSchema);