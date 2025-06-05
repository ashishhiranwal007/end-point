const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect('mongodb+srv://ashishheranwal007:ashish007@cluster0.hpxzurp.mongodb.net/end-node?retryWrites=true&w=majority&appName=Cluster0');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB; 