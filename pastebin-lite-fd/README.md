# Pastebin-Lite

A secure, ephemeral text storage application allowing users to create text pastes with optional time-based expiry (TTL) and view-count limits.

## Project Description

Pastebin-Lite is a Full-Stack Node.js and React application that allows users to:
1.  **Create Pastes**: Encrypt and store arbitrary text.
2.  **Share Links**: Generate unique URLs for sharing.
3.  **Set Constraints**: Apply "Burn after reading" (view limits) or time limits (TTL).

## Architecture

*   **Frontend**: React 18 (Client-side routing via `BrowserRouter`).
*   **Backend**: Node.js + Express.
*   **Persistence**: File-based JSON storage (`database.json`) for simplicity and portability in this assignment.

## How to Run the App Locally

### Prerequisites
*   Node.js v18+
*   npm

### Setup and Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start the Server**:
    ```bash
    npm start
    ```
    This starts the Express server at `http://localhost:3000`.

3.  **Open in Browser**:
    Visit [http://localhost:3000](http://localhost:3000).

*Note: The server handles both the API endpoints (`/api/*`) and serves the frontend static files.*

### Share Links Across Devices (LAN)

By default, paste URLs returned by the backend use the current host (e.g., `localhost`). To open a generated link on another laptop/phone in the same network:

- Find your machine's LAN IP (macOS):
    ```bash
    ipconfig getifaddr en0 || ipconfig getifaddr en1
    ```
- Start the server with `PUBLIC_BASE_URL` so shared links use your IP:
    ```bash
    PUBLIC_BASE_URL="http://<your-ip>:3000" npm start
    ```
- Open the app from another device:
    - `http://<your-ip>:3000` for the home page
    - Generated paste links will look like `http://<your-ip>:3000/#/p/<id>`

If you see connection refused, allow incoming connections for Node.js in your OS firewall and ensure both devices are on the same network.

## Going Live (Production)

- Node (no container):
    ```bash
    # optional: set envs
    export PORT=3000
    export PUBLIC_BASE_URL="http://<your-host>:3000"
    npm run serve
    ```

- Docker:
    ```bash
    docker build -t pastebin-lite:prod .
    docker run --rm -p 3000:3000 \
        -e PUBLIC_BASE_URL="http://<your-host>:3000" \
        --name pastebin-lite pastebin-lite:prod
    ```

- Health check:
    ```bash
    curl http://<your-host>:3000/api/healthz
    ```

Set `PUBLIC_BASE_URL` to your public hostname/IP so generated paste links are reachable for your users.

## API Endpoints

*   `POST /api/pastes`: Create a new paste.
*   `GET /api/pastes/:id`: Retrieve a paste (view count incremented).
*   `GET /api/healthz`: Check server and database health.

## Persistence

The application uses a local file `database.json` to store paste data. This ensures data survives server restarts, satisfying the robustness requirement for local testing.

## Testing Mode

The backend respects the `x-test-now-ms` header to allow deterministic testing of expiry logic.
