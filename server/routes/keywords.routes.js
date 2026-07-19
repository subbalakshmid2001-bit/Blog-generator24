/**
 * Keywords Routes - returns keyword lists from API.json
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const apiJsonPath = path.join(__dirname, '..', '..', 'API.json');
    const raw = fs.readFileSync(apiJsonPath, 'utf8');
    const parsed = JSON.parse(raw);

    // Collect arrays from likely keys (robust fallback)
    const possibleKeys = ['supportedNiches', 'supportedKeywords', 'supporteDNiches', 'supported'];
    let keywords = [];

    possibleKeys.forEach((k) => {
      if (Array.isArray(parsed[k])) {
        keywords = keywords.concat(parsed[k]);
      }
    });

    // If still empty, attempt to read top-level "features" or other lists
    if (keywords.length === 0) {
      Object.keys(parsed).forEach((k) => {
        if (Array.isArray(parsed[k]) && parsed[k].every(item => typeof item === 'string')) {
          keywords = keywords.concat(parsed[k]);
        }
      });
    }

    // Deduplicate
    keywords = Array.from(new Set(keywords)).slice(0, 500);

    res.json({ keywords });
  } catch (err) {
    console.error('Failed to load keywords', err);
    res.status(500).json({ error: 'Failed to load keywords' });
  }
});

module.exports = router;
