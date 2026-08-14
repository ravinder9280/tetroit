import "dotenv/config";
import * as http from "node:http";

import app from "./app.js";
import { initSocket } from "./sockets/index.js";


const port = 3001;

const init = async (): Promise<void> => {
  const server = http.createServer(app);

  const io = initSocket(server);
  console.log(`[socket] Socket.io ready (${io.engine.clientsCount} clients)`);

  server.listen(port, "::", () => {
    console.log(`API http server running on port ${port}`);
  });
};

init();
