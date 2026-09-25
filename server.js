import express from 'express';

function registerSnakeRoutes(app, basePath, handlers) {
  app.get(basePath || "/", (req, res) => {
    res.send(handlers.info());
  });

  app.post(`${basePath}/start`, (req, res) => {
    handlers.start(req.body);
    res.send("ok");
  });

  app.post(`${basePath}/move`, (req, res) => {
    res.send(handlers.move(req.body));
  });

  app.post(`${basePath}/end`, (req, res) => {
    handlers.end(req.body);
    res.send("ok");
  });
}

export default function runServer(handlers) {
  const app = express();
  app.use(express.json());

  registerSnakeRoutes(app, "", handlers);
  Object.entries(handlers.variants || {}).forEach(([basePath, variantHandlers]) => {
    registerSnakeRoutes(app, basePath, variantHandlers);
  });

  app.use(function(req, res, next) {
    res.set("Server", "battlesnake/github/starter-snake-javascript");
    next();
  })

  const host = '0.0.0.0';
  const port = process.env.PORT || 8000;

  app.listen(port, host, () => {
    console.log(`Running Battlesnake at http://${host}:${port}...`)
  });
}
