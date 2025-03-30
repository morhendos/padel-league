import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { withConnection } from '@/lib/db';
import { TeamModel, PlayerModel } from '@/models';
import { CreateTeamRequest } from '@/types';

// GET /api/teams - Get all teams with optional filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const playerId = searchParams.get('playerId');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const skip = (page - 1) * limit;
    
    const query: any = {};
    
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    
    if (playerId) {
      query.players = playerId;
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }
    
    const teams = await withConnection(async () => {
      const total = await TeamModel.countDocuments(query);
      const teams = await TeamModel.find(query)
        .populate('players')  // Populate player details
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      return {
        teams,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    });
    
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create a new team
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const data: CreateTeamRequest = await request.json();
    
    // Validate that exactly 2 players are provided
    if (!data.players || data.players.length !== 2) {
      return NextResponse.json(
        { error: 'A team must have exactly 2 players' },
        { status: 400 }
      );
    }
    
    const newTeam = await withConnection(async () => {
      // Check if players exist
      for (const playerId of data.players) {
        const player = await PlayerModel.findById(playerId);
        if (!player) {
          throw new Error(`Player with ID ${playerId} not found`);
        }
        if (!player.isActive) {
          throw new Error(`Player with ID ${playerId} is not active`);
        }
      }
      
      // Check if team with the same name already exists
      const existingTeam = await TeamModel.findOne({ name: data.name });
      if (existingTeam) {
        throw new Error('Team with this name already exists');
      }
      
      // Create the team
      const team = new TeamModel({
        name: data.name,
        players: data.players,
        logo: data.logo,
        description: data.description,
        isActive: true,
        createdBy: session.user.id
      });
      
      return await team.save();
    });
    
    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Player with ID')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message === 'Team with this name already exists') {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}
