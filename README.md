# Google Meet Mini

A full-stack video conferencing application built with React, Laravel, and MongoDB. Supports real-time video/audio communication, room management, user authentication, and in-call chat.

## Tech Stack

**Frontend**
- React 18 (Vite)
- React Router DOM
- Axios
- Socket.io Client
- WebRTC (native browser API)
- Lucide React (icons)

**Backend**
- Laravel 11 (PHP 8.2)
- MongoDB (via mongodb/laravel-mongodb)
- JWT Authentication (php-open-source-saver/jwt-auth)
- RESTful API

**Infrastructure**
- MongoDB running in Docker
- Node.js signaling server (Socket.io)

## Features

- User registration and login with JWT
- Create and join meeting rooms with unique room codes
- Real-time video and audio via WebRTC peer-to-peer connections
- Mute/unmute audio and toggle camera on/off
- Live participant list with avatars
- Host and participant roles (host badge, crown icon)
- Media state sync — when you mute or turn off camera, others see it instantly
- In-call sidebar chat with real-time messaging
- Chat history saved to MongoDB
- Unread message notification badge
- Meeting history with participant avatars
- User profile page with editable display name
- Rejoin active meetings from dashboard

## Screenshots

<table>
  <tr>
    <td><a href="https://raw.githubusercontent.com/joyal777/google-meet-mini/main/frontend/public/login.png" target="_blank"><img src="https://raw.githubusercontent.com/joyal777/google-meet-mini/main/frontend/public/login.png" width="300"/></a></td>
    <td><a href="https://raw.githubusercontent.com/joyal777/google-meet-mini/main/frontend/public/dashboard.png" target="_blank"><img src="https://raw.githubusercontent.com/joyal777/google-meet-mini/main/frontend/public/dashboard.png" width="300"/></a></td>
    <td><a href="https://raw.githubusercontent.com/joyal777/google-meet-mini/main/frontend/public/room.png" target="_blank"><img src="https://raw.githubusercontent.com/joyal777/google-meet-mini/main/frontend/public/room.png" width="300"/></a></td>
  </tr>
  <tr>
    <td><a href="https://raw.githubusercontent.com/joyal777/google-meet-mini/main/frontend/public/chat-box.png" target="_blank"><img src="https://raw.githubusercontent.com/joyal777/google-meet-mini/main/frontend/public/chat-box.png" width="300"/></a></td>
    <td><a href="https://raw.githubusercontent.com/joyal777/google-meet-mini/main/frontend/public/chat-notification.png" target="_blank"><img src="https://raw.githubusercontent.com/joyal777/google-meet-mini/main/frontend/public/chat-notification.png" width="300"/></a></td>
    <td><a href="https://raw.githubusercontent.com/joyal777/google-meet-mini/main/frontend/public/history-live-statu.png" target="_blank"><img src="https://raw.githubusercontent.com/joyal777/google-meet-mini/main/frontend/public/history-live-statu.png" width="300"/></a></td>
  </tr>
</table>

## Project Structure
```
google-meet-mini/
├── backend/
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   │   ├── AuthController.php
│   │   │   ├── RoomController.php
│   │   │   └── MessageController.php
│   │   └── Models/
│   │       ├── User.php
│   │       ├── Room.php
│   │       └── Message.php
│   └── routes/
│       └── api.php
├── frontend/
│   └── src/
│       ├── api/
│       │   └── axios.js
│       ├── components/
│       │   ├── Avatar.jsx
│       │   └── ChatSidebar.jsx
│       ├── context/
│       │   └── AuthContext.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── Dashboard.jsx
│           ├── Room.jsx
│           └── Profile.jsx
├── server.js
├── docker-compose.yml
└── README.md
```

## Prerequisites

- PHP 8.2+ with MongoDB extension (`php_mongodb.dll`)
- Composer
- Node.js 18+
- Docker Desktop

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/joyal777/google-meet-mini.git
cd google-meet-mini
```

### 2. Start MongoDB with Docker
```bash
docker compose up -d
```

### 3. Setup Laravel backend
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan jwt:secret
```

Update `backend/.env`:
```env
DB_CONNECTION=mongodb
DB_HOST=127.0.0.1
DB_PORT=27017
DB_DATABASE=google_meet_mini
DB_USERNAME=
DB_PASSWORD=
SESSION_DRIVER=file
```

Start Laravel:
```bash
php artisan serve
```

### 4. Setup React frontend
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Start React:
```bash
npm run dev
```

### 5. Start the signaling server
```bash
cd ..
npm install
node server.js
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register new user | No |
| POST | /api/auth/login | Login | No |
| POST | /api/auth/logout | Logout | Yes |
| GET | /api/auth/me | Get current user | Yes |
| PUT | /api/auth/profile | Update profile | Yes |
| POST | /api/rooms | Create room | Yes |
| GET | /api/rooms/history | Get room history | Yes |
| POST | /api/rooms/{code}/join | Join room | Yes |
| POST | /api/rooms/{code}/leave | Leave room | Yes |
| GET | /api/rooms/{code} | Get room details | Yes |
| GET | /api/rooms/{code}/messages | Get chat history | Yes |
| POST | /api/rooms/{code}/messages | Send message | Yes |

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| DB_CONNECTION | mongodb |
| DB_HOST | MongoDB host |
| DB_PORT | MongoDB port (27017) |
| DB_DATABASE | Database name |
| JWT_SECRET | Auto-generated by jwt:secret |
| SESSION_DRIVER | file |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| VITE_API_URL | Laravel API base URL |

## How It Works

1. Users register and login via JWT authentication
2. Host creates a room — a unique room code is generated and stored in MongoDB
3. Participants join using the room code
4. WebRTC peer connections are established via the Socket.io signaling server
5. Video and audio streams are exchanged directly between browsers (peer-to-peer)
6. Media state changes (mute/camera off) are broadcast to all participants via Socket.io
7. In-call chat messages are sent via Socket.io and saved to MongoDB
8. When host leaves, room is marked inactive — history and participants are preserved

## Built With

This project was built as a portfolio project to demonstrate full-stack development skills with React, Laravel, MongoDB, WebRTC, and real-time communication using Socket.io.