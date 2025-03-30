import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { withConnection } from '@/lib/db';
import { LeagueModel, MatchModel } from '@/models';
import { createLeagueSchedule } from '@/utils/scheduleGenerator';

// GET /api/leagues/[id]/schedule - Get the schedule for a league
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = params.id;
    
    const schedule = await withConnection(async () => {
      // Check if league exists
      const league = await LeagueModel.findById(leagueId);
      
      if (!league) {
        throw new Error('League not found');
      }
      
      // Get all matches for this league, sorted by date
      return MatchModel.find({ league: leagueId })
        .sort({ scheduledDate: 1 })
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
        });
    });
    
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching league schedule:', error);
    
    if (error instanceof Error && error.message === 'League not found') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch league schedule' },
      { status: 500 }
    );
  }
}

// POST /api/leagues/[id]/schedule - Generate a schedule for a league
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
    
    const schedule = await withConnection(async () => {
      // Check if league exists
      const league = await LeagueModel.findById(leagueId);
      
      if (!league) {
        throw new Error('League not found');
      }
      
      // Check if user is the league organizer
      if (league.organizer.toString() !== session.user.id) {
        throw new Error('Only the league organizer can generate a schedule');
      }
      
      // Check if league status allows schedule generation
      if (league.status !== 'draft' && league.status !== 'registration') {
        throw new Error('Schedule can only be generated for leagues in draft or registration status');
      }
      
      // Check if schedule already exists
      const existingMatches = await MatchModel.countDocuments({ league: leagueId });
      
      if (existingMatches > 0) {
        throw new Error('Schedule already exists for this league');
      }
      
      // Check if there are enough teams
      if (league.teams.length < 2) {
        throw new Error('League must have at least 2 teams to generate a schedule');
      }
      
      // Generate the schedule
      const createdMatches = await createLeagueSchedule(leagueId);
      
      return {
        message: `Successfully generated ${createdMatches.length} matches`,
        matches: createdMatches
      };
    });
    
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error generating league schedule:', error);
    
    if (error instanceof Error) {
      if (error.message === 'League not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message === 'Only the league organizer can generate a schedule') {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      
      // Validation errors
      if (error.message === 'Schedule can only be generated for leagues in draft or registration status' ||
          error.message === 'Schedule already exists for this league' ||
          error.message === 'League must have at least 2 teams to generate a schedule' ||
          error.message === 'Schedule has already been generated for this league' ||
          error.message.includes('Not enough days')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate league schedule' },
      { status: 500 }
    );
  }
}

// DELETE /api/leagues/[id]/schedule - Clear the schedule for a league
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
    
    await withConnection(async () => {
      // Check if league exists
      const league = await LeagueModel.findById(leagueId);
      
      if (!league) {
        throw new Error('League not found');
      }
      
      // Check if user is the league organizer
      if (league.organizer.toString() !== session.user.id) {
        throw new Error('Only the league organizer can clear a schedule');
      }
      
      // Check if league status allows schedule clearing
      if (league.status !== 'draft' && league.status !== 'registration') {
        throw new Error('Schedule can only be cleared for leagues in draft or registration status');
      }
      
      // Delete all matches for this league
      await MatchModel.deleteMany({ league: leagueId });
      
      // Update the league to mark schedule as not generated
      league.scheduleGenerated = false;
      await league.save();
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error clearing league schedule:', error);
    
    if (error instanceof Error) {
      if (error.message === 'League not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message === 'Only the league organizer can clear a schedule') {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      
      // Validation errors
      if (error.message === 'Schedule can only be cleared for leagues in draft or registration status') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to clear league schedule' },
      { status: 500 }
    );
  }
}
