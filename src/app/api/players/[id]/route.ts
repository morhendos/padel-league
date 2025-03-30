import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { withConnection } from '@/lib/db';
import { PlayerModel } from '@/models';

// GET /api/players/[id] - Get a specific player by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const player = await withConnection(async () => {
      return PlayerModel.findById(id);
    });
    
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(player);
  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player' },
      { status: 500 }
    );
  }
}

// PATCH /api/players/[id] - Update a player
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
    
    const player = await withConnection(async () => {
      const player = await PlayerModel.findById(id);
      
      if (!player) {
        throw new Error('Player not found');
      }
      
      // Ensure user can only update their own player profile
      if (player.userId.toString() !== session.user.id) {
        throw new Error('Unauthorized');
      }
      
      // Update only allowed fields
      if (data.nickname !== undefined) player.nickname = data.nickname;
      if (data.skillLevel !== undefined) player.skillLevel = data.skillLevel;
      if (data.handedness !== undefined) player.handedness = data.handedness;
      if (data.preferredPosition !== undefined) player.preferredPosition = data.preferredPosition;
      if (data.contactPhone !== undefined) player.contactPhone = data.contactPhone;
      if (data.bio !== undefined) player.bio = data.bio;
      if (data.profileImage !== undefined) player.profileImage = data.profileImage;
      if (data.isActive !== undefined) player.isActive = data.isActive;
      
      return await player.save();
    });
    
    return NextResponse.json(player);
  } catch (error) {
    console.error('Error updating player:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Player not found') {
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
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}

// DELETE /api/players/[id] - Delete a player (soft delete by setting isActive to false)
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
      const player = await PlayerModel.findById(id);
      
      if (!player) {
        throw new Error('Player not found');
      }
      
      // Ensure user can only delete their own player profile
      if (player.userId.toString() !== session.user.id) {
        throw new Error('Unauthorized');
      }
      
      // Soft delete by setting isActive to false
      player.isActive = false;
      await player.save();
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting player:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Player not found') {
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
      { error: 'Failed to delete player' },
      { status: 500 }
    );
  }
}
