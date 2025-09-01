# Pulsar Analytics - Technical Documentation

## Quick Start Guide

### Prerequisites

This document will give you the details to setiup the project locally
Before setting up Pulsar Analytics, ensure you have the following installed:

- **Python 3.8+** (recommended: Python 3.12)
- **Node.js 14+** (recommended: Node.js 18+)
- **npm** (comes with Node.js)
- **MongoDB Atlas account** (cloud database)
- **Redis server** (optional, for caching)

### Environment Setup

1. **Clone and Navigate to Project**
   ```bash
   git clone <repository-url>
   cd mvp_v4
   ```

2. **Backend Configuration**
   
   Update `backend/config.py` with your MongoDB connection:
   ```python
   MONGODB_URL = "your-mongodb-atlas-connection-string"
   SECRET_KEY = "your-secure-secret-key"
   ```

<!-- MONGODB_URL = "mongodb+srv://mike123:mike123@customers.sqmfelq.mongodb.net/?retryWrites=true&w=majority&appName=Customers"
DATABASE_NAME = "users"
USERS_COLLECTION = "users" -->

3. **Setup**
   
   Use the provided startup script for automatic setup:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
   
   This script will:
   - Check prerequisites
   - Create Python virtual environment
   - Install all dependencies
   - Setup NLTK data packages
   - Start both backend and frontend servers
   - Open the application in your browser


4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs


5. ## System Architecture

### High-Level Architecture

### Component Architecture

#### Frontend Architecture
- **Single Page Application (SPA)** with React 18
- **Client-side routing** with React Router v6
- **State management** using Context API and TanStack Query
- **Component-based architecture** with reusable UI components
- **Responsive design** with Tailwind CSS
- **Advanced data visualizations** using Chart.js, D3.js, and ApexCharts

#### Backend Architecture
- **RESTful API** built with FastAPI
- **Asynchronous processing** with Python asyncio
- **Microservice-style routing** with modular route handlers
- **JWT-based authentication** with role-based access control
- **Caching layer** with Redis for performance optimization
- **Machine learning integration** with Hugging Face Transformers

#### Data Architecture
- **Primary database**: MongoDB Atlas (cloud-hosted)
- **Caching layer**: Redis for query optimization
- **Data processing**: NLTK for natural language processing
- **ML models**: Hugging Face RoBERTa for emotion analysis

## Technology Stack

### Frontend Technologies

#### Core Framework
- **React 18.2.0** - Modern React with hooks and concurrent features
- **React Router DOM 6.8.0** - Client-side routing and navigation
- **React Scripts 5.0.1** - Build tooling and development server

#### State Management
- **TanStack Query 5.84.0** - Server state management and caching
- **React Context API** - Global state for authentication and product selection
- **Custom hooks** - Encapsulated business logic and API interactions

#### Data Visualization
- **Chart.js 4.5.0** - Primary charting library for statistical visualizations
- **React-ChartJS-2 5.3.0** - React wrapper for Chart.js
- **D3.js 7.8.5** - Advanced custom visualizations (word clouds, maps)
- **ApexCharts 4.1.0** - Interactive charts with built-in features
- **React-ApexCharts 1.4.1** - React integration for ApexCharts

#### Specialized Visualization Libraries
- **D3-Cloud 1.2.7** - Word cloud generation
- **D3-Hexbin 0.2.2** - Hexagonal binning for sentiment visualization
- **D3-Sankey 0.12.3** - Sankey diagrams for emotion flow analysis
- **Leaflet 1.9.4** - Interactive maps for geographic sentiment analysis
- **React-Leaflet 4.2.1** - React integration for Leaflet maps

#### UI and Styling
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **Headless UI 1.7.18** - Unstyled, accessible UI components
- **Heroicons 2.0.18** - SVG icon library
- **Tailwind-Merge 2.2.1** - Utility for merging Tailwind classes
- **Clsx 2.1.1** - Utility for constructing className strings conditionally

#### Testing Framework
- **Testing Library Jest-DOM 6.8.0** - Custom Jest matchers for DOM testing
- **Testing Library React 16.3.0** - React component testing utilities
- **Testing Library User-Event 14.6.1** - User interaction simulation
- **MSW 2.10.5** - Mock Service Worker for API mocking

