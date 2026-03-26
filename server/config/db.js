const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gnosys-pki';
    await mongoose.connect(uri);
    console.log('MongoDB: Online');
  } catch (err) {
    console.error('MongoDB Error:', err);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;