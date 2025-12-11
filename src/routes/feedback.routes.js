const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/', feedbackController.submitFeedback);

router.use(authMiddleware('admin'));

router.get('/', feedbackController.listFeedback);
router.get('/:id', feedbackController.getFeedbackById);
router.put('/:id/reply', feedbackController.replyToFeedback);
router.get('/admin/export', feedbackController.exportFeedbackToExcel);

module.exports = router;
