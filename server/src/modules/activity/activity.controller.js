const asyncHandler = require('../../utils/asyncHandler');
const activityService = require('./activity.service');

const listMine = asyncHandler(async (req, res) => {
  const result = await activityService.listActivity({
    ...req.query,
    actorId: req.user.id,
    teacherId: undefined,
  });
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

module.exports = { listMine };
