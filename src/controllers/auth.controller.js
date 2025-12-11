
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userModel = require('../models/user.model');
const generateOTP = require("../utils/otpGenerator");

require('dotenv').config();

exports.register = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const user = new userModel({
            email,
            password,
            role
        });
        await user.save();
        res.status(201).json({ message: 'User registered' });
    } catch (err) {
        res.status(500).json({ message: 'Registration failed', error: err });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const user = await userModel.findOne({ email: email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (email) user.email = email;
        if (password) user.password = password;
        if (role) user.role = role.toLowerCase();
        await user.save();
        res.status(200).json({ message: 'User updated' });
    }
    catch (err) {
        res.status(500).json({ message: 'Update failed', error: err });
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, role: user.role });
    } catch (err) {
      console.log("Error in login: ", err);
      
        res.status(500).json({ message: 'Login failed', error: err });
    }
};



exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    const otp = generateOTP();

    console.log("Generated OTP →", otp);

    // LOCAL MODE
    if (process.env.USE_FAKE_OTP === "true") {
      return res.json({
        success: true,
        message: "OTP generated (LOCAL MODE)",
        otp, // only for local testing
      });
    }

    // PRODUCTION MODE (SMS SEND)
    await sendSmsToUser(phone, `Your OTP is ${otp}`);

    res.json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
