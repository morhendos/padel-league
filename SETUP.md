# Padel League Setup Guide

This guide will help you set up the Padel League application on your local development environment.

## Prerequisites

- Node.js (v16+)
- npm or yarn
- MongoDB (local or Atlas)
- Git

## Setup Steps

### 1. Clone the Repository

```bash
git clone https://github.com/morhendos/padel-league.git
cd padel-league
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

Copy the example environment file and update it with your specific configuration:

```bash
cp .env.example .env.local
```

Edit the `.env.local` file and add your MongoDB connection string and other configuration options.

### 4. Database Setup

Make sure your MongoDB instance is running. The application will automatically connect to the database specified in your `.env.local` file.

### 5. Start the Development Server

```bash
npm run dev
# or
yarn dev
```

The application should now be running at [http://localhost:3000](http://localhost:3000).

## Project Structure

The application is built using Next.js and follows a clean architecture:

- **Models**: MongoDB schemas for all data entities (players, teams, leagues, matches, rankings)
- **API Routes**: RESTful endpoints for data operations
- **Components**: UI components for the frontend (to be implemented)
- **Pages**: Next.js pages for the frontend (to be implemented)

## API Routes

The backend API provides endpoints for all the core functionalities:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/players` | GET | Get all players with filtering |
| `/api/players` | POST | Create a new player |
| `/api/players/:id` | GET | Get a specific player |
| `/api/players/:id` | PATCH | Update a player |
| `/api/players/:id` | DELETE | Delete a player |
| `/api/teams` | GET | Get all teams with filtering |
| `/api/teams` | POST | Create a new team |
| `/api/teams/:id` | GET | Get a specific team |
| `/api/teams/:id` | PATCH | Update a team |
| `/api/teams/:id` | DELETE | Delete a team |
| `/api/leagues` | GET | Get all leagues with filtering |
| `/api/leagues` | POST | Create a new league |
| `/api/leagues/:id` | GET | Get a specific league |
| `/api/leagues/:id` | PATCH | Update a league |
| `/api/leagues/:id` | DELETE | Delete a league |
| `/api/leagues/:id/teams` | GET | Get all teams in a league |
| `/api/leagues/:id/teams` | POST | Add a team to a league |
| `/api/leagues/:id/teams` | DELETE | Remove a team from a league |
| `/api/leagues/:id/rankings` | GET | Get all rankings for a league |
| `/api/leagues/:id/schedule` | GET | Get the schedule for a league |
| `/api/leagues/:id/schedule` | POST | Generate a schedule for a league |
| `/api/leagues/:id/schedule` | DELETE | Clear the schedule for a league |
| `/api/matches` | GET | Get all matches with filtering |
| `/api/matches` | POST | Schedule a new match |
| `/api/matches/:id` | GET | Get a specific match |
| `/api/matches/:id` | PATCH | Update match details |
| `/api/matches/:id` | POST | Submit match result |

## Next Steps

After setting up the project, you can start building the frontend components using the existing API endpoints. You can:

1. Implement player profile pages
2. Add team creation and management UI
3. Create league management screens
4. Build match scheduling and results submission forms
5. Design ranking tables and leaderboards

## Using the Boilerplate

This project has been built on top of the SaaS boilerplate, keeping the authentication system and basic structure but extending it with padel league specific models and functionality.
