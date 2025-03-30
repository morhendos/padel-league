import { NextResponse } from 'next/server';
import { withConnection } from '@/lib/db';
import { RankingModel, LeagueModel } from '@/models';

// GET /api/leagues/[id]/rankings - Get all rankings for a league
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = params.id;
    
    const rankings = await withConnection(async () => {
      // Check if league exists
      const league = await LeagueModel.findById(leagueId);
      
      if (!league) {
        throw new Error('League not found');
      }
      
      // Get rankings sorted by rank
      return RankingModel.find({ league: leagueId })
        .sort({ rank: 1 })
        .populate({
          path: 'team',
          select: 'name players',
          populate: {
            path: 'players',
            select: 'nickname skillLevel profileImage'
          }
        });
    });
    
    return NextResponse.json(rankings);
  } catch (error) {
    console.error('Error fetching league rankings:', error);
    
    if (error instanceof Error && error.message === 'League not found') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch league rankings' },
      { status: 500 }
    );
  }
}
