export class ApiError extends Error {
  constructor(code, status, message, details) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toResponse() {
    const body = { error: { code: this.code, message: this.message } };
    if (this.details) body.error.details = this.details;
    return body;
  }
}

export function notFound(message = 'Resource not found') {
  return new ApiError('NOT_FOUND', 404, message);
}

export function userNotFound(userId) {
  return new ApiError('USER_NOT_FOUND', 404, `User ${userId} not found`);
}

export function invalidInput(details, message = 'Invalid input') {
  return new ApiError('INVALID_INPUT', 400, message, details);
}

export function schemaVersionUnsupported(got) {
  return new ApiError(
    'SCHEMA_VERSION_UNSUPPORTED',
    400,
    `featureSchemaVersion must be "1.0", got ${JSON.stringify(got)}`,
  );
}

export function targetLeakage(fields) {
  return new ApiError(
    'TARGET_LEAKAGE',
    422,
    'generalIndicators contains forbidden target-leakage fields',
    fields.map((f) => ({ field: `healthHistory.generalIndicators.${f}`, reason: 'forbidden target field' })),
  );
}

export function internalError(message = 'Internal server error') {
  return new ApiError('INTERNAL_ERROR', 500, message);
}
