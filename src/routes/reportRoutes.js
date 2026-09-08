const express = require('express');
const { parseHoursMinutesToSeconds } = require('../report/time');

function createReportRouter({ reportService, requireAuthorization = true }) {
  const router = express.Router();

  function readAuthorization(req, res) {
    const authorization = req.get('X-Vibe-Authorization') || '';
    if (requireAuthorization && !authorization) {
      res.status(401).json({
        success: false,
        message: 'X-Vibe-Authorization is required',
      });
      return null;
    }

    return authorization;
  }

  router.get('/', async (req, res) => {
    try {
      const authorization = readAuthorization(req, res);
      if (authorization === null) {
        return undefined;
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

  router.patch('/tasks/:taskId/planned-time', async (req, res) => {
    try {
      const authorization = readAuthorization(req, res);
      if (authorization === null) {
        return undefined;
      }

      const plannedSeconds = parseHoursMinutesToSeconds(req.body?.plannedText);
      const result = await reportService.updateTaskPlannedTime({
        taskId: req.params.taskId,
        plannedSeconds,
        authorization,
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      const status = /time|required|minutes/i.test(error.message) ? 400 : 500;
      if (status >= 500) {
        console.error(error);
      }
      return res.status(status).json({ success: false, message: error.message });
    }
  });

  return router;
}

module.exports = { createReportRouter };
