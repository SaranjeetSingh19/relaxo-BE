const Feedback = require('../models/feedback.model');
const Bill = require('../models/bill.model');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const ObjectId = mongoose.Types.ObjectId;

exports.submitFeedback = async (req, res) => {
    try {
        const feedback = new Feedback(req.body);
        await feedback.save();
        console.log(req.body);
        res.status(201).json(feedback);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.listFeedback = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      store = '',
      fromDate,
      toDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const match = {};

    // 🔍 Search
    if (search) {
      const regex = new RegExp(search, 'i');
      match.$or = [
        { phone: regex },
        { message: regex },
        { bill_id: regex }
      ];
    }

    // 📅 Date filter
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) match.createdAt.$lte = new Date(toDate);
    }

    const pipeline = [
      { $match: match },

      // 🧠 Convert string bill_id to ObjectId
      {
        $addFields: {
          billObjectId: {
            $cond: [
              { $eq: [{ $type: "$bill_id" }, "string"] },
              { $toObjectId: "$bill_id" },
              "$bill_id"
            ]
          }
        }
      },

      {
        $lookup: {
          from: 'bills',
          localField: 'billObjectId',
          foreignField: '_id',
          as: 'billInfo'
        }
      },
      { $unwind: { path: '$billInfo', preserveNullAndEmptyArrays: true } },

      // 🏪 Optional store filter
      ...(store
        ? [{
            $match: {
              'billInfo.storeData.displayAddress': {
                $regex: new RegExp(store, 'i')
              }
            }
          }]
        : []),

      {
        $addFields: {
          storeName: '$billInfo.storeData.displayAddress',
          invoiceNumber: '$billInfo.transactionalData.invoiceNumber'
        }
      },

      {
        $project: {
          phone: 1,
          message: 1,
          stars: 1,
          reply: 1,
          bill_id: 1,
          createdAt: 1,
          updatedAt: 1,
          storeName: 1,
          invoiceNumber: 1 
        }
      },

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ];

    const data = await mongoose.model('Feedback').aggregate(pipeline);

    // 📊 Count
    const countPipeline = [...pipeline];
    countPipeline.splice(countPipeline.findIndex(p => p.$skip !== undefined), 2); // remove $skip & $limit
    countPipeline.push({ $count: 'total' });
    const countResult = await mongoose.model('Feedback').aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    res.json({
      feedback: data,
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


exports.replyToFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;

        const updated = await Feedback.findByIdAndUpdate(id, { reply }, { new: true });

        // Dummy SMS function
        console.log(`Sending SMS to ${updated.phone}: ${reply}`);

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getFeedbackById = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }
        res.status(200).json(feedback);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


exports.exportFeedbackToExcel = async (req, res) => {
  try {
    const {
      search = '',
      store = '',
      fromDate,
      toDate
    } = req.query;

    const match = {};

    // 🔍 Search
    if (search) {
      const regex = new RegExp(search, 'i');
      match.$or = [
        { phone: regex },
        { message: regex },
        { bill_id: regex }
      ];
    }

    // 📅 Date filter
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) match.createdAt.$lte = new Date(toDate);
    }

    const pipeline = [
      { $match: match },

      // 🧠 Convert bill_id to ObjectId
      {
        $addFields: {
          billObjectId: {
            $cond: [
              { $eq: [{ $type: "$bill_id" }, "string"] },
              { $toObjectId: "$bill_id" },
              "$bill_id"
            ]
          }
        }
      },

      {
        $lookup: {
          from: 'bills',
          localField: 'billObjectId',
          foreignField: '_id',
          as: 'billInfo'
        }
      },
      { $unwind: { path: '$billInfo', preserveNullAndEmptyArrays: true } },

      ...(store
        ? [{
            $match: {
              'billInfo.storeData.displayAddress': {
                $regex: new RegExp(store, 'i')
              }
            }
          }]
        : []),

      {
        $addFields: {
          storeName: '$billInfo.storeData.displayAddress',
          invoiceNumber: '$billInfo.transactionalData.invoiceNumber'
        }
      },

      {
        $project: {
          phone: 1,
          message: 1,
          stars: 1,
          reply: 1,
          storeName: 1,
          createdAt: 1,
          invoiceNumber: 1 
        }
      },

      { $sort: { createdAt: -1 } }
    ];

    const feedbackData = await mongoose.model('Feedback').aggregate(pipeline);

    // 🧾 Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Feedback');

    // 📋 Define columns
    worksheet.columns = [
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Message', key: 'message', width: 30 },
      { header: 'Stars', key: 'stars', width: 10 },
      { header: 'Reply', key: 'reply', width: 30 },
      { header: 'Store Name', key: 'storeName', width: 25 },
      { header: 'Invoice Number', key: 'invoiceNumber', width: 25 },
      { header: 'Created At', key: 'createdAt', width: 20 }
    ];

    // 🧩 Add data rows
    feedbackData.forEach(fb => {
      worksheet.addRow({
        phone: fb.phone || '',
        message: fb.message || '',
        stars: fb.stars || '',
        reply: fb.reply || '',
        storeName: fb.storeName || '',
        invoiceNumber: fb.invoiceNumber || '',
        createdAt: fb.createdAt ? new Date(fb.createdAt).toLocaleString() : ''
      });
    });

    // 📤 Set headers and send file
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=feedback.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to export feedback: ' + err.message });
  }
};
