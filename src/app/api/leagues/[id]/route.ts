import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { withConnection } from '@/lib/db';
import { LeagueModel, TeamModel } from '@/models';

// GET /api/leagues/[id] - Get a specific league by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const league = await withConnection(async () => {
      return LeagueModel.findById(id)
        .populate('organizer', 'name email')
        .populate({
          path: 'teams',
          populate: {
            path: 'players',
            select: 'nickname skillLevel handedness preferredPosition profileImage'
          }
        });
    });
    
    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(league);
  } catch (error) {
    console.error('Error fetching league:', error);
    return NextResponse.json(
      { error: 'Failed to fetch league' },
      { status: 500 }
    );
  }
}

// PATCH /api/leagues/[id] - Update a league
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
    
    const league = await withConnection(async () => {
      const league = await LeagueModel.findById(id);
      
      if (!league) {
        throw new Error('League not found');
      }
      
      // Ensure user can only update leagues they organize
      if (league.organizer.toString() !== session.user.id) {
        throw new Error('Unauthorized');
      }
      
      // Validate status changes
      if (data.status !== undefined) {
        const currentStatus = league.status;
        const newStatus = data.status;
        
        // Validate status transition
        if (!isValidStatusTransition(currentStatus, newStatus)) {
          throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
        }
        
        // Additional validation for specific transitions
        if (newStatus === 'active' && league.teams.length < league.minTeams) {
          throw new Error(`League must have at least ${league.minTeams} teams to be activated`);
        }
        
        league.status = newStatus;
      }
      
      // Update basic info
      if (data.name !== undefined) {
        // Check for name uniqueness if changed
        if (data.name !== league.name) {
          const existingLeague = await LeagueModel.findOne({ name: data.name });
          if (existingLeague) {
            throw new Error('League with this name already exists');
          }
          league.name = data.name;
        }
      }
      
      // Update other fields
      if (data.description !== undefined) league.description = data.description;
      if (data.startDate !== undefined) league.startDate = new Date(data.startDate);
      if (data.endDate !== undefined) league.endDate = new Date(data.endDate);
      if (data.registrationDeadline !== undefined) {
        league.registrationDeadline = new Date(data.registrationDeadline);
      }
      if (data.maxTeams !== undefined) league.maxTeams = data.maxTeams;
      if (data.minTeams !== undefined) league.minTeams = data.minTeams;
      if (data.matchFormat !== undefined) league.matchFormat = data.matchFormat;
      if (data.venue !== undefined) league.venue = data.venue;
      if (data.banner !== undefined) league.banner = data.banner;
      if (data.pointsPerWin !== undefined) league.pointsPerWin = data.pointsPerWin;
      if (data.pointsPerLoss !== undefined) league.pointsPerLoss = data.pointsPerLoss;
      
      // Cannot modify teams directly through this endpoint
      // Teams are added/removed through separate endpoints
      
      return await league.save();
    });
    
    return NextResponse.json(league);
  } catch (error) {
    console.error('Error updating league:', error);
    
    if (error instanceof Error) {
      if (error.message === 'League not found') {
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
      
      if (error.message === 'League with this name already exists') {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      
      if (error.message.includes('Invalid status transition') ||
          error.message.includes('League must have at least')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update league' },
      { status: 500 }
    );
  }
}

// DELETE /api/leagues/[id] - Delete a league (change status to canceled)
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
      const league = await LeagueModel.findById(id);
      
      if (!league) {
        throw new Error('League not found');
      }
      
      // Ensure user can only delete leagues they organize
      if (league.organizer.toString() !== session.user.id) {
        throw new Error('Unauthorized');
      }
      
      // Soft delete by setting status to canceled
      league.status = 'canceled';
      await league.save();
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting league:', error);
    
    if (error instanceof Error) {
      if (error.message === 'League not found') {
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
      { error: 'Failed to delete league' },
      { status: 500 }
    );
  }
}

// Helper function to validate league status transitions
function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'draft': ['registration', 'canceled'],
    'registration': ['active', 'canceled'],
    'active': ['completed', 'canceled'],
    'completed': ['canceled'],
    'canceled': []
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
}
