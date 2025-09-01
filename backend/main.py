from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import connect_to_mongo, close_mongo_connection
from redis_config import redis_config
from routes.auth import router as auth_router
from routes.pages import router as pages_router
from routes.reviews import router as reviews_router
from routes.sentiment import router as sentiment_router
from routes.products import router as products_router
from routes.emotion import router as emotion_router, set_emotion_pipeline
from routes.dashboard import router as dashboard_router
from transformers import pipeline
import torch
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up the application...")
    await connect_to_mongo()
    
    logger.info("Connecting to Redis...")
    try:
        await redis_config.connect()
        logger.info("Redis connection established successfully")
    except Exception as e:
        logger.warning(f"Failed to connect to Redis: {str(e)}. Continuing without cache.")
    
    logger.info("Loading emotion analysis model...")
    try:
        if torch.backends.mps.is_available():
            device = "mps"
            logger.info("Using MPS (Apple Silicon GPU) for model acceleration")
        elif torch.cuda.is_available():
            device = "cuda"
            logger.info("Using CUDA GPU for model acceleration")
        else:
            device = "cpu"
            logger.info("Using CPU for model inference")
        
        emotion_classifier = pipeline(
            "text-classification",
            model="SamLowe/roberta-base-go_emotions",
            framework="pt",
            device=device
        )
        set_emotion_pipeline(emotion_classifier)
        logger.info(f"Emotion analysis model loaded successfully on {device.upper()}")
    except Exception as e:
        logger.error(f"Failed to load emotion analysis model: {str(e)}")
        raise e
    
    yield
    
    logger.info("Shutting down the application...")
    await close_mongo_connection()
    
    logger.info("Closing Redis connection...")
    try:
        await redis_config.disconnect()
        logger.info("Redis connection closed successfully")
    except Exception as e:
        logger.warning(f"Error closing Redis connection: {str(e)}")

app = FastAPI(
    title="Sentiment app API",
    description="API for the sentiment app",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(pages_router)
app.include_router(reviews_router)
app.include_router(sentiment_router)
app.include_router(products_router)
app.include_router(emotion_router)
app.include_router(dashboard_router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to the Sentiment App API",
        "description": "API for the sentiment app",
        "endpoints": {
            "authentication": "/auth",
            "pages": "/pages",
            "documentation": "/docs",
            "openapi_schema": "/openapi.json"
        },
        "features": [
            "User registration and login",
            "JWT token authentication",
            "Role-based access control (user/admin)",
            "Protected routes",
            "MongoDB integration",
            "Emotion analysis using Hugging Face models"
        ]
    }

@app.get("/health")
async def health_check():
    redis_status = await redis_config.health_check()
    return {
        "status": "healthy", 
        "message": "API is running",
        "redis_connected": redis_status,
        "cache_available": redis_status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)