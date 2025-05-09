# Notes API

A secure and scalable REST API for managing notes with user authentication, authorization, and sharing capabilities.

## Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (User and Admin roles)
- Secure password hashing with bcrypt
- Token-based API access

### User Management
- User registration and authentication
- Profile management
- Admin access to user management
- Role-based permissions

### Notes Management
- Create, read, update, and delete notes
- Share notes with other users
- Access control based on ownership
- Cached access for shared notes

### Security Features
- Rate limiting per IP
- Secure password storage
- JWT token validation
- Role-based access control

### Performance
- Redis caching for shared notes
- Database query optimization
- Connection pooling

### Logging & Monitoring
- Login attempt logging
- Note sharing activity logs
- Error logging
- Health check endpoints

## Technology Stack

- **Backend Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Caching**: Redis
- **Authentication**: JWT (JSON Web Tokens)
- **Container**: Docker
- **API Documentation**: Swagger/OpenAPI

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- PostgreSQL
- Redis

## Installation & Setup

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd notes-api
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Environment Setup:
   Create a .env file with the following variables:
\`\`\`env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=notes_app

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRATION=3600
\`\`\`

4. Using Docker:
\`\`\`bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down
\`\`\`

5. Without Docker:
\`\`\`bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
\`\`\`

## API Endpoints

### Authentication

#### Register New User
\`\`\`bash
curl -X POST http://localhost:3000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser"
  }'
\`\`\`

#### Login
\`\`\`bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
\`\`\`

### User Management

#### Get User Profile
\`\`\`bash
curl http://localhost:3000/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

#### Get All Users (Admin Only)
\`\`\`bash
curl http://localhost:3000/users \
  -H "Authorization: Bearer ADMIN_TOKEN"
\`\`\`

#### Delete User (Admin Only)
\`\`\`bash
curl -X DELETE http://localhost:3000/users/USER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"
\`\`\`

### Notes Management

#### Create Note
\`\`\`bash
curl -X POST http://localhost:3000/notes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Note",
    "content": "This is a test note"
  }'
\`\`\`

#### Get All Notes
\`\`\`bash
curl http://localhost:3000/notes \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

#### Get Shared Notes
\`\`\`bash
curl http://localhost:3000/notes/shared \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

#### Get Specific Note
\`\`\`bash
curl http://localhost:3000/notes/NOTE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

#### Update Note
\`\`\`bash
curl -X PUT http://localhost:3000/notes/NOTE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Note",
    "content": "Updated content"
  }'
\`\`\`

#### Share Note
\`\`\`bash
curl -X POST http://localhost:3000/notes/NOTE_ID/share \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": USER_ID
  }'
\`\`\`

#### Delete Note
\`\`\`bash
curl -X DELETE http://localhost:3000/notes/NOTE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

## Data Models

### User
\`\`\`typescript
interface User {
  id: number;
  email: string;
  username: string;
  password: string; // Hashed
  role: string; // 'user' | 'admin'
  notes: Note[];
}
\`\`\`

### Note
\`\`\`typescript
interface Note {
  id: number;
  title: string;
  content: string;
  owner: User;
  sharedWith: User[];
  createdAt: Date;
  updatedAt: Date;
}
\`\`\`

## Security Features

### Rate Limiting
- Basic rate limiting per IP on API endpoints
- Configurable limits for different endpoints
- Protection against brute force attacks

### Password Security
- Passwords are hashed using bcrypt
- Minimum password length requirement
- Password complexity validation

### JWT Security
- Token expiration
- Secure token storage
- Token refresh mechanism

## Caching Strategy

Redis is used for caching with the following strategy:
- Cached data expires after 1 hour
- Cache invalidation on note updates
- Cached items:
  - Shared notes
  - User notes
  - Individual notes

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Logging

The application logs the following events:
- User authentication attempts
- Note sharing activities

