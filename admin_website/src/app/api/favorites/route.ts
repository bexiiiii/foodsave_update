import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
        const response = await fetch(`${API_URL}/users/${userId}/favorites`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch favorites');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const { userId, productId } = await request.json();

    if (!userId || !productId) {
        return NextResponse.json({ error: 'User ID and Product ID are required' }, { status: 400 });
    }

    try {
        const response = await fetch(`${API_URL}/users/${userId}/favorites/${productId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to add to favorites');
        }

        return NextResponse.json({ message: 'Added to favorites successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add to favorites' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const productId = searchParams.get('productId');

    if (!userId || !productId) {
        return NextResponse.json({ error: 'User ID and Product ID are required' }, { status: 400 });
    }

    try {
        const response = await fetch(`${API_URL}/users/${userId}/favorites/${productId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to remove from favorites');
        }

        return NextResponse.json({ message: 'Removed from favorites successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to remove from favorites' }, { status: 500 });
    }
} 