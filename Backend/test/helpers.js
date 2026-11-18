export function response() {
  return {
    statusCode: undefined,
    body: undefined,
    clearedCookie: undefined,
    clearedCookieOptions: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    clearCookie(name, options) {
      this.clearedCookie = name;
      this.clearedCookieOptions = options;
      return this;
    },
    cookie(name, value, options) {
      this.cookieValue = { name, value, options };
      return this;
    },
  };
}
