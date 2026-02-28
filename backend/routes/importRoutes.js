/**
 * Import Routes — CSV / Google Sheets Feedback Import API
 * ========================================================
 * Admin: upload CSV, import Google Sheets, view datasets, analyze, delete
 */
const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All routes require authenticated admin
router.post('/upload-csv', protect, adminOnly, importController.importCSVData);
router.post('/google-sheets', protect, adminOnly, importController.importGoogleSheets);
router.get('/datasets', protect, adminOnly, importController.getDatasets);
router.get('/dataset/:datasetId', protect, adminOnly, importController.getDatasetAnalysis);
router.delete('/dataset/:datasetId', protect, adminOnly, importController.deleteDataset);
router.post('/reanalyze/:datasetId', protect, adminOnly, importController.reanalyzeDataset);
router.post('/process-batch/:datasetId', protect, adminOnly, importController.processBatch);

module.exports = router;
