from fastapi import APIRouter, Depends, HTTPException, status
from models import UserInDB
from auth import get_current_active_user
from config import get_collection
from typing import Optional, List, Dict
from collections import Counter
import nltk
import re
import string

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

# Download NLTK data if not already present
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    try:
        nltk.download('punkt', quiet=True)
    except:
        pass

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    try:
        nltk.download('stopwords', quiet=True)
    except:
        pass

try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    try:
        nltk.download('averaged_perceptron_tagger', quiet=True)
    except:
        pass

# Import NLTK components
try:
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    from nltk import pos_tag
    nltk_available = True
    english_stopwords = set(stopwords.words('english'))
except:
    nltk_available = False
    english_stopwords = set()

# Custom stop words for domain-specific filtering
CUSTOM_STOP_WORDS = [
    'product', 'item', 'box', 'package', 'buy', 'purchase', 'order', 'price',
    'delivery', 'shipping', 'customer', 'service', 'company', 'email', 'phone', 
    'review', 'time', 'thing', 'stuff', 'things', 'way', 'day', 'days', 'week',
    'weeks', 'month', 'months', 'year', 'years', 'amazon', 'seller', 'store',
    'money', 'dollar', 'dollars', 'cost', 'costs', 'expensive', 'cheap',
    'brand', 'model', 'version', 'size', 'color', 'black', 'white', 'red',
    'blue', 'green', 'yellow', 'small', 'medium', 'large', 'big', 'little'
]

# UK Cities coordinates mapping for sentiment map
UK_CITIES_COORDINATES = {
    'London': {'lat': 51.5074, 'lng': -0.1278},
    'Manchester': {'lat': 53.4808, 'lng': -2.2426},
    'Birmingham': {'lat': 52.4862, 'lng': -1.8904},
    'Liverpool': {'lat': 53.4084, 'lng': -2.9916},
    'Leeds': {'lat': 53.8008, 'lng': -1.5491},
    'Sheffield': {'lat': 53.3811, 'lng': -1.4701},
    'Bristol': {'lat': 51.4545, 'lng': -2.5879},
    'Glasgow': {'lat': 55.8642, 'lng': -4.2518},
    'Edinburgh': {'lat': 55.9533, 'lng': -3.1883},
    'Newcastle': {'lat': 54.9783, 'lng': -1.6178},
    'Cardiff': {'lat': 51.4816, 'lng': -3.1791},
    'Belfast': {'lat': 54.5973, 'lng': -5.9301},
    'Nottingham': {'lat': 52.9548, 'lng': -1.1581},
    'Leicester': {'lat': 52.6369, 'lng': -1.1398},
    'Coventry': {'lat': 52.4068, 'lng': -1.5197},
    'Hull': {'lat': 53.7457, 'lng': -0.3367},
    'Bradford': {'lat': 53.7960, 'lng': -1.7594},
    'Southampton': {'lat': 50.9097, 'lng': -1.4044},
    'Plymouth': {'lat': 50.3755, 'lng': -4.1427},
    'Reading': {'lat': 51.4543, 'lng': -0.9781}
}