#### HTTP and Data Handling
- **Axios 1.3.0** - HTTP client for API communication
- **Date-fns 3.6.0** - Date manipulation and formatting
- **ChartJS-Adapter-Date-fns 3.0.0** - Date adapter for Chart.js

### Backend Technologies

#### Core Framework
- **FastAPI 0.104.1** - Modern, fast web framework for building APIs
- **Uvicorn 0.24.0** - ASGI server for running FastAPI applications
- **Python 3.12** - Latest Python runtime with performance improvements

#### Database and ORM
- **Motor 3.6.0** - Asynchronous MongoDB driver for Python
- **PyMongo 4.9.1** - MongoDB driver and utilities
- **Pydantic 2.5.2** - Data validation and serialization

#### Authentication and Security
- **Python-JOSE 3.3.0** - JWT token handling and cryptography
- **Passlib 1.7.4** - Password hashing utilities
- **Bcrypt 4.1.2** - Secure password hashing algorithm
- **Python-Multipart 0.0.6** - Form data parsing

#### Machine Learning and NLP
- **Transformers 4.45.1** - Hugging Face transformers library
- **PyTorch 2.4.1** - Deep learning framework for ML models
- **NLTK 3.8.1** - Natural Language Toolkit for text processing

#### Caching and Performance
- **Redis 5.0.1** - In-memory data structure store
- **Aioredis 2.0.1** - Asynchronous Redis client

#### Testing Framework
- **Pytest 7.4.3** - Testing framework for Python
- **Pytest-Asyncio 0.21.1** - Async testing support
- **HTTPX 0.25.2** - HTTP client for testing
- **Pytest-Mock 3.12.0** - Mocking utilities
- **FakeRedis 2.20.1** - Redis mocking for tests
- **Pytest-Cov 4.1.0** - Coverage reporting

#### Utilities
- **Python-Dotenv 1.0.0** - Environment variable management
- **Email-Validator 2.1.0** - Email validation utilities
- **BeautifulSoup4 4.12.2** - HTML/XML parsing for data extraction

## Database Schema

### MongoDB Collections

#### Users Collection (`users`)
```javascript
{
  "_id": ObjectId("..."),
  "email": "user@example.com",
  "username": "username",
  "hashed_password": "bcrypt_hash",
  "role": "user" | "admin",
  "created_at": ISODate("..."),
  "is_active": true
}
```

#### Products Collection (`products_main`)
```javascript
{
  "_id": ObjectId("..."),
  "asin": "B08XYZ123",
  "parent_asin": "B08XYZ123",
  "title": "Product Title",
  "categories": ["Electronics", "Computers"],
  "price": 99.99,
  "rating": 4.2,
  "review_count": 1500,
  "image_url": "https://...",
  "description": "Product description...",
  "features": ["Feature 1", "Feature 2"],
  "brand": "Brand Name",
  "created_at": ISODate("...")
}
```

#### Reviews Collection (`reviews_main`)
```javascript
{
  "_id": ObjectId("..."),
  "asin": "B08XYZ123",
  "parent_asin": "B08XYZ123",
  "reviewer_id": "A1B2C3D4E5F6G7",
  "reviewer_name": "John Doe",
  "rating": 4,
  "title": "Great product!",
  "text": "This product exceeded my expectations...",
  "timestamp": 1640995200,
  "verified_purchase": true,
  "helpful_votes": 5,
  "vine_customer": false,
  "location": "United States",
  "created_at": ISODate("...")
}
```

## API Endpoints

### Authentication Endpoints (`/auth`)
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `GET /auth/me` - Get current user information

### Product Endpoints (`/api/products`)
- `GET /api/products/by-category` - Get products by category
- `GET /api/products/search` - Search products by query
- `GET /api/products/details/{parent_asin}` - Get detailed product information
- `GET /api/products/recommendations` - Get product recommendations

### Review Endpoints (`/api/reviews`)
- `GET /api/reviews/wordcloud` - Generate word cloud data using NLTK
- `GET /api/reviews/wordcloud-legacy` - Get raw review data for modals
- `GET /api/reviews/by-product` - Get reviews for specific product
- `GET /api/reviews/statistics` - Get review statistics and metrics

