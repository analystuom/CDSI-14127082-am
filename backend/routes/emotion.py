from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from models import ReviewRequest, EmotionScore, UserInDB
from auth import get_current_active_user
from config import get_collection
import logging
import re
from bs4 import BeautifulSoup

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["emotion"])

# Global variable to store the emotion analysis pipeline
emotion_pipeline = None

# Emotion categories for Sankey chart (matching frontend categorization)
POSITIVE_EMOTIONS = [
    'admiration', 'approval', 'love', 'joy', 'optimism', 
    'gratitude', 'caring', 'excitement', 'relief', 'amusement'
]

NEGATIVE_EMOTIONS = [
    'disappointment', 'disapproval', 'annoyance', 'sadness', 'confusion', 
    'disgust', 'anger', 'fear', 'remorse', 'embarrassment', 'nervousness', 'grief'
]

# Threshold for counting emotions as detected
EMOTION_DETECTION_THRESHOLD = 0.1

def clean_review_text(text: str) -> str:
    """
    Clean review text by removing HTML tags, URLs, emails, and normalizing whitespace.
    
    Args:
        text (str): Raw review text
        
    Returns:
        str: Cleaned text ready for emotion analysis
    """
    if not text or not isinstance(text, str):
        return ""
    
    # Remove HTML tags using BeautifulSoup
    soup = BeautifulSoup(text, 'html.parser')
    text = soup.get_text()
    
    # Remove URLs (http/https)
    text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
    
    # Remove email addresses
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', text)
    
    # Normalize whitespace (replace multiple spaces, newlines, tabs with single space)
    text = re.sub(r'\s+', ' ', text)
    
    # Strip leading and trailing whitespace
    text = text.strip()
    
    return text

def set_emotion_pipeline(pipeline):
    """Set the emotion analysis pipeline (called from main.py during startup)"""
    global emotion_pipeline
    emotion_pipeline = pipeline
    logger.info("Emotion analysis pipeline has been set")

def process_sankey_data(reviews_with_emotions):
    """
    Process emotion results to generate Sankey chart data using rating-based sentiment classification.
    This ensures consistency with Product.js sentiment statistics and prevents double-counting.
    
    Args:
        reviews_with_emotions: List of tuples (review_data, emotion_results) where review_data contains rating
        
    Returns:
        Dict containing Sankey chart data with counts for each emotion category
    """
    # Initialize counters
    total_reviews = len(reviews_with_emotions)
    positive_count = 0
    neutral_count = 0
    negative_count = 0
    emotion_counts = {}
    
    # Initialize emotion counters
    for emotion in POSITIVE_EMOTIONS + NEGATIVE_EMOTIONS:
        emotion_counts[emotion] = 0
    
    # Process each review using rating-based sentiment classification (matching Product.js)
    for review_data, emotion_result in reviews_with_emotions:
        rating = review_data.get('rating', 0)
        
        # Classify sentiment based on rating (same logic as Product.js sentiment-summary)
        if rating < 3.0:
            sentiment_category = 'negative'
            negative_count += 1
        elif rating < 4.0:
            sentiment_category = 'neutral'
            neutral_count += 1
        else:
            sentiment_category = 'positive'
            positive_count += 1
        
        # Within the rating-based sentiment category, find the dominant emotions above threshold
        category_emotions = []
        
        for emotion in emotion_result:
            label = emotion['label'].lower()
            score = emotion['score']
            
            # Only count emotions that exceed the threshold and match the sentiment category
            if score > EMOTION_DETECTION_THRESHOLD:
                if sentiment_category == 'positive' and label in POSITIVE_EMOTIONS:
                    category_emotions.append((label, score))
                elif sentiment_category == 'negative' and label in NEGATIVE_EMOTIONS:
                    category_emotions.append((label, score))
        
        # For this review, increment the count for the highest-scoring emotion in its sentiment category
        if category_emotions:
            # Sort by score and take the highest one to prevent double-counting
            dominant_emotion = max(category_emotions, key=lambda x: x[1])[0]
            emotion_counts[dominant_emotion] += 1
    
    # Filter out emotions with zero counts for cleaner visualization
    filtered_positive_emotions = {k: v for k, v in emotion_counts.items() 
                                if k in POSITIVE_EMOTIONS and v > 0}
    filtered_negative_emotions = {k: v for k, v in emotion_counts.items() 
                                if k in NEGATIVE_EMOTIONS and v > 0}
    
    return {
        "total_reviews": total_reviews,
        "positive_sentiment_count": positive_count,
        "neutral_sentiment_count": neutral_count,
        "negative_sentiment_count": negative_count,
        "positive_emotions": filtered_positive_emotions,
        "negative_emotions": filtered_negative_emotions
    }

@router.post("/analyze-emotion", response_model=List[EmotionScore])
async def analyze_emotion(request: ReviewRequest):
    """
    Analyze emotions in the provided text using the SamLowe/roberta-base-go_emotions model.
    Returns scores for all 28 emotions.
    """
    try:
        if emotion_pipeline is None:
            raise HTTPException(
                status_code=500, 
                detail="Emotion analysis model not loaded. Please restart the server."
            )
        
        logger.info(f"Analyzing emotion for text: {request.text[:100]}...")
        
        # Clean the text before analysis
        cleaned_text = clean_review_text(request.text)
        if not cleaned_text or len(cleaned_text.strip()) < 5:
            raise HTTPException(status_code=400, detail="Text is too short after cleaning")
        
        # Run the emotion analysis on cleaned text
        results = emotion_pipeline(cleaned_text, top_k=None)
        
        # Convert the results to our response format
        emotion_scores = []
        
        # Check if results is nested (like with return_all_scores=True) or flat
        if isinstance(results, list) and len(results) > 0 and isinstance(results[0], list):
            # Nested structure: results[0] contains the list of emotions
            for result in results[0]:
                emotion_scores.append(EmotionScore(
                    label=result['label'],
                    score=result['score']
                ))
        else:
            # Flat structure: results directly contains the list of emotions
            for result in results:
                emotion_scores.append(EmotionScore(
                    label=result['label'],
                    score=result['score']
                ))
        
        logger.info(f"Successfully analyzed {len(emotion_scores)} emotions")
        return emotion_scores
        
    except Exception as e:
        logger.error(f"Error analyzing emotion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing emotion: {str(e)}")

