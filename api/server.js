import serverless from 'serverless-http';
import { createServer } from '../server.js';

const app = createServer();

export default serverless(app);
