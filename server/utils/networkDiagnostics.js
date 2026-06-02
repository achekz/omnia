// Role du fichier: journalise les integrations reseau sans exposer les secrets.

const SECRET_KEY_PATTERN = /(key|token|secret|password|pass|authorization|cookie|credential)/i;
const SECRET_VALUE_PATTERN = /(accessToken|refreshToken|token|password|apiKey|key)=([^&\s]+)/gi;

function redactString(value = "") {
  return String(value)
    .replace(SECRET_VALUE_PATTERN, "$1=<redacted>")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer <redacted>");
}

export function redactUrl(value = "") {
  try {
    const url = new URL(String(value));
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_KEY_PATTERN.test(key)) {
        url.searchParams.set(key, "<redacted>");
      }
    }
    return url.toString();
  } catch {
    return redactString(value);
  }
}

export function sanitizeForLog(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") return redactString(value);
  if (typeof value !== "object") return value;

  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? "<redacted>" : sanitizeForLog(entry, seen),
    ]),
  );
}

export function logExternalRequest(scope, { method = "GET", url, data, params, metadata } = {}) {
  console.log(`[${scope}] External request`, sanitizeForLog({
    method: String(method || "GET").toUpperCase(),
    url: redactUrl(url),
    params,
    data,
    metadata,
  }));
}

export function logExternalResponse(scope, { method = "GET", url, status, statusText, data, headers, metadata } = {}) {
  console.log(`[${scope}] External response`, sanitizeForLog({
    method: String(method || "GET").toUpperCase(),
    url: redactUrl(url),
    status,
    statusText,
    headers,
    data,
    metadata,
  }));
}

export function logExternalError(scope, error, { method, url, metadata } = {}) {
  const config = error?.config || {};
  const requestUrl = url || config.url || "";
  const baseURL = config.baseURL || "";
  const fullUrl = requestUrl && baseURL && !String(requestUrl).startsWith("http")
    ? `${String(baseURL).replace(/\/$/, "")}/${String(requestUrl).replace(/^\//, "")}`
    : requestUrl;

  console.error(`[${scope}] External request failed`, sanitizeForLog({
    method: method || config.method || "GET",
    url: redactUrl(fullUrl),
    code: error?.code,
    message: error?.message,
    syscall: error?.syscall,
    hostname: error?.hostname,
    port: error?.port,
    command: error?.command,
    responseCode: error?.responseCode,
    response: error?.response || error?.response?.data,
    status: error?.response?.status,
    statusText: error?.response?.statusText,
    responseHeaders: error?.response?.headers,
    responseData: error?.response?.data,
    stack: error?.stack,
    metadata,
  }));
}

export function attachAxiosDiagnostics(client, scope) {
  client.interceptors.request.use((config) => {
    const fullUrl = config.baseURL && config.url && !String(config.url).startsWith("http")
      ? `${String(config.baseURL).replace(/\/$/, "")}/${String(config.url).replace(/^\//, "")}`
      : config.url;

    logExternalRequest(scope, {
      method: config.method,
      url: fullUrl,
      params: config.params,
      data: config.data,
      metadata: {
        timeout: config.timeout,
        baseURL: config.baseURL,
      },
    });
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const fullUrl = response.config?.baseURL && response.config?.url && !String(response.config.url).startsWith("http")
        ? `${String(response.config.baseURL).replace(/\/$/, "")}/${String(response.config.url).replace(/^\//, "")}`
        : response.config?.url;

      logExternalResponse(scope, {
        method: response.config?.method,
        url: fullUrl,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
      });
      return response;
    },
    (error) => {
      logExternalError(scope, error);
      return Promise.reject(error);
    },
  );
}

export function logEnvDiagnostics() {
  const variables = [
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "EMAIL_USER",
    "EMAIL_PASSWORD",
    "EMAIL_PASS",
    "SMTP_HOST",
    "SMTP_PORT",
    "BACKEND_URL",
    "API_URL",
    "VITE_API_URL",
    "FRONTEND_URL",
    "CLIENT_URL",
    "ML_SERVICE_URL",
    "FLASK_AI_URL",
  ];

  console.log("[ENV] Network configuration", Object.fromEntries(
    variables.map((name) => [name, process.env[name] ? "<set>" : "<missing>"]),
  ));
}
