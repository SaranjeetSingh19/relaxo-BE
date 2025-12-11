const axios = require('axios');
require('dotenv').config();
const querystring = require('querystring');

const DIGIALAYA_SMS_URL = 'https://cloudsms.digialaya.com/ApiSmsHttp';

const sendSms = async ({ phone, type, otp, billId }) => {
    if (!phone || !['otp', 'bill'].includes(type)) {
        throw new Error('Invalid SMS request');
    }

    let message = '';
    let templateId = '';

    if (type === 'otp') {
        if (!otp) throw new Error('OTP value is required');
        message = `Dear customer, your one time password to access your billing details is ${otp}. Team Relaxo`;
        templateId = process.env.OTP_TEMPLATE_ID;
    } else if (type === 'bill') {
        if (!billId) throw new Error('Bill ID is required');
        message = `Thank you for shopping at Relaxo! As part of our green initiative, your bill is here: https://digibill.relaxofootwear.com/mybill?b=${billId}`;
        templateId = process.env.BILL_TEMPLATE_ID;
    }

    const params = {
        UserId: process.env.USER_ID,
        pwd: process.env.PASSWORD,
        Message: message,
        Contacts: phone,
        SenderId: process.env.SENDER_ID,
        ServiceName: process.env.SERVICE_NAME,
        MessageType: process.env.MSG_TYPE,
        DLTTemplateId: templateId
    };

    // URL encode params
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${DIGIALAYA_SMS_URL}?${queryString}`;

    console.log('SMS Request URL:', fullUrl); // Log encoded URL

    try {
        const response = await axios.get(fullUrl); // Pass full encoded URL
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error('SMS sending failed:', error?.response?.data || error.message);
        throw new Error('Failed to send SMS');
    }
};


async function sendRelaxoSms({ mobile, shortLink, billCode }) {
  const baseUrl = 'https://cloudsms.digialaya.com/ApiSmsHttp';

  const message = `Dear Sir/Madam\nThanks for shopping at Relaxo.\nAs part of our green initiative, your digital bill awaits: http://truna.me/RELAXO/mcode/x\nHappy Shopping`;

  const queryParams = {
    UserId: process.env.USER_ID,
    pwd: process.env.PASSWORD, // Already encoded string interpreted properly
    Message: message,
    Contacts: mobile,
    SenderId: process.env.SENDER_ID,
    ServiceName:  process.env.SERVICE_NAME,
    MessageType: process.env.MSG_TYPE,
    DLTTemplateId: process.env.BILL_TEMPLATE_ID,
    BitlyUrl: shortLink || `https://digibill.relaxofootwear.com/mybill?b=${billCode}`,
  };

  const finalUrl = `${baseUrl}?${querystring.stringify(queryParams)}`;

  try {
    const response = await axios.get(finalUrl);
    console.log('SMS Sent. Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending SMS:', error.message);
    throw error;
  }
}





const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const formatInputDate = (dateStr) => {
  // Convert "YYYY-MM-DD" → "YYYYMMDD"
  return dateStr.replace(/-/g, '');
};
module.exports = {sendRelaxoSms, sendSms, generateOtp,formatInputDate};