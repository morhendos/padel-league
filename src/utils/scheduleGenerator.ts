import { ObjectId } from 'mongoose';
import { MatchModel, LeagueModel } from '@/models';

/**
 * Generate a round-robin schedule for teams in a league
 * Every team plays against each other team once
 * 
 * @param leagueId - ID of the league
 * @param teamIds - Array of team IDs
 * @param startDate - Start date of the league
 * @param endDate - End date of the league
 * @param venue - Optional venue for matches
 * @returns Array of created match documents
 */
export async function generateRoundRobinSchedule(
  leagueId: string | ObjectId,
  teamIds: string[] | ObjectId[],
  startDate: Date,
  endDate: Date,
  venue?: string
): Promise<any[]> {
  if (teamIds.length < 2) {
    throw new Error('At least 2 teams are required to generate a schedule');
  }
  
  // Convert dates to ensure they are Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Calculate the total number of days available for the league
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate the total number of matches needed
  const totalMatches = (teamIds.length * (teamIds.length - 1)) / 2;
  
  // Make sure there are enough days for all matches
  if (totalDays < totalMatches) {
    throw new Error(`Not enough days (${totalDays}) to schedule all matches (${totalMatches})`);
  }
  
  // Create a copy of the team IDs array to work with
  const teams = [...teamIds];
  
  // If odd number of teams, add a dummy team for the algorithm
  const hasDummy = teams.length % 2 === 1;
  if (hasDummy) {
    teams.push('dummy');
  }
  
  const n = teams.length;
  const matches = [];
  
  // Calculate days between each match
  const daysBetweenMatches = Math.floor(totalDays / totalMatches);
  
  let matchIndex = 0;
  
  // Generate rounds
  for (let round = 0; round < n - 1; round++) {
    // Generate matches for this round
    for (let i = 0; i < n / 2; i++) {
      const team1 = teams[i];
      const team2 = teams[n - 1 - i];
      
      // Skip matches involving the dummy team
      if (team1 !== 'dummy' && team2 !== 'dummy') {
        // Calculate the date for this match
        const matchDate = new Date(start);
        matchDate.setDate(start.getDate() + (matchIndex * daysBetweenMatches));
        
        matches.push({
          league: leagueId,
          teamA: team1,
          teamB: team2,
          scheduledDate: matchDate,
          location: venue,
          status: 'scheduled'
        });
        
        matchIndex++;
      }
    }
    
    // Rotate teams for the next round (keeping team[0] fixed)
    teams.splice(1, 0, teams.pop());
  }
  
  return matches;
}

/**
 * Create matches in the database based on a generated schedule
 * 
 * @param leagueId - ID of the league
 * @returns Promise with the created matches
 */
export async function createLeagueSchedule(leagueId: string | ObjectId): Promise<any[]> {
  // Get the league
  const league = await LeagueModel.findById(leagueId);
  
  if (!league) {
    throw new Error('League not found');
  }
  
  if (league.teams.length < 2) {
    throw new Error('League must have at least 2 teams to generate a schedule');
  }
  
  if (league.scheduleGenerated) {
    throw new Error('Schedule has already been generated for this league');
  }
  
  // Generate the schedule
  const matchData = await generateRoundRobinSchedule(
    leagueId,
    league.teams,
    league.startDate,
    league.endDate,
    league.venue
  );
  
  // Create the matches in the database
  const createdMatches = await MatchModel.insertMany(matchData);
  
  // Update the league to mark schedule as generated
  league.scheduleGenerated = true;
  await league.save();
  
  return createdMatches;
}
