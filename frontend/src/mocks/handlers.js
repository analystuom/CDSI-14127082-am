import { http, HttpResponse } from 'msw';

// Mock API handlers for testing
export const handlers = [
  // Authentication endpoints
  http.post('/auth/register', async ({ request }) => {
    const { username, email, password, role } = await request.json();
    
    if (username === 'existinguser') {
      return HttpResponse.json(
        { detail: 'Username already exists' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json({
      access_token: 'mock_access_token_123',
      token_type: 'bearer',
      user: {
        id: 'mock_user_id',
        username,
        email,
        role: role || 'user',
        created_at: new Date().toISOString(),
        is_active: true
      }
    });
  }),

  rest.post('/auth/login', (req, res, ctx) => {
    const { username, password } = req.body;
    
    if (username === 'testuser' && password === 'testpassword123') {
      return res(
        ctx.status(200),
        ctx.json({
          access_token: 'mock_access_token_123',
          token_type: 'bearer',
          user: {
            id: 'mock_user_id',
            username: 'testuser',
            email: 'test@example.com',
            role: 'user',
            created_at: new Date().toISOString(),
            is_active: true
          }
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ detail: 'Invalid credentials' })
    );
  }),

  rest.get('/auth/me', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(
        ctx.status(401),
        ctx.json({ detail: 'Not authenticated' })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        id: 'mock_user_id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        created_at: new Date().toISOString(),
        is_active: true
      })
    );
  }),

  // Sentiment analysis endpoints
  rest.get('/api/trends/sentiment-over-time', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return res(
        ctx.status(401),
        ctx.json({ detail: 'Not authenticated' })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          {
            month: '2023-01',
            avg_sentiment: 4.2,
            total_reviews: 150,
            positive_count: 120,
            negative_count: 30
          },
          {
            month: '2023-02',
            avg_sentiment: 3.8,
            total_reviews: 200,
            positive_count: 140,
            negative_count: 60
          }
        ],
        summary: {
          total_reviews: 350,
          avg_sentiment: 4.0,
          positive_percentage: 74.3,
          negative_percentage: 25.7
        }
      })
    );
  }),

  rest.get('/api/sentiment-distribution', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { _id: 1, count: 10, percentage: 5.0 },
        { _id: 2, count: 20, percentage: 10.0 },
        { _id: 3, count: 50, percentage: 25.0 },
        { _id: 4, count: 80, percentage: 40.0 },
        { _id: 5, count: 40, percentage: 20.0 }
      ])
    );
  }),

  rest.post('/api/analyze-sentiment', (req, res, ctx) => {
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res(
        ctx.status(422),
        ctx.json({ detail: 'Text is required' })
      );
    }
    
    // Simple mock sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'worst'];
    
    const lowerText = text.toLowerCase();
    const hasPositive = positiveWords.some(word => lowerText.includes(word));
    const hasNegative = negativeWords.some(word => lowerText.includes(word));
    
    let sentiment = 'NEUTRAL';
    let confidence = 0.6;
    
    if (hasPositive && !hasNegative) {
      sentiment = 'POSITIVE';
      confidence = 0.85;
    } else if (hasNegative && !hasPositive) {
      sentiment = 'NEGATIVE';
      confidence = 0.85;
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        sentiment,
        confidence,
        text
      })
    );
  }),

  // Product endpoints
  rest.get('/api/products', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'product_1',
          name: 'Test Product 1',
          asin: 'B08N5WRWNW',
          category: 'Electronics',
          avg_rating: 4.2,
          total_reviews: 1500
        },
        {
          id: 'product_2',
          name: 'Test Product 2',
          asin: 'B07XJ8C8F5',
          category: 'Home & Garden',
          avg_rating: 3.8,
          total_reviews: 850
        }
      ])
    );
  }),

  rest.get('/api/products/:productId', (req, res, ctx) => {
    const { productId } = req.params;
    
    return res(
      ctx.status(200),
      ctx.json({
        id: productId,
        name: `Test Product ${productId}`,
        asin: 'B08N5WRWNW',
        category: 'Electronics',
        description: 'A great test product for testing purposes',
        avg_rating: 4.2,
        total_reviews: 1500,
        price: 99.99,
        image_url: 'https://example.com/product-image.jpg'
      })
    );
  }),

  // Reviews endpoints
  rest.get('/api/reviews', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        reviews: [
          {
            id: 'review_1',
            text: 'This product is amazing! I love it so much.',
            rating: 5,
            sentiment: 'POSITIVE',
            date: '2023-01-15',
            verified: true
          },
          {
            id: 'review_2',
            text: 'Not what I expected. Quality could be better.',
            rating: 2,
            sentiment: 'NEGATIVE',
            date: '2023-01-10',
            verified: true
          }
        ],
        total: 2,
        page: 1,
        limit: 10
      })
    );
  }),

  // Dashboard endpoints
  rest.get('/api/dashboard/stats', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        total_products: 150,
        total_reviews: 25000,
        avg_sentiment: 4.1,
        sentiment_trend: 'positive',
        recent_activity: [
          {
            type: 'new_review',
            product: 'Test Product',
            timestamp: new Date().toISOString()
          }
        ]
      })
    );
  }),

  // Emotion analysis endpoints
  rest.post('/api/analyze-emotions', (req, res, ctx) => {
    const { text } = req.body;
    
    if (!text) {
      return res(
        ctx.status(422),
        ctx.json({ detail: 'Text is required' })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        emotions: [
          { label: 'joy', score: 0.75 },
          { label: 'sadness', score: 0.15 },
          { label: 'anger', score: 0.05 },
          { label: 'fear', score: 0.03 },
          { label: 'surprise', score: 0.02 }
        ],
        dominant_emotion: 'joy',
        text
      })
    );
  }),

  // Error handlers
  rest.get('/api/error-test', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ detail: 'Internal server error for testing' })
    );
  }),

  // Fallback handler for unmatched requests
  rest.get('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} request to ${req.url}`);
    return res(
      ctx.status(404),
      ctx.json({ detail: 'Not found' })
    );
  })
];
