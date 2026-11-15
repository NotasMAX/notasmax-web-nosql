import test from "node:test";
import assert from "node:assert/strict";
import { createFrontendFallback } from "../index.js";

function invokeFallback({
  method = "GET",
  path = "/Turmas/123",
  acceptsHtml = true,
  sendFileError,
} = {}) {
  const nextCalls = [];
  let sentPath;
  const middleware = createFrontendFallback("/app/public/index.html");
  const req = {
    method,
    path,
    accepts: (type) => type === "html" && acceptsHtml,
  };
  const res = {
    sendFile(filePath, callback) {
      sentPath = filePath;
      callback(sendFileError);
    },
  };

  middleware(req, res, (error) => nextCalls.push(error));
  return { nextCalls, sentPath };
}

test("frontend fallback serves HTML for browser navigation paths", () => {
  const result = invokeFallback();

  assert.equal(result.sentPath, "/app/public/index.html");
  assert.deepEqual(result.nextCalls, []);
});

test("frontend fallback leaves API, asset, non-GET, and non-HTML requests alone", () => {
  for (const request of [
    { path: "/NotasMax/unknown" },
    { path: "/notasmax/unknown" },
    { path: "/NOTASMAX/unknown" },
    { path: "/assets/missing" },
    { path: "/assets/missing.js" },
    { method: "POST", path: "/Turmas" },
    { acceptsHtml: false, path: "/Turmas" },
  ]) {
    const result = invokeFallback(request);
    assert.equal(result.sentPath, undefined);
    assert.deepEqual(result.nextCalls, [undefined]);
  }
});

test("frontend fallback forwards sendFile errors", () => {
  const error = new Error("frontend file missing");
  const result = invokeFallback({ sendFileError: error });

  assert.equal(result.sentPath, "/app/public/index.html");
  assert.deepEqual(result.nextCalls, [error]);
});
