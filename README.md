# Ligretto Tracker 🎯

A modern web application for tracking scores in the fast-paced card game Ligretto. Keep score across multiple rounds, manage player leaderboards, and never lose track of who's winning. Ligretto is one of my friend group's favorite games, but we've always struggled with keeping score using messy notes on someone's phone. I got tired of dealing with disorganized score tracking and decided to build this dedicated tracker to make our game nights smoother. It's been a fun small side project that solves a real problem we face while giving me a chance to have fun with coding.

## 📖 About Ligretto

Ligretto is a real-time card game where players race to get rid of their cards by playing them onto shared piles. This app helps you track scores across multiple rounds and maintain running totals for tournament-style play.

## ✨ Features

- **Game Set Management** - Create and organize multiple scoring sessions
- **Player Management** - Add players and reuse them across different games
- **Round-by-Round Scoring** - Track individual round scores (-10 to +40 points)
- **Live Leaderboards** - See cumulative scores and rankings in real-time
- **Responsive Design** - Works seamlessly on desktop and mobile devices
- **Persistent Data** - All scores and games are saved in the cloud
- **User Authentication** - Secure login with email/password

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Full type safety throughout the application
- **Vite** - Lightning-fast build tool and dev server
- **React Router** - Client-side routing with protected routes
- **Lucide React** - Beautiful, consistent icons

### Backend & Database
- **Supabase** - Backend-as-a-Service with PostgreSQL database
- **Supabase Auth** - User authentication and session management
- **Row Level Security (RLS)** - Database-level security policies

### Deployment
- **Vercel** - Serverless deployment with automatic builds
- **Git-based CI/CD** - Automatic deployments on push to main branch

### Development Tools
- **ESLint** - Code linting and style enforcement
- **CSS3** - Custom styling with Flexbox and Grid
- **Git** - Version control
