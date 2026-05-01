const success = (res, data, message = 'OK', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const error = (res, message = 'Something went wrong', statusCode = 400, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

const paginated = (res, data, total, page, limit, message = 'OK') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit) || 1,
    },
  });
};

module.exports = { success, error, paginated };
