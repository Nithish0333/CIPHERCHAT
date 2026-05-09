# CipherChat Backend

The backend of CipherChat is a robust Node.js and Express server integrated with MongoDB and Socket.io.

## Tech Stack

- **Node.js & Express**: Server framework.
- **MongoDB & Mongoose**: Database and modeling.
- **Socket.io**: Real-time bidirectional communication.
- **JWT (JsonWebToken)**: Secure authentication.
- **Bcrypt.js**: Password hashing.
- **Multer**: File upload handling.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in a `.env` file:
   ```env
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/cipherchat
   JWT_SECRET=your_secret_key
   NODE_ENV=development
   ```

### Running the Backend

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The API will be available at `http://localhost:5001/api`.

## API Routes

- `/api/auth`: Registration and login.
- `/api/users`: User search and status updates.
- `/api/chats`: Private and group chat management.
- `/api/messages`: Sending and fetching messages.
- `/api/friends`: Friend requests and friend list management.
- `/api/files`: Local file and image uploads.

## Real-time Events (Socket.io)

- `setup`: Join personal user room.
- `join chat`: Join a specific chat room.
- `new message`: Broadcast message to participants.
- `typing` / `stop typing`: Real-time typing indicators.