@router.get("/analyze-product-emotions/{parent_asin}")
async def analyze_product_emotions(
    parent_asin: str,
    include_sankey_data: Optional[bool] = Query(False, description="Include Sankey chart data in response"),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Analyze emotions for all reviews of a specific product.
    Fetches all reviews, processes them through emotion analysis, and returns aggregated results.
    """
    try:
        if emotion_pipeline is None:
            raise HTTPException(
                status_code=500, 
                detail="Emotion analysis model not loaded. Please restart the server."
            )
        
        logger.info(f"Starting comprehensive emotion analysis for product: {parent_asin}")
        
        # Fetch all reviews for the product (matching Product.js sentiment-summary logic)
        collection = get_collection("reviews_main")
        query = {
            "$or": [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ],
            "text": {"$exists": True, "$ne": None, "$ne": ""},
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5}  # Match Product.js rating filter
        }
        
        cursor = collection.find(query, {"text": 1, "rating": 1, "_id": 1})
        reviews = await cursor.to_list(length=None)  # Get ALL reviews
        
        logger.info(f"Found {len(reviews)} reviews for emotion analysis")
        
        if not reviews:
            return {
                "parent_asin": parent_asin,
                "total_reviews": 0,
                "processed_reviews": 0,
                "top_emotions": [],
                "all_emotions": [],
                "message": "No reviews found for this product"
            }
        
        # Process each review through emotion analysis
        all_emotion_results = []
        reviews_with_emotions = []  # Store both review data and emotion results for Sankey processing
        processed_count = 0
        failed_count = 0
        
        for i, review in enumerate(reviews):
            try:
                review_text = review.get("text", "")
                if not review_text or len(review_text.strip()) < 5:
                    continue
                
                # Clean the review text before analysis
                cleaned_text = clean_review_text(review_text)
                if not cleaned_text or len(cleaned_text.strip()) < 5:
                    continue
                
                # Analyze emotions for the cleaned review text
                results = emotion_pipeline(cleaned_text, top_k=None)
                
                # Extract emotion scores
                if isinstance(results, list) and len(results) > 0 and isinstance(results[0], list):
                    emotions = results[0]
                else:
                    emotions = results
                
                all_emotion_results.append(emotions)
                # Store both review data and emotions for Sankey processing
                reviews_with_emotions.append((review, emotions))
                processed_count += 1
                
                # Log progress every 50 reviews
                if (i + 1) % 50 == 0:
                    logger.info(f"Processed {i + 1}/{len(reviews)} reviews...")
                    
            except Exception as e:
                logger.warning(f"Failed to analyze review {i}: {str(e)}")
                failed_count += 1
                continue
        
        logger.info(f"Emotion analysis complete: {processed_count} successful, {failed_count} failed")
        
        if not all_emotion_results:
            return {
                "parent_asin": parent_asin,
                "total_reviews": len(reviews),
                "processed_reviews": 0,
                "top_emotions": [],
                "all_emotions": [],
                "message": "No reviews could be processed for emotion analysis"
            }
        
        # Aggregate emotion scores across all reviews
        emotion_totals = {}
        for emotion_result in all_emotion_results:
            for emotion in emotion_result:
                label = emotion['label']
                score = emotion['score']
                
                if label not in emotion_totals:
                    emotion_totals[label] = []
                emotion_totals[label].append(score)
        
        # Calculate average scores for each emotion
        emotion_averages = []
        for label, scores in emotion_totals.items():
            avg_score = sum(scores) / len(scores)
            emotion_averages.append({
                "label": label,
                "score": avg_score,
                "count": len(scores)
            })
        
        # Sort by score (highest first)
        emotion_averages.sort(key=lambda x: x['score'], reverse=True)
        
        # Get top 10 emotions
        top_10_emotions = emotion_averages[:10]
        
        logger.info(f"Top emotion: {top_10_emotions[0]['label']} (score: {top_10_emotions[0]['score']:.4f})")
        
        # Prepare base response
        response = {
            "parent_asin": parent_asin,
            "total_reviews": len(reviews),
            "processed_reviews": processed_count,
            "failed_reviews": failed_count,
            "top_emotions": top_10_emotions,
            "all_emotions": emotion_averages,
            "message": f"Successfully analyzed emotions from {processed_count} reviews"
        }
        
        # Add Sankey data if requested
        if include_sankey_data:
            logger.info("Processing Sankey chart data with rating-based sentiment classification...")
            sankey_data = process_sankey_data(reviews_with_emotions)
            response["sankey_data"] = sankey_data
            logger.info(f"Sankey data processed: {sankey_data['positive_sentiment_count']} positive, {sankey_data['neutral_sentiment_count']} neutral, {sankey_data['negative_sentiment_count']} negative sentiments")
        
        return response
        
    except Exception as e:
        logger.error(f"Error in comprehensive emotion analysis: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error analyzing product emotions: {str(e)}"
        )