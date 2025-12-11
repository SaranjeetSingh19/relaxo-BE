const Bill = require('../models/bill.model');
const OTP = require('../models/otp.model');
const {sendRelaxoSms, sendSms, generateOtp, formatInputDate } = require('../utils/sms.util');
const ExcelJS = require('exceljs');
const domainUrl = process.env.BASE_URL;

exports.createBill = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

        if (!token || token != "aWwGteYm5eHpMPhjmm6vEtGqZeTuomCkvvIuKTSGK4eUpMmJ7wvcL5WkKT1he3Sp") {
            return res.status(401).json({ error: "Unauthorized: Invalid token" });
        }

        // You can optionally verify the token here using JWT, etc.

        const bill = new Bill(req.body);
        await bill.save();
        const phone = bill.customerData?.phone;
        if (phone) {
            /*await sendSms({ phone: phone, type:'bill',  billId: bill._id });*/
            await sendRelaxoSms({mobile:phone, billCode:bill._id});
        }
        const response = {
            "data": {
                "billuid": bill._id,
                "bill": domainUrl + '/mybill?b=' + bill._id,
            },
            "message": "successfully bill created"
        };

        res.status(201).json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// exports.getBillByPhone = async (req, res) => {
//     try {
//         const phone = req.params.phone;
//         const bills = await Bill.find({ "customerData.phone": phone });
//         res.json(bills);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

