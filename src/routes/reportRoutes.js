const express = require('express');

function createReportRouter({ reportService, requireAuthorization = true }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const authorization = req.get('X-Vibe-Authorization') || '';
      if (requireAuthorization && !authorization) {
        return res.status(401).json({
          success: false,
          message: 'X-Vibe-Authorization is required',
        });
      }

      const { entityTypeId, itemId, ...filters } = req.query;
      if (!entityTypeId || !itemId) {
        return res.status(400).json({
          success: false,
          message: 'entityTypeId and itemId are required',
        });
      }

      const report = await reportService.buildReport({
        entityTypeId,
        itemId,
        filters,
        authorization,
      });
      return res.json({ success: true, data: report });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
}

module.exports = { createReportRouter };
