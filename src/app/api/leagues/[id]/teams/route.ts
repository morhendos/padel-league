import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { withConnection } from '@/lib/db';
import { LeagueModel, TeamModel } from '@/models';

// GET /api/leagues/[id]/teams - Get all teams in a league
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = params.id;
    
    const teams = await withConnection(async () => {
      const league = await LeagueModel.findById(leagueId)
        .populate({
          path: 'teams',
          populate: {
            path: 'players',
            select: 'nickname skillLevel handedness preferredPosition'
          }
        });
      
      if (!league) {
        throw new Error('League not found');
      }
      
      return league.teams;
    });
    
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching league teams:', error);
    
    if (error instanceof Error && error.message === 'League not found') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch league teams' },
      { status: 500 }
    );
  }
}

// POST /api/leagues/[id]/teams - Add a team to a league
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
    
    const leagueId = params.id;
    const { teamId } = await request.json();
    
    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }
    
    const updatedLeague = await withConnection(async () => {
      // Get the league
      const league = await LeagueModel.findById(leagueId);
      
      if (!league) {
        throw new Error('League not found');
      }
      
      // Check if league is in registration status
      if (league.status !== 'registration') {
        throw new Error('League is not open for registration');
      }
      
      // Check if registration deadline has passed
      if (new Date() > league.registrationDeadline) {
        throw new Error('Registration deadline has passed');
      }
      
      // Check if league is full
      if (league.teams.length >= league.maxTeams) {
        throw new Error('League is already full');
      }
      
      // Get the team
      const team = await TeamModel.findById(teamId);
      
      if (!team) {
        throw new Error('Team not found');
      }
      
      // Check if team is active
      if (!team.isActive) {
        throw new Error('Team is not active');
      }
      
      // Check if team is already in the league
      if (league.teams.includes(team._id)) {
        throw new Error('Team is already in this league');
      }
      
      // Check if user is authorized (must be a team member or league organizer)
      const isTeamMember = team.players.some(playerId => {
        const player = team.players.find(p => p.userId && p.userId.toString() === session.user.id);
        return player !== undefined;
      });
      
      const isLeagueOrganizer = league.organizer.toString() === session.user.id;
      
      if (!isTeamMember && !isLeagueOrganizer) {
        throw new Error('You must be a team member or league organizer to add a team');
      }
      
      // Add the team to the league
      league.teams.push(team._id);
      await league.save();
      
      return LeagueModel.findById(leagueId)
        .populate('teams')
        .populate('organizer', 'name email');
    });
    
    return NextResponse.json(updatedLeague);
  } catch (error) {
    console.error('Error adding team to league:', error);
    
    if (error instanceof Error) {
      if (error.message === 'League not found' || error.message === 'Team not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message === 'You must be a team member or league organizer to add a team') {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      
      // Other validation errors
      if (error.message === 'League is not open for registration' ||
          error.message === 'Registration deadline has passed' ||
          error.message === 'League is already full' ||
          error.message === 'Team is not active' ||
          error.message === 'Team is already in this league') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to add team to league' },
      { status: 500 }
    );
  }
}

// DELETE /api/leagues/[id]/teams - Remove a team from a league
export async function DELETE(
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
    
    const leagueId = params.id;
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    
    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }
    
    const updatedLeague = await withConnection(async () => {
      // Get the league
      const league = await LeagueModel.findById(leagueId);
      
      if (!league) {
        throw new Error('League not found');
      }
      
      // Check if league status allows team removal
      if (league.status !== 'registration' && league.status !== 'draft') {
        throw new Error('Teams cannot be removed once the league is active or completed');
      }
      
      // Get the team
      const team = await TeamModel.findById(teamId);
      
      if (!team) {
        throw new Error('Team not found');
      }
      
      // Check if team is in the league
      if (!league.teams.includes(team._id)) {
        throw new Error('Team is not in this league');
      }
      
      // Check if user is authorized (must be a team member or league organizer)
      const isTeamMember = team.players.some(playerId => {
        const player = team.players.find(p => p.userId && p.userId.toString() === session.user.id);
        return player !== undefined;
      });
      
      const isLeagueOrganizer = league.organizer.toString() === session.user.id;
      
      if (!isTeamMember && !isLeagueOrganizer) {
        throw new Error('You must be a team member or league organizer to remove a team');
      }
      
      // Remove the team from the league
      league.teams = league.teams.filter(id => id.toString() !== teamId);
      await league.save();
      
      return LeagueModel.findById(leagueId)
        .populate('teams')
        .populate('organizer', 'name email');
    });
    
    return NextResponse.json(updatedLeague);
  } catch (error) {
    console.error('Error removing team from league:', error);
    
    if (error instanceof Error) {
      if (error.message === 'League not found' || error.message === 'Team not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message === 'You must be a team member or league organizer to remove a team') {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      
      // Other validation errors
      if (error.message === 'Teams cannot be removed once the league is active or completed' ||
          error.message === 'Team is not in this league') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to remove team from league' },
      { status: 500 }
    );
  }
}
