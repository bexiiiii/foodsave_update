import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://foodsave.kz';

export async function POST(request: Request) {
    try {
        // Get authorization header from request
        const authHeader = request.headers.get('authorization');
        
        if (!authHeader) {
            return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
        }

        // Forward the request to the backend
        const response = await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('Backend logout failed, but continuing with local logout');
        }

        return NextResponse.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        // Even if backend logout fails, we should return success
        // to allow the frontend to clear its state
        return NextResponse.json({ message: 'Logout completed' });
    }
}
