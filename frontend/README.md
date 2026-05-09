# CipherChat Frontend

The frontend of CipherChat is a modern, cyber-themed React application.

## Tech Stack

- **React**: UI library.
- **Socket.io-client**: Real-time communication.
- **Axios**: API requests.
- **Bootstrap**: Responsive styling.
- **React Router**: Navigation.
- **React Toastify**: Notifications.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- A running CipherChat backend (locally or hosted)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.development` file (optional, defaults to http://localhost:5001/api):
   ```env
   REACT_APP_API_URL=http://localhost:5001/api
   REACT_APP_SERVER_URL=http://localhost:5001
   ```

### Running the Frontend

```bash
npm start
```

The app will be available at `http://localhost:3000`.

## Features

- Real-time chat interface.
- Secure login and registration.
- Friend search and requests.
- Group chat creation and management.
- Image and file sharing.
- Cyberpunk/Matrix inspired design.