@router.get("/for-heatmap")
async def get_reviews_for_heatmap(
    parent_asin: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Get all reviews for a single product to generate sentiment heatmap visualization.
    Returns processed review data with sentiment classification and review snippets.
    """
    try:
        collection = get_collection("reviews_main")
        
        # Build query to find all reviews for the specified parent_asin
        query = {
            "$or": [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}  # Fallback to asin if parent_asin not available
            ],
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},  # Valid ratings only
            "text": {"$exists": True, "$ne": None, "$ne": ""}  # Reviews with text content
        }
        
        # Fetch all reviews without limit for comprehensive heatmap data
        cursor = collection.find(
            query,
            {
                "asin": 1,
                "parent_asin": 1,
                "rating": 1,
                "text": 1,
                "_id": 1,
                "timestamp": 1  # Include timestamp for calendar heatmap
            }
        )
        
        reviews = await cursor.to_list(length=None)
        
        # Log the number of reviews for performance monitoring
        print(f"Processing {len(reviews)} reviews for heatmap visualization (parent_asin: {parent_asin})")
        
        if not reviews:
            return []
        
        # Process each review and classify sentiment
        processed_reviews = []
        
        for review in reviews:
            # Extract rating and classify sentiment
            raw_rating = review.get("rating", 3)
            
            # Ensure rating is a float (handle string ratings from database)
            try:
                if isinstance(raw_rating, str):
                    rating = float(raw_rating)
                else:
                    rating = float(raw_rating)
            except (ValueError, TypeError):
                rating = 3.0  # Default to neutral if conversion fails
            
            # Ensure rating is within valid range
            rating = max(1.0, min(5.0, rating))
            
            # Classify sentiment based on rating with new float-based rules
            # 1.0-2.9 = negative, 3.0-3.9 = neutral, 4.0-5.0 = positive
            if rating < 3.0:
                sentiment = "negative"
            elif rating < 4.0:
                sentiment = "neutral"
            else:  # rating >= 4.0
                sentiment = "positive"
            
            # Create review snippet (first ~150 characters)
            review_text = review.get("text", "")
            review_snippet = review_text[:150] + "..." if len(review_text) > 150 else review_text
            
            # Create processed review object
            processed_review = {
                "review_id": str(review.get("_id", "")),
                "sentiment": sentiment,
                "rating": rating,
                "review_snippet": review_snippet,
                "timestamp": review.get("timestamp")  # Include timestamp for calendar heatmap
            }
            
            processed_reviews.append(processed_review)
        
        print(f"Successfully processed {len(processed_reviews)} reviews for heatmap")
        
        return processed_reviews
        
    except Exception as e:
        print(f"Error in get_reviews_for_heatmap: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching reviews for heatmap: {str(e)}"
        )

def process_text_with_nltk(text):
    """Process text using NLTK to extract qualitative adjectives"""
    if not nltk_available or not text:
        return []
    
    try:
        # Clean and normalize text
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)  # Remove punctuation
        text = re.sub(r'\s+', ' ', text).strip()  # Normalize whitespace
        
        # Tokenize
        tokens = word_tokenize(text)
        
        # POS tagging
        pos_tags = pos_tag(tokens)
        
        # Extract adjectives
        adjectives = []
        for word, pos in pos_tags:
            # Keep words that are adjectives (JJ, JJR, JJS)
            if (pos.startswith('JJ') and 
                word not in english_stopwords and
                word not in CUSTOM_STOP_WORDS and
                len(word) >= 3 and 
                len(word) <= 15 and
                word.isalpha()):
                adjectives.append(word)
        
        return adjectives
    except Exception as e:
        print(f"Error in NLTK processing: {str(e)}")
        return []

def process_text_for_bigrams(text):
    """Process text using NLTK to extract qualitative bi-grams (pairs of words)"""
    if not nltk_available or not text:
        return []
    
    try:
        # Clean and normalize text
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)  # Remove punctuation
        text = re.sub(r'\s+', ' ', text).strip()  # Normalize whitespace
        
        # Tokenize
        tokens = word_tokenize(text)
        
        # POS tagging
        pos_tags = pos_tag(tokens)
        
        # Filter tokens to keep meaningful words
        filtered_tokens = []
        for word, pos in pos_tags:
            # Keep adjectives, nouns, and some verbs
            if (pos.startswith('JJ') or pos.startswith('NN') or pos.startswith('VB')) and \
               word not in english_stopwords and \
               word not in CUSTOM_STOP_WORDS and \
               len(word) >= 3 and \
               len(word) <= 15 and \
               word.isalpha():
                filtered_tokens.append(word)
        
        # Generate bi-grams from filtered tokens
        bigrams = []
        for i in range(len(filtered_tokens) - 1):
            bigram = f"{filtered_tokens[i]} {filtered_tokens[i + 1]}"
            bigrams.append(bigram)
        
        return bigrams
    except Exception as e:
        print(f"Error in NLTK bi-gram processing: {str(e)}")
        return []

def process_text_for_trigrams(text):
    """Process text using NLTK to extract qualitative tri-grams (triplets of words)"""
    if not nltk_available or not text:
        return []
    
    try:
        # Clean and normalize text
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)  # Remove punctuation
        text = re.sub(r'\s+', ' ', text).strip()  # Normalize whitespace
        
        # Tokenize
        tokens = word_tokenize(text)
        
        # POS tagging
        pos_tags = pos_tag(tokens)
        
        # Filter tokens to keep meaningful words
        filtered_tokens = []
        for word, pos in pos_tags:
            # Keep adjectives, nouns, and some verbs
            if (pos.startswith('JJ') or pos.startswith('NN') or pos.startswith('VB')) and \
               word not in english_stopwords and \
               word not in CUSTOM_STOP_WORDS and \
               len(word) >= 3 and \
               len(word) <= 15 and \
               word.isalpha():
                filtered_tokens.append(word)
        
        # Generate tri-grams from filtered tokens
        trigrams = []
        for i in range(len(filtered_tokens) - 2):
            trigram = f"{filtered_tokens[i]} {filtered_tokens[i + 1]} {filtered_tokens[i + 2]}"
            trigrams.append(trigram)
        
        return trigrams
    except Exception as e:
        print(f"Error in NLTK tri-gram processing: {str(e)}")
        return []

@router.get("/wordcloud")
async def get_wordcloud_data(
    parent_asin: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Get processed qualitative word data from customer reviews for word cloud generation.
    Uses NLTK to extract adjectives and filter qualitative words.
    """
    try:
        # Check if NLTK is available
        if not nltk_available:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="NLTK not available. Please install nltk package."
            )
        
        collection = get_collection("reviews_main")
        
        # Build query - filter by parent_asin if provided
        query = {"text": {"$exists": True, "$ne": None, "$ne": ""}}
        if parent_asin:
            query["$or"] = [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        
        # Fetch reviews with text field
        cursor = collection.find(
            query,
            {"text": 1, "rating": 1, "asin": 1, "parent_asin": 1, "_id": 0}
        )
        
        reviews = await cursor.to_list(length=None)
        
        # Log the number of reviews being processed for performance monitoring
        print(f"Processing {len(reviews)} reviews for word cloud analysis")
        
        # Add warning for very large datasets
        if len(reviews) > 10000:
            print(f"Warning: Processing {len(reviews)} reviews - this may take longer than usual")
        
        if not reviews:
            return {
                "words": [],
                "total_reviews": 0,
                "parent_asin": parent_asin,
                "message": "No reviews found for processing"
            }
        
        # Process reviews to extract qualitative words with sentiment tracking
        word_sentiment_data = {}  # word -> {"positive": count, "negative": count, "neutral": count, "total": count}
        
        for review in reviews:
            review_text = review.get("text", "")
            rating = review.get("rating", 0)
            
            if not review_text or len(review_text.strip()) < 10:
                continue
            
            # Determine sentiment based on rating
            if rating >= 4:
                sentiment = "positive"
            elif rating <= 2:
                sentiment = "negative"
            else:
                sentiment = "neutral"
            
            # Process text with NLTK
            filtered_words = process_text_with_nltk(review_text)
            
            # Track each word with its sentiment
            for word in filtered_words:
                if word not in word_sentiment_data:
                    word_sentiment_data[word] = {"positive": 0, "negative": 0, "neutral": 0, "total": 0}
                
                word_sentiment_data[word][sentiment] += 1
                word_sentiment_data[word]["total"] += 1
        
        if not word_sentiment_data:
            return {
                "words": [],
                "total_reviews": len(reviews),
                "total_words_found": 0,
                "unique_words": 0,
                "parent_asin": parent_asin,
                "message": "No qualitative words found in reviews"
            }
        
        # Sort words by total frequency and get top 50
        sorted_words = sorted(word_sentiment_data.items(), key=lambda x: x[1]["total"], reverse=True)[:50]
        
        # Format for frontend with sentiment information
        word_data = []
        for word, sentiment_counts in sorted_words:
            total = sentiment_counts["total"]
            positive = sentiment_counts["positive"]
            negative = sentiment_counts["negative"]
            neutral = sentiment_counts["neutral"]
            
            # Determine dominant sentiment
            if positive > negative and positive > neutral:
                dominant_sentiment = "positive"
                color = "green"
            elif negative > positive and negative > neutral:
                dominant_sentiment = "negative"
                color = "red"
            else:
                dominant_sentiment = "neutral"
                color = "gray"
            
            # Calculate percentages
            positive_percentage = round((positive / total) * 100, 1) if total > 0 else 0
            negative_percentage = round((negative / total) * 100, 1) if total > 0 else 0
            neutral_percentage = round((neutral / total) * 100, 1) if total > 0 else 0
            
            word_data.append({
                "text": word,
                "value": total,
                "sentiment": dominant_sentiment,
                "color": color,
                "sentiment_breakdown": {
                    "positive": positive,
                    "negative": negative,
                    "neutral": neutral,
                    "positive_percentage": positive_percentage,
                    "negative_percentage": negative_percentage,
                    "neutral_percentage": neutral_percentage
                }
            })
        
        # Create response message
        message = f"Processed {len(reviews)} reviews and found {len(word_data)} qualitative words using NLTK"
        if parent_asin:
            message += f" for product {parent_asin}"
        
        # Calculate total words processed
        total_words_processed = sum(sentiment_counts["total"] for _, sentiment_counts in word_sentiment_data.items())
        
        return {
            "words": word_data,
            "total_reviews": len(reviews),
            "total_words_found": total_words_processed,
            "unique_words": len(word_sentiment_data),
            "parent_asin": parent_asin,
            "message": message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing word cloud data: {str(e)}"
        )

@router.get("/wordcloud-bigram")
async def get_bigram_wordcloud_data(
    parent_asin: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Get processed bi-gram (word pairs) data from customer reviews for word cloud generation.
    Uses NLTK to extract meaningful word pairs and filter qualitative phrases.
    """
    try:
        # Check if NLTK is available
        if not nltk_available:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="NLTK not available. Please install nltk package."
            )
        
        collection = get_collection("reviews_main")
        
        # Build query - filter by parent_asin if provided
        query = {"text": {"$exists": True, "$ne": None, "$ne": ""}}
        if parent_asin:
            query["$or"] = [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        
        # Fetch reviews with text field
        cursor = collection.find(
            query,
            {"text": 1, "rating": 1, "asin": 1, "parent_asin": 1, "_id": 0}
        )
        
        reviews = await cursor.to_list(length=None)
        
        # Log the number of reviews being processed for performance monitoring
        print(f"Processing {len(reviews)} reviews for bi-gram word cloud analysis")
        
        # Add warning for very large datasets
        if len(reviews) > 10000:
            print(f"Warning: Processing {len(reviews)} reviews for bi-grams - this may take longer than usual")
        
        if not reviews:
            return {
                "words": [],
                "total_reviews": 0,
                "parent_asin": parent_asin,
                "message": "No reviews found for processing"
            }
        
        # Process reviews to extract bi-grams with sentiment tracking
        bigram_sentiment_data = {}  # bigram -> {"positive": count, "negative": count, "neutral": count, "total": count}
        
        for review in reviews:
            review_text = review.get("text", "")
            rating = review.get("rating", 0)
            
            if not review_text or len(review_text.strip()) < 20:  # Require longer text for meaningful bi-grams
                continue
            
            # Determine sentiment based on rating
            if rating >= 4:
                sentiment = "positive"
            elif rating <= 2:
                sentiment = "negative"
            else:
                sentiment = "neutral"
            
            # Process text with NLTK to get bi-grams
            filtered_bigrams = process_text_for_bigrams(review_text)
            
            # Track each bi-gram with its sentiment
            for bigram in filtered_bigrams:
                if bigram not in bigram_sentiment_data:
                    bigram_sentiment_data[bigram] = {"positive": 0, "negative": 0, "neutral": 0, "total": 0}
                
                bigram_sentiment_data[bigram][sentiment] += 1
                bigram_sentiment_data[bigram]["total"] += 1
        
        if not bigram_sentiment_data:
            return {
                "words": [],
                "total_reviews": len(reviews),
                "total_bigrams_found": 0,
                "unique_bigrams": 0,
                "parent_asin": parent_asin,
                "message": "No qualitative bi-grams found in reviews"
            }
        
        # Sort bi-grams by total frequency and get top 40
        sorted_bigrams = sorted(bigram_sentiment_data.items(), key=lambda x: x[1]["total"], reverse=True)[:40]
        
        # Format for frontend with sentiment information
        bigram_data = []
        for bigram, sentiment_counts in sorted_bigrams:
            total = sentiment_counts["total"]
            positive = sentiment_counts["positive"]
            negative = sentiment_counts["negative"]
            neutral = sentiment_counts["neutral"]
            
            # Determine dominant sentiment
            if positive > negative and positive > neutral:
                dominant_sentiment = "positive"
                color = "green"
            elif negative > positive and negative > neutral:
                dominant_sentiment = "negative"
                color = "red"
            else:
                dominant_sentiment = "neutral"
                color = "gray"
            
            # Calculate percentages
            positive_percentage = round((positive / total) * 100, 1) if total > 0 else 0
            negative_percentage = round((negative / total) * 100, 1) if total > 0 else 0
            neutral_percentage = round((neutral / total) * 100, 1) if total > 0 else 0
            
            bigram_data.append({
                "text": bigram,
                "value": total,
                "sentiment": dominant_sentiment,
                "color": color,
                "sentiment_breakdown": {
                    "positive": positive,
                    "negative": negative,
                    "neutral": neutral,
                    "positive_percentage": positive_percentage,
                    "negative_percentage": negative_percentage,
                    "neutral_percentage": neutral_percentage
                }
            })
        
        # Create response message
        message = f"Processed {len(reviews)} reviews and found {len(bigram_data)} qualitative bi-grams using NLTK"
        if parent_asin:
            message += f" for product {parent_asin}"
        
        # Calculate total bi-grams processed
        total_bigrams_processed = sum(sentiment_counts["total"] for _, sentiment_counts in bigram_sentiment_data.items())
        
        return {
            "words": bigram_data,
            "total_reviews": len(reviews),
            "total_bigrams_found": total_bigrams_processed,
            "unique_bigrams": len(bigram_sentiment_data),
            "parent_asin": parent_asin,
            "message": message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing bi-gram word cloud data: {str(e)}"
        )

@router.get("/wordcloud-trigram")
async def get_trigram_wordcloud_data(
    parent_asin: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Get processed tri-gram (word triplets) data from customer reviews for word cloud generation.
    Uses NLTK to extract meaningful word triplets and filter qualitative phrases.
    """
    try:
        # Check if NLTK is available
        if not nltk_available:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="NLTK not available. Please install nltk package."
            )
        
        collection = get_collection("reviews_main")
        
        # Build query - filter by parent_asin if provided
        query = {"text": {"$exists": True, "$ne": None, "$ne": ""}}
        if parent_asin:
            query["$or"] = [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        
        # Fetch reviews with text field
        cursor = collection.find(
            query,
            {"text": 1, "rating": 1, "asin": 1, "parent_asin": 1, "_id": 0}
        )
        
        reviews = await cursor.to_list(length=None)
        
        # Log the number of reviews being processed for performance monitoring
        print(f"Processing {len(reviews)} reviews for tri-gram word cloud analysis")
        
        # Add warning for very large datasets
        if len(reviews) > 10000:
            print(f"Warning: Processing {len(reviews)} reviews for tri-grams - this may take longer than usual")
        
        if not reviews:
            return {
                "words": [],
                "total_reviews": 0,
                "parent_asin": parent_asin,
                "message": "No reviews found for processing"
            }
        
        # Process reviews to extract tri-grams with sentiment tracking
        trigram_sentiment_data = {}  # trigram -> {"positive": count, "negative": count, "neutral": count, "total": count}
        
        for review in reviews:
            review_text = review.get("text", "")
            rating = review.get("rating", 0)
            
            if not review_text or len(review_text.strip()) < 30:  # Require longer text for meaningful tri-grams
                continue
            
            # Determine sentiment based on rating
            if rating >= 4:
                sentiment = "positive"
            elif rating <= 2:
                sentiment = "negative"
            else:
                sentiment = "neutral"
            
            # Process text with NLTK to get tri-grams
            filtered_trigrams = process_text_for_trigrams(review_text)
            
            # Track each tri-gram with its sentiment
            for trigram in filtered_trigrams:
                if trigram not in trigram_sentiment_data:
                    trigram_sentiment_data[trigram] = {"positive": 0, "negative": 0, "neutral": 0, "total": 0}
                
                trigram_sentiment_data[trigram][sentiment] += 1
                trigram_sentiment_data[trigram]["total"] += 1
        
        if not trigram_sentiment_data:
            return {
                "words": [],
                "total_reviews": len(reviews),
                "total_trigrams_found": 0,
                "unique_trigrams": 0,
                "parent_asin": parent_asin,
                "message": "No qualitative tri-grams found in reviews"
            }
        
        # Sort tri-grams by total frequency and get top 30
        sorted_trigrams = sorted(trigram_sentiment_data.items(), key=lambda x: x[1]["total"], reverse=True)[:30]
        
        # Format for frontend with sentiment information
        trigram_data = []
        for trigram, sentiment_counts in sorted_trigrams:
            total = sentiment_counts["total"]
            positive = sentiment_counts["positive"]
            negative = sentiment_counts["negative"]
            neutral = sentiment_counts["neutral"]
            
            # Determine dominant sentiment
            if positive > negative and positive > neutral:
                dominant_sentiment = "positive"
                color = "green"
            elif negative > positive and negative > neutral:
                dominant_sentiment = "negative"
                color = "red"
            else:
                dominant_sentiment = "neutral"
                color = "gray"
            
            # Calculate percentages
            positive_percentage = round((positive / total) * 100, 1) if total > 0 else 0
            negative_percentage = round((negative / total) * 100, 1) if total > 0 else 0
            neutral_percentage = round((neutral / total) * 100, 1) if total > 0 else 0
            
            trigram_data.append({
                "text": trigram,
                "value": total,
                "sentiment": dominant_sentiment,
                "color": color,
                "sentiment_breakdown": {
                    "positive": positive,
                    "negative": negative,
                    "neutral": neutral,
                    "positive_percentage": positive_percentage,
                    "negative_percentage": negative_percentage,
                    "neutral_percentage": neutral_percentage
                }
            })
        
        # Create response message
        message = f"Processed {len(reviews)} reviews and found {len(trigram_data)} qualitative tri-grams using NLTK"
        if parent_asin:
            message += f" for product {parent_asin}"
        
        # Calculate total tri-grams processed
        total_trigrams_processed = sum(sentiment_counts["total"] for _, sentiment_counts in trigram_sentiment_data.items())
        
        return {
            "words": trigram_data,
            "total_reviews": len(reviews),
            "total_trigrams_found": total_trigrams_processed,
            "unique_trigrams": len(trigram_sentiment_data),
            "parent_asin": parent_asin,
            "message": message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing tri-gram word cloud data: {str(e)}"
        )

@router.get("/wordcloud-legacy")
async def get_wordcloud_legacy(
    parent_asin: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Legacy endpoint that returns raw review data for frontend processing.
    Maintained for compatibility with existing frontend code.
    """
    try:
        collection = get_collection("reviews_main")
        
        # Build query - filter by parent_asin if provided
        query = {"text": {"$exists": True, "$ne": None}}
        if parent_asin:
            query["$or"] = [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        
        # Get reviews with text field (limited for modal functionality)
        cursor = collection.find(
            query,
            {"text": 1, "rating": 1, "asin": 1, "parent_asin": 1, "_id": 0}
        ).limit(500)  # Keep reasonable limit for modal display
        
        reviews = await cursor.to_list(length=500)
        
        # Extract just the text for word cloud processing
        review_texts = [review.get("text", "") for review in reviews if review.get("text")]
        
        # Create response message
        if parent_asin:
            message = f"Found {len(reviews)} reviews for product {parent_asin}"
        else:
            message = f"Found {len(reviews)} reviews from all products"
        
        return {
            "reviews": reviews,
            "review_texts": review_texts,
            "count": len(reviews),
            "parent_asin": parent_asin,
            "message": message
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching reviews for word cloud: {str(e)}"
        )

@router.get("/sentiment-map")
async def get_sentiment_map_data(
    parent_asin: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Get sentiment data by city for the sentiment map visualization.
    Uses reviews_location collection with real location data.
    
    Sentiment Classification:
    - 1.0-2.9 stars: Negative
    - 3.0-3.9 stars: Neutral  
    - 4.0-5.0 stars: Positive
    """
    try:
        collection = get_collection("reviews_location")
        
        # Build query - filter by parent_asin if provided
        query = {
            "city": {"$exists": True, "$ne": None},  # Only reviews with city data
            "country": "UK",  # Only UK reviews for this map
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},  # Valid ratings
            "text": {"$exists": True, "$ne": None, "$ne": ""}  # Reviews with text
        }
        
        if parent_asin:
            query["$or"] = [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        
        # Aggregation pipeline to group by city and calculate sentiment
        pipeline = [
            {"$match": query},
            {
                "$addFields": {
                    # Convert rating to float for consistent processing
                    "rating_float": {
                        "$cond": {
                            "if": {"$eq": [{"$type": "$rating"}, "string"]},
                            "then": {"$toDouble": "$rating"},
                            "else": "$rating"
                        }
                    }
                }
            },
            {
                "$addFields": {
                    # Classify sentiment based on rating
                    "sentiment_category": {
                        "$cond": {
                            "if": {"$lt": ["$rating_float", 3.0]},
                            "then": "negative",
                            "else": {
                                "$cond": {
                                    "if": {"$lt": ["$rating_float", 4.0]},
                                    "then": "neutral",
                                    "else": "positive"
                                }
                            }
                        }
                    }
                }
            },
            {
                "$group": {
                    "_id": "$city",
                    "total_reviews": {"$sum": 1},
                    "avg_rating": {"$avg": "$rating_float"},
                    "positive_count": {
                        "$sum": {"$cond": [{"$eq": ["$sentiment_category", "positive"]}, 1, 0]}
                    },
                    "neutral_count": {
                        "$sum": {"$cond": [{"$eq": ["$sentiment_category", "neutral"]}, 1, 0]}
                    },
                    "negative_count": {
                        "$sum": {"$cond": [{"$eq": ["$sentiment_category", "negative"]}, 1, 0]}
                    },
                    # Sample reviews for display
                    "sample_reviews": {
                        "$push": {
                            "text": {
                                "$cond": {
                                    "if": {"$gt": [{"$strLenCP": "$text"}, 150]},
                                    "then": {"$concat": [{"$substrCP": ["$text", 0, 147]}, "..."]},
                                    "else": "$text"
                                }
                            },
                            "rating": "$rating_float",
                            "sentiment": "$sentiment_category"
                        }
                    }
                }
            },
            {
                "$addFields": {
                    # Calculate percentages
                    "positive_percentage": {
                        "$multiply": [{"$divide": ["$positive_count", "$total_reviews"]}, 100]
                    },
                    "neutral_percentage": {
                        "$multiply": [{"$divide": ["$neutral_count", "$total_reviews"]}, 100]
                    },
                    "negative_percentage": {
                        "$multiply": [{"$divide": ["$negative_count", "$total_reviews"]}, 100]
                    },
                    # Overall sentiment score (0-100 scale)
                    "sentiment_score": {
                        "$multiply": [{"$divide": ["$positive_count", "$total_reviews"]}, 100]
                    }
                }
            },
            {
                "$addFields": {
                    # Convert to -1 to 1 scale for map visualization
                    "sentiment": {
                        "$divide": [{"$subtract": ["$sentiment_score", 50]}, 50]
                    },
                    # Limit sample reviews to 10 per city
                    "sample_reviews": {"$slice": ["$sample_reviews", 10]}
                }
            }
        ]
        
        cursor = collection.aggregate(pipeline)
        city_data = await cursor.to_list(length=None)
        
        # Process results and add coordinates
        map_data = []
        for city in city_data:
            city_name = city["_id"]
            coordinates = UK_CITIES_COORDINATES.get(city_name, {"lat": 54.5, "lng": -4})
            
            processed_city = {
                "name": city_name,
                "lat": coordinates["lat"],
                "lng": coordinates["lng"],
                "country": "UK",
                "totalReviews": city["total_reviews"],
                "positiveReviews": city["positive_count"],
                "neutralReviews": city["neutral_count"],
                "negativeReviews": city["negative_count"],
                "positivePercentage": round(city["positive_percentage"], 1),
                "neutralPercentage": round(city["neutral_percentage"], 1),
                "negativePercentage": round(city["negative_percentage"], 1),
                "sentimentScore": round(city["sentiment_score"], 1),
                "sentiment": max(-1, min(1, city["sentiment"])),  # Ensure -1 to 1 range
                "score": round(city["sentiment_score"]),  # Integer for radius calculation
                "avgRating": round(city["avg_rating"], 2),
                "reviews": city.get("sample_reviews", [])[:10]  # Limit sample reviews
            }
            
            map_data.append(processed_city)
        
        # Sort by total reviews (descending) for consistent ordering
        map_data.sort(key=lambda x: x["totalReviews"], reverse=True)
        
        print(f"Generated sentiment map data for {len(map_data)} cities")
        if parent_asin:
            print(f"Filtered for product: {parent_asin}")
        
        return {
            "cities": map_data,
            "total_cities": len(map_data),
            "total_reviews": sum(city["totalReviews"] for city in map_data),
            "parent_asin": parent_asin,
            "message": f"Sentiment map data generated for {len(map_data)} UK cities"
        }
        
    except Exception as e:
        print(f"Error generating sentiment map data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating sentiment map data: {str(e)}"
        ) 