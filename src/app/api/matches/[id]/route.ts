import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { withConnection } from '@/lib/db';
import { MatchModel, LeagueModel, TeamModel, RankingModel } from '@/models';
import { SubmitMatchResultRequest } from '@/types';

// GET /api/matches/[id] - Get a specific match by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const match = await withConnection(async () => {
      return MatchModel.findById(id)
        .populate('league', 'name status matchFormat')
        .populate({
          path: 'teamA',
          select: 'name players',
          populate: {
            path: 'players',
            select: 'nickname skillLevel profileImage'
          }
        })
        .populate({
          path: 'teamB',
          select: 'name players',
          populate: {
            path: 'players',
            select: 'nickname skillLevel profileImage'
          }
        })
        .populate('submittedBy', 'name email')
        .populate('confirmedBy', 'name email');
    });
    
    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(match);
  } catch (error) {
    console.error('Error fetching match:', error);
    return NextResponse.json(
      { error: 'Failed to fetch match' },
      { status: 500 }
    );
  }
}

// PATCH /api/matches/[id] - Update match details (no result update here)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const id = params.id;
    const data = await request.json();
    
    const match = await withConnection(async () => {
      const match = await MatchModel.findById(id);
      
      if (!match) {
        throw new Error('Match not found');
      }
      
      // Get the league to check if user is organizer
      const league = await LeagueModel.findById(match.league);
      
      if (!league) {
        throw new Error('League not found');
      }
      
      // Only league organizers can update match details
      if (league.organizer.toString() !== session.user.id) {
        throw new Error('Only league organizers can update match details');
      }
      
      // Check if match can be updated
      if (match.status === 'completed' || match.status === 'canceled') {
        throw new Error('Cannot update matches that are completed or canceled');
      }
      
      // Update match details
      if (data.scheduledDate !== undefined) match.scheduledDate = new Date(data.scheduledDate);
      if (data.scheduledTime !== undefined) match.scheduledTime = data.scheduledTime;
      if (data.location !== undefined) match.location = data.location;
      if (data.status !== undefined) {
        // Validate status transition
        if (!isValidMatchStatusTransition(match.status, data.status)) {
          throw new Error(`Invalid status transition from ${match.status} to ${data.status}`);
        }
        
        match.status = data.status;
        
        // If starting a match, record the actual start time
        if (data.status === 'in_progress') {
          match.actualStartTime = new Date();
        }
        
        // If canceling a match, clear any partial results
        if (data.status === 'canceled') {
          match.result = undefined;
        }
      }
      if (data.notes !== undefined) match.notes = data.notes;
      
      return await match.save();
    });
    
    return NextResponse.json(match);
  } catch (error) {
    console.error('Error updating match:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Match not found' || error.message === 'League not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message === 'Only league organizers can update match details') {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      
      // Validation errors
      if (error.message === 'Cannot update matches that are completed or canceled' ||
          error.message.includes('Invalid status transition')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update match' },
      { status: 500 }
    );
  }
}

