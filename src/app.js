const express = require('express');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const connectDB = require('./config/db');
const Batch = require('./models/Batch');
const Ingestion = require('./models/Ingestion');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDB();

// Constants
const PRIORITY_WEIGHTS = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2
};

const BATCH_STATUS = {
    YET_TO_START: 'yet_to_start',
    TRIGGERED: 'triggered',
    COMPLETED: 'completed'
};

// In-memory queue for processing
const batchQueue = [];
let lastProcessedTime = Date.now();
let isProcessing = false;

// Helper Functions
function getOverallStatus(batches) {
    if (batches.every(batch => batch.status === BATCH_STATUS.YET_TO_START)) {
        return BATCH_STATUS.YET_TO_START;
    }
    if (batches.every(batch => batch.status === BATCH_STATUS.COMPLETED)) {
        return BATCH_STATUS.COMPLETED;
    }
    return BATCH_STATUS.TRIGGERED;
}

async function processBatch(batch) {
    return new Promise(resolve => {
        setTimeout(async () => {
            batch.status = BATCH_STATUS.COMPLETED;
            await batch.save();
            resolve(batch);
        }, 5000); // Simulate 5-second processing time
    });
}

async function processQueue() {
    if (isProcessing || batchQueue.length === 0) return;
    
    isProcessing = true;
    
    while (batchQueue.length > 0) {
        const currentTime = Date.now();
        const timeDiff = currentTime - lastProcessedTime;
        
        if (timeDiff < 5000) {
            await new Promise(resolve => setTimeout(resolve, 5000 - timeDiff));
        }
        
        const batchId = batchQueue.shift();
        const batch = await Batch.findOne({ batchId });
        if (batch) {
            await processBatch(batch);
        }
        lastProcessedTime = Date.now();
    }
    
    isProcessing = false;
}

// Routes
app.post('/ingest', async (req, res) => {
    try {
        const { ids, priority } = req.body;
        
        if (!ids || !Array.isArray(ids) || !priority || !PRIORITY_WEIGHTS.hasOwnProperty(priority)) {
            return res.status(400).json({ error: 'Invalid request body' });
        }
        
        const ingestionId = uuidv4();
        const batches = [];
        
        // Create batches of 3 IDs
        for (let i = 0; i < ids.length; i += 3) {
            const batchIds = ids.slice(i, i + 3);
            const batch = await Batch.create({
                batchId: uuidv4(),
                ids: batchIds,
                status: BATCH_STATUS.YET_TO_START,
                priorityWeight: PRIORITY_WEIGHTS[priority]
            });
            batches.push(batch._id);
            
            // Add to priority queue
            batchQueue.push(batch.batchId);
        }
        
        // Sort queue by priority and creation time
        batchQueue.sort(async (a, b) => {
            const batchA = await Batch.findOne({ batchId: a });
            const batchB = await Batch.findOne({ batchId: b });
            if (batchA.priorityWeight !== batchB.priorityWeight) {
                return batchA.priorityWeight - batchB.priorityWeight;
            }
            return batchA.createdAt - batchB.createdAt;
        });
        
        // Create ingestion record
        await Ingestion.create({
            ingestionId,
            batches,
            createdAt: new Date()
        });
        
        // Start processing if not already processing
        if (!isProcessing) {
            processQueue();
        }
        
        res.json({ ingestion_id: ingestionId });
    } catch (error) {
        console.error('Error in ingest:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/status/:ingestionId', async (req, res) => {
    try {
        const { ingestionId } = req.params;
        
        const ingestion = await Ingestion.findOne({ ingestionId })
            .populate('batches');
        
        if (!ingestion) {
            return res.status(400).json({ error: 'Ingestion ID not found' });
        }
        
        res.json({
            ingestion_id: ingestionId,
            status: getOverallStatus(ingestion.batches),
            batches: ingestion.batches.map(({ batchId, ids, status }) => ({
                batch_id: batchId,
                ids,
                status
            }))
        });
    } catch (error) {
        console.error('Error in status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});