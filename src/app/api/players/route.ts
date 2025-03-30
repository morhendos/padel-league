import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { withConnection } from '@/lib/db';
import { PlayerModel } from '@/models';
import { CreatePlayerRequest } from '@/types';

// GET /api/players - Get all players with optional filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nickname = searchParams.get('nickname');
    const skillLevel = searchParams.get('skillLevel');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const skip = (page - 1) * limit;
    
    const query: any = {};
    
    if (nickname) {
      query.nickname = { $regex: nickname, $options: 'i' };
    }
    
    if (skillLevel) {
      query.skillLevel = parseInt(skillLevel);
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }
    
    const players = await withConnection(async () => {
      const total = await PlayerModel.countDocuments(query);
      const players = await PlayerModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      return {
        players,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    });
    
    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

// POST /api/players - Create a new player
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const data: CreatePlayerRequest = await request.json();
    
    const newPlayer = await withConnection(async () => {
      // Check if user already has a player profile
      const existingPlayer = await PlayerModel.findOne({ userId: session.user.id });
      
      if (existingPlayer) {
        throw new Error('User already has a player profile');
      }
      
      const player = new PlayerModel({
        userId: session.user.id,
        nickname: data.nickname,
        skillLevel: data.skillLevel,
        handedness: data.handedness,
        preferredPosition: data.preferredPosition,
        contactPhone: data.contactPhone,
        bio: data.bio,
        profileImage: data.profileImage,
        isActive: true
      });
      
      return await player.save();
    });
    
    return NextResponse.json(newPlayer, { status: 201 });
  } catch (error) {
    console.error('Error creating player:', error);
    
    if (error instanceof Error) {
      if (error.message === 'User already has a player profile') {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  }
}