// POST /api/matches/[id]/submit-result - Submit match result
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const id = params.id;
    const data: SubmitMatchResultRequest = await request.json();
    
    const updatedMatch = await withConnection(async () => {
      const match = await MatchModel.findById(id);
      
      if (!match) {
        throw new Error('Match not found');
      }
      
      // Get the league
      const league = await LeagueModel.findById(match.league);
      
      if (!league) {
        throw new Error('League not found');
      }
      
      // Check if match status allows result submission
      if (match.status !== 'in_progress' && match.status !== 'scheduled') {
        throw new Error('Results can only be submitted for scheduled or in-progress matches');
      }
      
      // Verify that the user is authorized (league organizer or player in one of the teams)
      const isLeagueOrganizer = league.organizer.toString() === session.user.id;
      
      const teamA = await TeamModel.findById(match.teamA);
      const teamB = await TeamModel.findById(match.teamB);
      
      if (!teamA || !teamB) {
        throw new Error('One or both teams not found');
      }
      
      const isTeamAMember = teamA.players.some(playerId => {
        const player = teamA.players.find(p => p.userId && p.userId.toString() === session.user.id);
        return player !== undefined;
      });
      
      const isTeamBMember = teamB.players.some(playerId => {
        const player = teamB.players.find(p => p.userId && p.userId.toString() === session.user.id);
        return player !== undefined;
      });
      
      if (!isLeagueOrganizer && !isTeamAMember && !isTeamBMember) {
        throw new Error('Only league organizers or team members can submit results');
      }
      
      // Validate match scores
      if (!data.teamAScore || !data.teamBScore) {
        throw new Error('Scores for both teams are required');
      }
      
      if (data.teamAScore.length !== data.teamBScore.length) {
        throw new Error('Scores must have the same number of sets');
      }
      
      if (data.teamAScore.length === 0) {
        throw new Error('At least one set must be played');
      }
      
      // Calculate the winner
      let teamAWins = 0;
      let teamBWins = 0;
      
      for (let i = 0; i < data.teamAScore.length; i++) {
        if (data.teamAScore[i] > data.teamBScore[i]) {
          teamAWins++;
        } else if (data.teamBScore[i] > data.teamAScore[i]) {
          teamBWins++;
        } else {
          throw new Error('Ties are not allowed in sets');
        }
      }
      
      let winnerId: string;
      
      if (teamAWins > teamBWins) {
        winnerId = match.teamA.toString();
      } else if (teamBWins > teamAWins) {
        winnerId = match.teamB.toString();
      } else {
        throw new Error('Match must have a winner');
      }
      
      // Update the match
      match.result = {
        teamAScore: data.teamAScore,
        teamBScore: data.teamBScore,
        winner: winnerId
      };
      match.status = 'completed';
      match.actualEndTime = new Date();
      match.notes = data.notes || match.notes;
      match.submittedBy = session.user.id;
      
      // Save the match
      await match.save();
      
      // Update rankings
      await updateRankings(
        league._id,
        match.teamA.toString(),
        match.teamB.toString(),
        winnerId,
        data.teamAScore,
        data.teamBScore,
        league.pointsPerWin,
        league.pointsPerLoss
      );
      
      return MatchModel.findById(id)
        .populate('league', 'name status matchFormat')
        .populate('teamA')
        .populate('teamB')
        .populate('submittedBy', 'name email');
    });
    
    return NextResponse.json(updatedMatch);
  } catch (error) {
    console.error('Error submitting match result:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Match not found' || error.message === 'League not found' ||
          error.message.includes('teams not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message === 'Only league organizers or team members can submit results') {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      
      // Validation errors
      if (error.message === 'Results can only be submitted for scheduled or in-progress matches' ||
          error.message === 'Scores for both teams are required' ||
          error.message === 'Scores must have the same number of sets' ||
          error.message === 'At least one set must be played' ||
          error.message === 'Ties are not allowed in sets' ||
          error.message === 'Match must have a winner') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to submit match result' },
      { status: 500 }
    );
  }
}

// Helper function to update rankings after a match
async function updateRankings(
  leagueId: string,
  teamAId: string,
  teamBId: string,
  winnerId: string,
  teamAScore: number[],
  teamBScore: number[],
  pointsPerWin: number,
  pointsPerLoss: number
) {
  // Calculate the sets and games won/lost for each team
  const teamASetsWon = teamAScore.filter((score, index) => score > teamBScore[index]).length;
  const teamBSetsWon = teamBScore.filter((score, index) => score > teamAScore[index]).length;
  
  const teamAGamesWon = teamAScore.reduce((sum, score) => sum + score, 0);
  const teamBGamesWon = teamBScore.reduce((sum, score) => sum + score, 0);
  
  // Update Team A ranking
  let rankingA = await RankingModel.findOne({ league: leagueId, team: teamAId });
  
  if (!rankingA) {
    rankingA = new RankingModel({
      league: leagueId,
      team: teamAId,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0
    });
  }
  
  rankingA.updateWithMatchResult(
    winnerId === teamAId,
    teamASetsWon,
    teamBSetsWon,
    teamAGamesWon,
    teamBGamesWon,
    pointsPerWin,
    pointsPerLoss
  );
  
  await rankingA.save();
  
  // Update Team B ranking
  let rankingB = await RankingModel.findOne({ league: leagueId, team: teamBId });
  
  if (!rankingB) {
    rankingB = new RankingModel({
      league: leagueId,
      team: teamBId,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0
    });
  }
  
  rankingB.updateWithMatchResult(
    winnerId === teamBId,
    teamBSetsWon,
    teamASetsWon,
    teamBGamesWon,
    teamAGamesWon,
    pointsPerWin,
    pointsPerLoss
  );
  
  await rankingB.save();
  
  // Update all rankings in the league (recalculate ranks)
  const allRankings = await RankingModel.find({ league: leagueId }).sort({ points: -1, matchesWon: -1 });
  
  for (let i = 0; i < allRankings.length; i++) {
    allRankings[i].rank = i + 1;
    await allRankings[i].save();
  }
}

// Helper function to validate match status transitions
function isValidMatchStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'scheduled': ['in_progress', 'postponed', 'canceled'],
    'in_progress': ['completed', 'postponed', 'canceled'],
    'completed': [],
    'canceled': [],
    'postponed': ['scheduled', 'canceled']
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
}
