const app = require('./src/app');
const mongoose = require('mongoose');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
            console.log(`Swagger UI at http://localhost:${PORT}/api-docs`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });
