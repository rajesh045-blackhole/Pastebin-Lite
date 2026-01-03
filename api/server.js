import serverless from 'serverless-http';
import { createServer } from '../pastebinlite-bd/server.js';

const app = createServer();

export default serverless(app);
