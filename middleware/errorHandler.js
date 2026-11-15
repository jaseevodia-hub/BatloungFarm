function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      message: 'The request body contains invalid JSON.'
    });
  }

  let statusCode = error.statusCode || 500;
  let message = error.message || 'An unexpected error occurred.';

  if (error.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'A record with the same unique value already exists.';
  } else if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 409;
    message = 'This record is used by other records and cannot be deleted.';
  } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'A related record could not be found. Please check the selected values.';
  } else if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || error.code === 'ER_CHECK_CONSTRAINT_VIOLATION') {
    statusCode = 400;
    message = 'The submitted values violate a database business rule.';
  } else if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_CON_COUNT_ERROR'].includes(error.code)) {
    statusCode = 503;
    message = 'The database is unavailable. Please check the database server and configuration.';
  }

  if (!error.statusCode && statusCode === 500) {
    console.error('[error]', error);
  }

  const payload = { success: false, message };
  if (error.details) payload.details = error.details;

  return res.status(statusCode).json(payload);
}

module.exports = errorHandler;
