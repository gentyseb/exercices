"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const HOST = "localhost";
const PORT = 4200;
const ROOT = __dirname;
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${HOST}`).pathname);
  } catch (error) {
    response.writeHead(400);
    response.end("Invalid URL");
    return;
  }

  const relativePath = pathname.replace(/^[/\\]+/, "") || "index.html";
  const filePath = path.resolve(ROOT, relativePath);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const headers = {
      "Content-Type": CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    };
    response.writeHead(200, headers);

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on("error", (error) => {
      console.error(`Failed to read ${filePath}:`, error);
      if (!response.headersSent) response.writeHead(500);
      response.end("Internal server error");
    });
    stream.pipe(response);
  });
});

server.on("error", (error) => {
  console.error(`Could not start server on http://${HOST}:${PORT}:`, error.message);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`Exercices are available at http://${HOST}:${PORT}`);
});
