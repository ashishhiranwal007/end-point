const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    batchId: {
        type: String,
        required: true,
        unique: true
    },
    ids: [{
        type: Number,
        required: true
    }],
    status: {
        type: String,
        enum: ['yet_to_start', 'triggered', 'completed'],
        default: 'yet_to_start'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    priorityWeight: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Batch', batchSchema); 