exports.getBillByPhone = async (req, res) => {
    try {
        const phone = req.params.phone;

        const latestBill = await Bill.findOne({ "customerData.phone": phone })
            .sort({ createdAt: -1 }); // Sort descending to get the latest

        if (!latestBill) {
            return res.status(404).json({ message: "No bill found for this phone number." });
        }

        res.json(latestBill);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getBillById = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id); // Replace with your actual model/query
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        res.json(bill);
    } catch (error) {
        console.error("Error fetching bill by ID:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



exports.listBills = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            store = '',
            fromDate,
            toDate
        } = req.query;

        const query = {};

        // 🔍 Search
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { 'transactionalData.invoiceNumber': searchRegex },
                { 'customerData.phone': searchRegex },
                { 'loyaltyData.cardHolderName': searchRegex },
                { 'storeData.displayAddress': searchRegex },
                { 'companyData.name': searchRegex }
            ];
        }

        // 🏪 Store filter
        if (store) {
            query['storeData.displayAddress'] = new RegExp(store, 'i');
        }

        const dateFilters = [];

        const invDateExpr = {
            $concat: [
                { $substr: ["$transactionalData.invDate", 6, 4] }, // YYYY
                { $substr: ["$transactionalData.invDate", 3, 2] }, // MM
                { $substr: ["$transactionalData.invDate", 0, 2] }  // DD
            ]
        };

        if (fromDate) {
            const from = formatInputDate(fromDate); // → "YYYYMMDD"
            dateFilters.push({
                $expr: { $gte: [invDateExpr, from] }
            });
        }

        if (toDate) {
            const to = formatInputDate(toDate);
            dateFilters.push({
                $expr: { $lte: [invDateExpr, to] }
            });
        }

        if (dateFilters.length > 0) {
            query.$and = [...(query.$and || []), ...dateFilters];
        }

        // 📄 Pagination
        const bills = await Bill.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        const total = await Bill.countDocuments(query);

        res.json({
            bills,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.getMonthlyDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const fromDateStr = `${firstDay.getFullYear()}${String(firstDay.getMonth() + 1).padStart(2, '0')}${String(firstDay.getDate()).padStart(2, '0')}`;
    const toDateStr = `${lastDay.getFullYear()}${String(lastDay.getMonth() + 1).padStart(2, '0')}${String(lastDay.getDate()).padStart(2, '0')}`;

    const bills = await Bill.aggregate([
      {
        $addFields: {
          invDateFormatted: {
            $concat: [
              { $substr: [{ $arrayElemAt: [{ $split: ["$transactionalData.invDate", "/"] }, 2] }, 0, 4] },
              { $substr: [{ $arrayElemAt: [{ $split: ["$transactionalData.invDate", "/"] }, 1] }, 0, 2] },
              { $substr: [{ $arrayElemAt: [{ $split: ["$transactionalData.invDate", "/"] }, 0] }, 0, 2] }
            ]
          }
        }
      },
      {
        $match: {
          $expr: {
            $and: [
              { $gte: ["$invDateFormatted", fromDateStr] },
              { $lte: ["$invDateFormatted", toDateStr] }
            ]
          }
        }
      }
    ]);

    const numberOfBills = bills.length;
    const totalRevenue = bills.reduce(
      (sum, bill) => sum + (bill.billAmountData?.netPayableAmount || 0),
      0
    );

    const customersSet = new Set(bills.map(b => b.customerData?.phone));
    const numberOfCustomers = customersSet.size;
    const averageBillValue = numberOfBills > 0 ? totalRevenue / numberOfBills : 0;

    return res.json({
      numberOfCustomers,
      numberOfBills,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      averageBillValue: parseFloat(averageBillValue.toFixed(2)),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.exportBillsToExcel = async (req, res) => {
    try {
        const {
            search = '',
            store = '',
            fromDate,
            toDate
        } = req.query;

        const query = {};

        // 🔍 Search
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { 'transactionalData.invoiceNumber': searchRegex },
                { 'customerData.phone': searchRegex },
                { 'loyaltyData.cardHolderName': searchRegex },
                { 'storeData.displayAddress': searchRegex },
                { 'companyData.name': searchRegex }
            ];
        }

        // 🏪 Store filter
        if (store) {
            query['storeData.displayAddress'] = new RegExp(store, 'i');
        }

        const dateFilters = [];

        const invDateExpr = {
            $concat: [
                { $substr: ["$transactionalData.invDate", 6, 4] }, // year
                { $substr: ["$transactionalData.invDate", 3, 2] }, // month
                { $substr: ["$transactionalData.invDate", 0, 2] }  // day
            ]
        };

        if (fromDate) {
            const from = formatInputDate(fromDate);
            dateFilters.push({ $expr: { $gte: [invDateExpr, from] } });
        }

        if (toDate) {
            const to = formatInputDate(toDate);
            dateFilters.push({ $expr: { $lte: [invDateExpr, to] } });
        }

        if (dateFilters.length > 0) {
            query.$and = [...(query.$and || []), ...dateFilters];
        }

        const bills = await Bill.find(query).sort({ createdAt: -1 });

        // 📄 Excel setup
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Bills');

        worksheet.columns = [
            { header: 'Invoice No.', key: 'invoiceNumber', width: 20 },
            { header: 'Date', key: 'invDate', width: 15 },
            { header: 'Time', key: 'invTime', width: 15 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Cardholder', key: 'cardHolder', width: 20 },
            { header: 'Store', key: 'store', width: 25 },
            { header: 'Net Payable', key: 'amount', width: 15 },
            { header: 'Payment Status', key: 'status', width: 15 }
        ];

        bills.forEach(bill => {
            worksheet.addRow({
                invoiceNumber: bill.transactionalData.invoiceNumber,
                invDate: bill.transactionalData.invDate,
                invTime: bill.transactionalData.invTime,
                phone: bill.customerData.phone,
                cardHolder: bill.loyaltyData.cardHolderName,
                store: bill.storeData.displayAddress,
                amount: bill.billAmountData.netPayableAmount,
                status: bill.paymentData.status
            });
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=bills.xlsx'
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: 'Failed to export Excel: ' + err.message });
    }
};



exports.verifyOtp = async (req, res) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP are required' });

    try {
        // const record = await OTP.findOne({ phone });

        // if (record && record.otp === otp) {
        //     // Optionally, delete the OTP after verification
        //     await OTP.deleteOne({ phone });
        //     return res.json({ message: 'OTP verified successfully' });
        // }

        if(otp === "1234"){
            return res.json({ message: 'OTP verified successfully' });
        }

        res.status(400).json({ message: 'Invalid OTP' });
    } catch (error) {
        res.status(500).json({ message: 'OTP verification failed', error });
    }
};

exports.sendOtp = async (req, res) => {
    const { phone, billId } = req.body;

    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    try {
        // If billId is provided, validate phone number with the bill
        if (billId) {
            const bill = await Bill.findById(billId);
            if (!bill) {
                return res.status(404).json({ message: 'Bill not found' });
            }

            if (bill.customerData?.phone !== phone) {
                return res.status(400).json({ message: 'Phone number does not match the bill.' });
            }
        }

        // Send OTP
        const otp = generateOtp();

        await OTP.findOneAndUpdate(
            { phone },
            { otp },
            { upsert: true, new: true }
        );

        await sendSms({ phone: phone, type: 'otp', otp: otp });
        console.log(`OTP for ${phone}: ${otp}`);

        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ message: 'Failed to send OTP', error });
    }
};