### Sentiment Analysis Endpoints (`/api`)
- `GET /api/trends/sentiment-over-time` - Sentiment trends over time
- `GET /api/sentiment/distribution` - Sentiment distribution analysis
- `GET /api/sentiment/geographic` - Geographic sentiment mapping
- `GET /api/sentiment/comparison` - Multi-product sentiment comparison

### Emotion Analysis Endpoints (`/api/emotion`)
- `POST /api/emotion/analyze` - Analyze emotions in text using Hugging Face models
- `GET /api/emotion/batch-analyze` - Batch emotion analysis for multiple reviews
- `GET /api/emotion/statistics` - Emotion analysis statistics

### Dashboard Endpoints (`/api/dashboard`)
- `GET /api/dashboard/summary` - Dashboard summary statistics
- `GET /api/dashboard/metrics` - Key performance metrics
- `GET /api/dashboard/trends` - Trending data and insights


## Application Pages and Components

### Application Features

#### Core Analysis Tools
- **Product Analysis**
- **Word Cloud Visualization**
- **Product Comparison**
- **Sentiment Timeline**
- **Hexagonal Visualization**
- **Geographic Sentiment Map**
- **Opinion & Tone Analysis**

#### User Interface Pages
- **Guest Landing Page**
- **Main Dashboard**
- **Professional Dashboard**
- **Product Selection**
- **User Profile**

### Key Components
- **Sidebar.js** - Navigation sidebar with menu items
- **Login.js** - User authentication form
- **Register.js** - User registration form
- **ProtectedRoute.js** - Route protection component

### Visualization Components
- **DashboardSentimentArea.js**
- **DashboardSentimentDistribution.js**
- **DashboardSentimentLine.js**
- **DashboardSentimentMap.js**
- **DashboardSentimentPieChart.js**
- **CalendarHeatmap.js**
- **SankeyChart.js**

### Comparison Components
- **ComparisonCards.js**
- **ComparisonDropdown.js**
- **PositiveReviewsScatter.js**
- **NegativeReviewsScatter.js**
- **SentimentPieCharts.js**



### Project Structure Overview

```
mvp_v4/
├── backend/                    # FastAPI backend application
│   ├── routes/                # API route handlers
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── dashboard.py      # Dashboard data endpoints
│   │   ├── emotion.py        # Emotion analysis endpoints
│   │   ├── pages.py          # Page data endpoints
│   │   ├── products.py       # Product management endpoints
│   │   ├── reviews.py        # Review analysis endpoints
│   │   └── sentiment.py      # Sentiment analysis endpoints
│   ├── models.py             # Data models
│   ├── auth.py               # Authentication
│   ├── config.py             # Configuration management
│   ├── redis_config.py       # Redis caching
│   ├── cache_utils.py        # Caching utilities and decorators
│   ├── setup_nltk.py         # NLTK setup
│   ├── main.py               # FastAPI application entry point
│   └── requirements.txt      # Python dependencies with versions
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── comparison/   # Product comparison components
│   │   │   ├── layout/       # Layout and navigation components
│   │   │   └── ui/           # Generic UI components
│   │   ├── pages/            # Application page components
│   │   ├── contexts/         # React context providers
│   │   ├── hooks/            # Custom React hooks for data fetching
│   │   ├── assets/           # Assets and images
│   │   └── utils/            # Utility functions
│   ├── public/               # Static public assets
│   ├── package.json          # Node.js dependencies
│   └── tailwind.config.js    # Tailwind CSS
├── data_preprocessing/        # Data processing scripts
├── start.sh                  # Automated development startup script
└── TECHNICAL_DOCUMENTATION.md # This comprehensive documentation
```

## Machine Learning Integration

### Hugging Face Models
- **Model**: `SamLowe/roberta-base-go_emotions`
- **Framework**: PyTorch with device optimization (CUDA/MPS/CPU)
- **Emotions Detected**: 27 distinct emotions including joy, sadness, anger, fear, etc.
- **Performance**: Optimized for batch processing with GPU acceleration when available


## Deployment Architecture

### Development Environment
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **MongoDB**: MongoDB Atlas (cloud)