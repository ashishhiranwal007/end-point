const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');


const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDB();
app.post('/completed',(req,res)=>{
    console.log("request completed");
})
// Constants

// Error handling middleware
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})