# Padel League Management Application

A comprehensive application for managing padel leagues, player rankings, and match scheduling.

## Features

- 🏓 Create and manage leagues
- 👤 Player profiles and registration
- 🤝 Team formation and management
- 📅 Automated match scheduling
- 🏆 Match result tracking
- 📊 Player and team rankings
- 📱 Responsive design for all devices
- 🔒 Secure user authentication

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Frontend**: React 18
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS + Radix UI components
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- MongoDB (local or Atlas)

### Installation

1. Clone this repository

   ```bash
   git clone https://github.com/morhendos/padel-league.git
   cd padel-league
   ```

2. Install dependencies

   ```bash
   npm install
   # or
   yarn install
   ```

3. Environment setup

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Start development server

   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Project Structure

The application follows a clean architecture with clear separation of concerns:

- **Pages & Routes**: Handled by Next.js App Router
- **Components**: Reusable UI elements 
- **Models**: MongoDB schemas for all data entities
- **Services**: Business logic for leagues, scheduling, rankings, etc.
- **API Routes**: RESTful endpoints for data operations

## Data Models

The application uses the following main data models:

1. **User**: Authentication and user profile information
2. **Player**: Extended user profile with player-specific info
3. **Team**: Combination of players
4. **League**: Collection of teams competing together
5. **Match**: Game records between teams
6. **Result**: Scores and outcomes of matches

## Features In Detail

### League Management
- Create leagues with custom rules and settings
- Set league duration, match formats, and scoring systems
- Manage league registrations and participants

### Team Formation
- Create teams with two players
- Join existing teams
- View team statistics and history

### Match Scheduling
- Automated schedule generation
- Flexible scheduling options
- Calendar integration

### Result Tracking
- Submit match results
- Verify scores and outcomes
- Track history of all matches

### Rankings
- Real-time rankings based on match results
- Customizable ranking algorithms
- Historical ranking data

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
