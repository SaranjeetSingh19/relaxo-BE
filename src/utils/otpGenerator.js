function generateOTP() {
  if (process.env.USE_FAKE_OTP === "true") {
    return "123456"; // Local OTP
  }

  // REAL OTP for production
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = generateOTP;
