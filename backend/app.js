const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const courseRoutes = require('./routes/courseRoutes');
const uploadFile = require('./routes/uploadFile');
const mysql = require('mysql');

const app = express();
const PORT = process.env.PORT || 5000;

// // Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/courses', courseRoutes);
app.use('/api/upload', uploadFile);

// Start server
app.get('/', (req,res)=>{
res.send("Hello Dear I am under water what about you...");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
