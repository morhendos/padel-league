import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { withConnection } from '@/lib/db';
import { TeamModel, PlayerModel } from '@/models';

// GET /api/teams/[id] - Get a specific team by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const team = await withConnection(async () => {
      return TeamModel.findById(id).populate('players');
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

// PATCH /api/teams/[id] - Update a team
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
    
    const team = await withConnection(async () => {
      const team = await TeamModel.findById(id);
      
      if (!team) {
        throw new Error('Team not found');
      }
      
      // Ensure user can only update teams they created
      if (team.createdBy.toString() !== session.user.id) {
        throw new Error('Unauthorized');
      }
      
      // Update only allowed fields
      if (data.name !== undefined) {
        // Check if team name is already taken
        if (data.name !== team.name) {
          const existingTeam = await TeamModel.findOne({ name: data.name });
          if (existingTeam) {
            throw new Error('Team with this name already exists');
          }
          team.name = data.name;
        }
      }
      
      if (data.players !== undefined) {
        // Validate players
        if (data.players.length !== 2) {
          throw new Error('A team must have exactly 2 players');
        }
        
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
        
        team.players = data.players;
      }
      
      if (data.logo !== undefined) team.logo = data.logo;
      if (data.description !== undefined) team.description = data.description;
      if (data.isActive !== undefined) team.isActive = data.isActive;
      
      return await team.save();
    });
    
    return NextResponse.json(team);
  } catch (error) {
    console.error('Error updating team:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Team not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      
      if (error.message === 'Team with this name already exists') {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      
      if (error.message === 'A team must have exactly 2 players' ||
          error.message.includes('Player with ID')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] - Delete a team (soft delete by setting isActive to false)
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
    
    const id = params.id;
    
    await withConnection(async () => {
      const team = await TeamModel.findById(id);
      
      if (!team) {
        throw new Error('Team not found');
      }
      
      // Ensure user can only delete teams they created
      if (team.createdBy.toString() !== session.user.id) {
        throw new Error('Unauthorized');
      }
      
      // Check if team is part of any active leagues
      // For simplicity, we're not implementing this check here
      // but you would typically check in the LeagueModel
      
      // Soft delete by setting isActive to false
      team.isActive = false;
      await team.save();
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting team:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Team not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
