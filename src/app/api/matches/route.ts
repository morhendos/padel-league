import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { withConnection } from '@/lib/db';
import { MatchModel, LeagueModel, TeamModel } from '@/models';
import { ScheduleMatchRequest } from '@/types';

// GET /api/matches - Get all matches with optional filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const teamId = searchParams.get('teamId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const skip = (page - 1) * limit;
    
    const query: any = {};
    
    if (leagueId) {
      query.league = leagueId;
    }
    
    if (teamId) {
      query.$or = [{ teamA: teamId }, { teamB: teamId }];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (startDate) {
      query.scheduledDate = { ...query.scheduledDate, $gte: new Date(startDate) };
    }
    
    if (endDate) {
      query.scheduledDate = { ...query.scheduledDate, $lte: new Date(endDate) };
    }
    
    const matches = await withConnection(async () => {
      const total = await MatchModel.countDocuments(query);
      const matches = await MatchModel.find(query)
        .populate('league', 'name status')
        .populate({
          path: 'teamA',
          select: 'name players',
          populate: {
            path: 'players',
            select: 'nickname'
          }
        })
        .populate({
          path: 'teamB',
          select: 'name players',
          populate: {
            path: 'players',
            select: 'nickname'
          }
        })
        .sort({ scheduledDate: 1 })
        .skip(skip)
        .limit(limit);
      
      return {
        matches,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    });
    
    return NextResponse.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}

// POST /api/matches - Schedule a new match
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const data: ScheduleMatchRequest = await request.json();
    
    const newMatch = await withConnection(async () => {
      // Check if the league exists and user is the organizer
      const league = await LeagueModel.findById(data.leagueId);
      
      if (!league) {
        throw new Error('League not found');
      }
      
      // Only league organizers can schedule matches
      if (league.organizer.toString() !== session.user.id) {
        throw new Error('Only league organizers can schedule matches');
      }
      
      // Check if league status allows scheduling matches
      if (league.status !== 'draft' && league.status !== 'registration' && league.status !== 'active') {
        throw new Error('Cannot schedule matches for leagues that are not in draft, registration, or active status');
      }
      
      // Validate teams
      if (data.teamAId === data.teamBId) {
        throw new Error('Teams must be different');
      }
      
      const teamA = await TeamModel.findById(data.teamAId);
      const teamB = await TeamModel.findById(data.teamBId);
      
      if (!teamA || !teamB) {
        throw new Error('One or both teams not found');
      }
      
      // Check if teams are in the league
      if (!league.teams.includes(teamA._id) || !league.teams.includes(teamB._id)) {
        throw new Error('Both teams must be registered for the league');
      }
      
      // Create the match
      const match = new MatchModel({
        league: data.leagueId,
        teamA: data.teamAId,
        teamB: data.teamBId,
        scheduledDate: new Date(data.scheduledDate),
        scheduledTime: data.scheduledTime,
        location: data.location,
        status: 'scheduled'
      });
      
      return await match.save();
    });
    
    return NextResponse.json(newMatch, { status: 201 });
  } catch (error) {
    console.error('Error scheduling match:', error);
    
    if (error instanceof Error) {
      if (error.message === 'League not found' || error.message.includes('teams not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message === 'Only league organizers can schedule matches') {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      
      // Validation errors
      if (error.message === 'Teams must be different' ||
          error.message === 'Both teams must be registered for the league' ||
          error.message.includes('Cannot schedule matches')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to schedule match' },
      { status: 500 }
    );
  }
}
