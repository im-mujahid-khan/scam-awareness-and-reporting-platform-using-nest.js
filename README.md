
# Scam Awareness & Reporting Platform

A full-featured platform designed to empower individuals and organizations to report scams, spread awareness, and receive real-time alerts. Built with **Next.js (TypeScript)**, **NestJS**, **PostgreSQL**, **Prisma ORM**, and **Docker**, the platform delivers secure, scalable, and intelligent solutions to combat online scams.

---

## 🚀 Features

### 1. User Accounts
- User registration and login using email and phone.
- Social authentication with Google, Apple, and Facebook.
- User profiles with activity history, privacy settings, and notification preferences.
- Save posts and block/unblock other users.
- Verified company and organization accounts.
- Organization verification through document uploads.
- Official groups, awareness posts, messaging, and analytics dashboards.

### 2. Content Management
- Submit scam reports with detailed information, including:
  - Scam type and contact information.
  - Website URLs and social media accounts.
  - Cryptocurrency wallet addresses.
  - Incident descriptions and financial losses.
  - Location, images, and screenshots.
- Publish awareness articles, educational content, and public warnings.
- Add images, tags, and categories to posts.
- Automatically mask sensitive information.
- Content moderation workflow: Pending → Approved → Published.

### 3. Group Management
- Create public, private, and official company groups.
- Join and leave groups.
- Share posts and announcements.
- Pin important announcements.
- Manage group members and permissions.
- Group moderation and content management.

### 4. Follow & Notification System
- Follow groups, scam categories, company profiles, and reported scam identities.
- Receive updates based on followed topics.
- Personalized feeds and notifications.
- Custom notification preferences.

### 5. Comments & Messaging
- Threaded comments and replies.
- Like and upvote functionality.
- Report inappropriate content.
- Comment moderation.
- One-to-one messaging.
- Company-to-user communication.
- Automatic masking of sensitive information.

### 6. Real-Time Scam Alerts
- Alerts for trending scams.
- Detection of repeated scam reports.
- Regional scam activity notifications.
- Alerts for followed scam identities.
- Push notifications and in-app alerts.
- Dedicated scam alert pages.

### 7. Search & Discovery
- Search by phone number, email, website, and social media handle.
- Search cryptocurrency wallet addresses.
- View total scam reports and risk scores.
- Explore related scam reports.
- Preview submitted evidence.
- Track scam activity through timelines.

### 8. Admin Panel
- Manage users and verified companies.
- Manage groups and memberships.
- Review and moderate scam reports.
- Manage posts, comments, and categories.
- Track moderation history and system logs.
- Analytics dashboard and platform activity monitoring.

### 9. Security & Compliance
- GDPR-oriented privacy and data protection.
- Automatic masking of sensitive information.
- Secure data handling and encryption.
- Anti-abuse mechanisms.
- Spam protection and content moderation.

---

## 🛠 Technology Stack

| Category | Technologies |
|---|---|
| Frontend | Next.js, TypeScript, React.js |
| Styling | Tailwind CSS |
| Forms | React Hook Form |
| Backend | NestJS, Node.js |
| Database | PostgreSQL |
| ORM | Prisma |
| DevOps | Docker, Docker Compose |
| Notifications | Push Notifications, In-App Alerts |
| Deployment | Cloud-Ready Architecture |

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd YOUR_PROJECT_FOLDER
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Install Backend Dependencies

```bash
cd ../backend
npm install
```

### 4. Configure Environment Variables

Create `.env` files for the frontend and backend.

Configure the required environment variables, including:

- Database connection URL.
- Authentication secrets.
- API configuration.
- Notification credentials.

Never commit `.env` files or expose sensitive credentials.

### 5. Configure Prisma

Run the following commands from the backend directory:

```bash
npx prisma generate
npx prisma migrate dev
```

### 6. Run the Application

Start the backend:

```bash
npm run start:dev
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm run dev
```

### 7. Run with Docker

If Docker Compose is configured:

```bash
docker compose up --build
```

---

## 🔐 Security

- Secure authentication and authorization.
- Protected API endpoints.
- Sensitive data masking.
- Database security.
- Input validation and sanitization.
- Anti-spam and abuse prevention.

---

## 🎯 Project Goals

- Help individuals identify and report online scams.
- Build a trusted community for scam awareness.
- Provide real-time alerts about emerging threats.
- Support organizations in sharing verified information.
- Improve online safety through collaboration and reporting.

---

## 👨‍💻 Author

**Full Stack Developer**

---

## 📄 License

This project is developed for scam awareness, prevention, and reporting purposes.
