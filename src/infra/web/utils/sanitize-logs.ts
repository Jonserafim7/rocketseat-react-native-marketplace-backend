const SENSITIVE_FIELDS = [
  "password",
  "confirmPassword",
  "token",
  "accessToken",
  "refreshToken",
  "cvv",
  "CVV",
  "secret",
  "apiKey",
];

export const sanitizeLogData = (data: any): any => {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    if (
      SENSITIVE_FIELDS.some((field) =>
        key.toLowerCase().includes(field.toLowerCase())
      )
    ) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object") {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
};

export const sanitizeHeaders = (headers: any): any => {
  const sanitized = { ...headers };
  if (sanitized.authorization) {
    sanitized.authorization = "[REDACTED]";
  }
  if (sanitized.cookie) {
    sanitized.cookie = "[REDACTED]";
  }
  return sanitized;
};
