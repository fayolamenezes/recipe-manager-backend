const express = require('express');
const router = express.Router();
const { findMatchingRecipes } = require('../controllers/chatbotController');

router.post('/find-matching', findMatchingRecipes);

module.exports = router;
