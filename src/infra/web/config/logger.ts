import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { sanitizeLogData, sanitizeHeaders } from "../utils/sanitize-logs";

export const createLoggerOptions = () => {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

  return {
    level: logLevel,
    transport: isDevelopment
      ? {
          target: "pino-pretty",
          options: {
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
            colorize: true,
            singleLine: false,
          },
        }
      : undefined,
    serializers: {
      req: (request: FastifyRequest) => ({
        method: request.method,
        url: request.url,
        hostname: request.hostname,
        remoteAddress: request.ip,
      }),
      res: (reply: FastifyReply) => ({
        statusCode: reply.statusCode,
      }),
    },
  };
};

const shouldSkipLogging = (url: string): boolean => {
  const skipPaths = ["/assets", "/docs", "/health"];
  return skipPaths.some((path) => url.startsWith(path));
};

export const configure = (app: FastifyInstance) => {
  // Log incoming requests
  app.addHook("onRequest", async (request, reply) => {
    if (shouldSkipLogging(request.url)) return;

    (request as any).startTime = Date.now();

    app.log.info(
      {
        type: "request",
        method: request.method,
        url: request.url,
        headers: sanitizeHeaders(request.headers),
        query: request.query,
      },
      "Incoming request"
    );
  });

  // Log responses with timing
  app.addHook("onResponse", async (request, reply) => {
    if (shouldSkipLogging(request.url)) return;

    const duration = Date.now() - ((request as any).startTime || 0);

    const logData: any = {
      type: "response",
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
    };

    // Log request body for POST/PUT/PATCH (sanitized)
    if (["POST", "PUT", "PATCH"].includes(request.method) && request.body) {
      logData.requestBody = sanitizeLogData(request.body);
    }

    app.log.info(logData, `Response sent: ${reply.statusCode}`);
  });

  // Log errors with full context
  app.addHook("onError", async (request, reply, error) => {
    app.log.error(
      {
        type: "error",
        method: request.method,
        url: request.url,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
        },
      },
      "Request error occurred"
    );
  });
};
