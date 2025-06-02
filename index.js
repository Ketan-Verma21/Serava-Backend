// File: Backend/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('./config/mongodb'); // Add MongoDB connection

const calendarRoutes = require('./routes/calendarRoutes');
const aiAgentRoutes = require('./routes/aiAgentRoutes');

const app = express();

// Configure CORS
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(bodyParser.json());

// Routes
app.use('/api', calendarRoutes);
app.use('/api/ai', aiAgentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
