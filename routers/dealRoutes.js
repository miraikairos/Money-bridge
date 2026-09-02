const express = require('express');
const router = express.Router();

const protect = require('../middleware/authMiddleware'); // ← existing file, untouched
const upload = require('../middleware/upload');
const c = require('../controllers/dealController');

router.post('/create', protect, upload.single('file'), c.createDeal);
router.get('/', protect, c.getDeals);
router.get('/:id', protect, c.getDealById);

router.put('/:id/accept', protect, c.acceptDeal);
router.put('/:id/agree', protect, c.agreeDeal);
router.post('/:id/sample', protect, upload.single('file'), c.uploadSample);
router.put('/:id/approve-sample', protect, c.approveSample);
router.put('/:id/confirm-funding', protect, c.confirmFunding);
router.post('/:id/final-file', protect, upload.single('file'), c.uploadFinalFile);
router.put('/:id/accept-delivery', protect, c.acceptDelivery);
router.put('/:id/cancel', protect, c.cancelDeal);

// Integration points for Member 3 (intentionally NOT JWT-protected)
router.put('/:id/funding-status', c.updateFundingStatus);
router.put('/:id/payment-release', c.releasePayment);

module.exports = router;