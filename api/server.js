import serverless from 'serverless-http';
import { createServer } from '../backend/server.js';

const app = createServer();

export default serverless(app);
