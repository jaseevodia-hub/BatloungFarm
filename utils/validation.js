const ApiError = require('./ApiError');
const {
  PROVINCES,
  PACKAGING_SIZES,
  PAYMENT_METHODS,
  SETTLEMENT_METHODS,
  FRUIT_STATUSES
} = require('./constants');

const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

function requiredString(value, field, maxLength = 255) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ApiError.badRequest(`${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw ApiError.badRequest(`${field} must not exceed ${maxLength} characters.`);
  }
  return trimmed;
}

function optionalString(value, field, maxLength = 255) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw ApiError.badRequest(`${field} must be text.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw ApiError.badRequest(`${field} must not exceed ${maxLength} characters.`);
  }
  return trimmed.length ? trimmed : null;
}

function phoneNumber(value, field = 'Phone number') {
  const phone = requiredString(value, field, 20);
  if (!PHONE_PATTERN.test(phone)) {
    throw ApiError.badRequest(`${field} is not valid. Use digits, spaces, +, - or brackets.`);
  }
  return phone;
}

function enumValue(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw ApiError.badRequest(`${field} must be one of: ${allowed.join(', ')}.`);
  }
  return value;
}

function province(value) {
  return enumValue(value, 'Province', PROVINCES);
}

function packagingSize(value, field = 'Packaging size') {
  return enumValue(value, field, PACKAGING_SIZES);
}

function fruitStatus(value) {
  return enumValue(value, 'Status', FRUIT_STATUSES);
}

function paymentMethod(value) {
  return enumValue(value, 'Payment method', PAYMENT_METHODS);
}

function settlementMethod(value) {
  return enumValue(value, 'Payment method', SETTLEMENT_METHODS);
}

function positiveInteger(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw ApiError.badRequest(`${field} must be a whole number greater than zero.`);
  }
  return number;
}

function nonNegativeNumber(value, field) {
  const number = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(number) || number < 0) {
    throw ApiError.badRequest(`${field} must be a number of zero or more.`);
  }
  return Math.round(number * 100) / 100;
}

function positiveMoney(value, field) {
  const number = nonNegativeNumber(value, field);
  if (number <= 0) {
    throw ApiError.badRequest(`${field} must be greater than zero.`);
  }
  return number;
}

function positiveId(value, field = 'ID') {
  return positiveInteger(value, field);
}

function coordinate(value, field, limit) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > limit) {
    throw ApiError.badRequest(`${field} must be a number between -${limit} and ${limit}.`);
  }
  return Math.round(number * 1000000) / 1000000;
}

function dateOnly(value, field = 'Date', { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw ApiError.badRequest(`${field} is required.`);
    return null;
  }
  const text = String(value).slice(0, 10);
  const parsed = new Date(`${text}T00:00:00`);
  if (Number.isNaN(parsed.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw ApiError.badRequest(`${field} must be a valid date (YYYY-MM-DD).`);
  }
  return text;
}

function optionalDateRange(startDate, endDate) {
  const start = dateOnly(startDate, 'Start date', { required: false });
  const end = dateOnly(endDate, 'End date', { required: false });
  if (start && end && start > end) {
    throw ApiError.badRequest('Start date cannot be after the end date.');
  }
  return { start, end };
}

function pricesObject(value, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw ApiError.badRequest('Selling prices are required for all packaging sizes.');
    return null;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw ApiError.badRequest('Prices must be an object containing SMALL, MEDIUM and LARGE values.');
  }

  const prices = {};
  for (const size of PACKAGING_SIZES) {
    if (value[size] === undefined || value[size] === null || value[size] === '') {
      throw ApiError.badRequest(`A selling price is required for the ${size.toLowerCase()} packaging size.`);
    }
    prices[size] = positiveMoney(value[size], `${size} price`);
  }

  const distinct = new Set(Object.values(prices));
  if (distinct.size !== PACKAGING_SIZES.length) {
    throw ApiError.badRequest('Each packaging size must have a different selling price.');
  }
  return prices;
}

function ensureNonEmptyArray(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw ApiError.badRequest(`${field} must contain at least one item.`);
  }
  return value;
}

module.exports = {
  requiredString,
  optionalString,
  phoneNumber,
  enumValue,
  province,
  packagingSize,
  fruitStatus,
  paymentMethod,
  settlementMethod,
  positiveInteger,
  nonNegativeNumber,
  positiveMoney,
  positiveId,
  coordinate,
  dateOnly,
  optionalDateRange,
  pricesObject,
  ensureNonEmptyArray
};
