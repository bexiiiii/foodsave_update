import { NextResponse } from 'next/server';

// API_URL должен быть https://foodsave.kz/api (с /api на конце)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://foodsave.kz/api';

export async function GET(request: Request) {
    try {
        // Get authorization header from request
        const authHeader = request.headers.get('authorization');
        
        if (!authHeader) {
            return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
        }

        // Forward the request to the backend
        const response = await fetch(`${API_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Authentication failed' }, { status: response.status });
        }

        const userData = await response.json();
        return NextResponse.json(userData);
    } catch (error) {
        console.error('Auth me error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
