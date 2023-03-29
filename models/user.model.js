const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
});

const User = mongoose.model('User', userSchema, 'users'); // 3rd parameter is the collection name

module.exports = User;