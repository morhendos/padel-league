import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { withConnection } from '@/lib/db';
import { LeagueModel } from '@/models';
import { CreateLeagueRequest } from '@/types';

// GET /api/leagues - Get all leagues with optional filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const status = searchParams.get('status');
    const organizer = searchParams.get('organizer');
    const active = searchParams.get('active');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const skip = (page - 1) * limit;
    
    const query: any = {};
    
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    
    if (status) {
      query.status = status;
    }
    
    if (organizer) {
      query.organizer = organizer;
    }
    
    if (active === 'true') {
      // Active leagues are those in 'registration' or 'active' status
      query.status = { $in: ['registration', 'active'] };
    }
    
    const leagues = await withConnection(async () => {
      const total = await LeagueModel.countDocuments(query);
      const leagues = await LeagueModel.find(query)
        .populate('organizer', 'name email')
        .populate({
          path: 'teams',
          populate: {
            path: 'players',
            select: 'nickname skillLevel'
          }
        })
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit);
      
      return {
        leagues,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    });
    
    return NextResponse.json(leagues);
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leagues' },
      { status: 500 }
    );
  }
}

// POST /api/leagues - Create a new league
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const data: CreateLeagueRequest = await request.json();
    
    const newLeague = await withConnection(async () => {
      // Check if league with the same name already exists
      const existingLeague = await LeagueModel.findOne({ name: data.name });
      
      if (existingLeague) {
        throw new Error('League with this name already exists');
      }
      
      // Create the league
      const league = new LeagueModel({
        name: data.name,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        registrationDeadline: new Date(data.registrationDeadline),
        maxTeams: data.maxTeams,
        minTeams: data.minTeams,
        matchFormat: data.matchFormat,
        venue: data.venue,
        status: 'draft', // New leagues start in draft mode
        banner: data.banner,
        scheduleGenerated: false,
        pointsPerWin: data.pointsPerWin,
        pointsPerLoss: data.pointsPerLoss,
        organizer: session.user.id,
        teams: []
      });
      
      return await league.save();
    });
    
    return NextResponse.json(newLeague, { status: 201 });
  } catch (error) {
    console.error('Error creating league:', error);
    
    if (error instanceof Error) {
      if (error.message === 'League with this name already exists') {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create league' },
      { status: 500 }
    );
  }
}
