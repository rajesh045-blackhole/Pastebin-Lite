# Project Requirements & Dependencies

This application is currently configured as a lightweight, browser-native React app using ES Modules. Below are the details regarding its dependencies and installation requirements.

## 1. Runtime Dependencies (CDN)

The application runs directly in the browser by fetching dependencies via **CDN (Content Delivery Network)**. These are defined in the `importmap` within `index.html`.

| Library | Version | Description |
| :--- | :--- | :--- |
| **react** | `18.2.0` | Core UI library. |
| **react-dom** | `18.2.0` | DOM rendering bindings. |
| **react-router-dom** | `6.22.3` | Client-side routing. |
| **lucide-react** | `0.344.0` | Icon set. |
| **tailwindcss** | `Latest` | CSS Framework (loaded via script). |

## 2. Prerequisites

To run or develop this application in its current state:

*   **Modern Web Browser**: Chrome, Firefox, Safari, or Edge with support for **ES Modules** and **Import Maps**.
*   **Internet Connection**: Required to load the libraries from `esm.sh` and `cdn.tailwindcss.com`.

## 3. Installing Dependencies Locally (Optional)

If you wish to develop this project in a local Node.js environment (e.g., to use TypeScript checking or build tools like Vite), you will need to install these packages via `npm`.

### Prerequisites for Local Build
*   **Node.js**: v18.0.0 or higher
*   **npm**: v9.0.0 or higher

### Installation Steps

1.  **Initialize Project** (if no `package.json` exists):
    ```bash
    npm init -y
    ```

2.  **Install Production Dependencies**:
    ```bash
    npm install react@18 react-dom@18 react-router-dom@6 lucide-react
    ```

3.  **Install Development Dependencies**:
    ```bash
    npm install -D typescript @types/react @types/react-dom @types/node
    ```

## 4. Deployment

Since the app uses Hash-based routing (`HashRouter`) and external CDNs:

1.  **Build**: No build step is strictly required for the current setup.
2.  **Hosting**: Upload the project files (`index.html`, `index.tsx`, `App.tsx`, etc.) to any static file host (GitHub Pages, Netlify, Vercel, AWS S3).
3.  **Configuration**: Ensure your host serves `index.html` as the entry point.
