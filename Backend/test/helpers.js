export function response() {
  return {
    statusCode: undefined,
    body: undefined,
    clearedCookie: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    clearCookie(name) {
      this.clearedCookie = name;
      return this;
    },
    cookie(name, value, options) {
      this.cookieValue = { name, value, options };
      return this;
    },
  };
}
