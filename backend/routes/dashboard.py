import asyncio
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from models import UserInDB
from auth import get_current_active_user
from config import get_collection
from redis_config import redis_config
from cache_utils import cache_manager

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# UK Cities for filtering
UK_CITIES = [
    'London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Sheffield',
    'Bristol', 'Glasgow', 'Edinburgh', 'Newcastle', 'Cardiff', 'Belfast',
    'Nottingham', 'Leicester', 'Coventry', 'Hull', 'Bradford', 'Southampton',
    'Plymouth', 'Reading'
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

async def get_summary_statistics_cached(
    parent_asin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None
) -> Dict[str, Any]:
    """Get cached summary statistics for dashboard"""
    cache_key = redis_config.generate_cache_key(
        "summary",
        parent_asin=parent_asin,
        start_date=start_date,
        end_date=end_date,
        cities=cities
    )
    
    return await cache_manager.cache_with_fallback(
        cache_key=cache_key,
        fetch_function=_fetch_summary_statistics,
        ttl=redis_config.component_ttl,
        parent_asin=parent_asin,
        start_date=start_date,
        end_date=end_date,
        cities=cities
    )

async def _fetch_summary_statistics(
    parent_asin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None
) -> Dict[str, Any]:
    """Fetch summary statistics from database"""
    try:
        collection = get_collection("reviews_location")
        
        # Build base query
        match_query = {
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
            "country": "UK",
            "$or": [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        }
        
        # Add date filtering
        if start_date and end_date:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
            start_timestamp = int(start_datetime.timestamp())
            end_timestamp = int(end_datetime.timestamp()) + 86400
            
            match_query["timestamp"] = {
                "$gte": start_timestamp,
                "$lte": end_timestamp
            }
        
        # Add cities filtering
        if cities:
            city_list = [city.strip() for city in cities.split(",") if city.strip()]
            if city_list:
                match_query["city"] = {"$in": city_list}
        
        # Aggregation pipeline for summary statistics
        pipeline = [
            {"$match": match_query},
            {
                "$addFields": {
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
                    "sentiment": {
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
                    "_id": "$sentiment",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        cursor = collection.aggregate(pipeline)
        sentiment_data = await cursor.to_list(length=None)
        
        # Process results
        total_reviews = 0
        positive_count = 0
        neutral_count = 0
        negative_count = 0
        
        for item in sentiment_data:
            count = item["count"]
            total_reviews += count
            
            if item["_id"] == "positive":
                positive_count = count
            elif item["_id"] == "neutral":
                neutral_count = count
            else:
                negative_count = count
        
        return {
            "total_reviews": total_reviews,
            "positive_reviews": positive_count,
            "neutral_reviews": neutral_count,
            "negative_reviews": negative_count,
            "positive_percentage": round((positive_count / total_reviews) * 100, 1) if total_reviews > 0 else 0,
            "neutral_percentage": round((neutral_count / total_reviews) * 100, 1) if total_reviews > 0 else 0,
            "negative_percentage": round((negative_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Error fetching summary statistics: {str(e)}")
        raise e

async def get_word_cloud_data_cached(
    parent_asin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None
) -> Dict[str, Any]:
    """Get cached word cloud data for dashboard"""
    cache_key = redis_config.generate_cache_key(
        "wordcloud",
        parent_asin=parent_asin,
        start_date=start_date,
        end_date=end_date,
        cities=cities
    )
    
    return await cache_manager.cache_with_fallback(
        cache_key=cache_key,
        fetch_function=_fetch_word_cloud_data,
        ttl=redis_config.component_ttl,
        parent_asin=parent_asin,
        start_date=start_date,
        end_date=end_date,
        cities=cities
    )

async def _fetch_word_cloud_data(
    parent_asin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None
) -> Dict[str, Any]:
    """Fetch word cloud data from database"""
    try:
        # Import here to avoid circular imports
        from routes.reviews import process_text_with_nltk
        
        collection = get_collection("reviews_location")
        
        # Build base query
        match_query = {
            "text": {"$exists": True, "$ne": None, "$ne": ""},
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
            "country": "UK",
            "$or": [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        }
        
        # Add date filtering
        if start_date and end_date:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
            start_timestamp = int(start_datetime.timestamp())
            end_timestamp = int(end_datetime.timestamp()) + 86400
            
            match_query["timestamp"] = {
                "$gte": start_timestamp,
                "$lte": end_timestamp
            }
        
        # Add cities filtering
        if cities:
            city_list = [city.strip() for city in cities.split(",") if city.strip()]
            if city_list:
                match_query["city"] = {"$in": city_list}
        
        # Fetch reviews
        cursor = collection.find(
            match_query,
            {"text": 1, "rating": 1, "_id": 0}
        ).limit(1000)  # Limit for performance
        
        reviews = await cursor.to_list(length=1000)
        
        # Process reviews for word cloud
        word_sentiment_data = {}
        
        for review in reviews:
            review_text = review.get("text", "")
            rating = review.get("rating", 0)
            
            if not review_text or len(review_text.strip()) < 10:
                continue
            
            # Determine sentiment
            if rating >= 4:
                sentiment = "positive"
            elif rating <= 2:
                sentiment = "negative"
            else:
                sentiment = "neutral"
            
            # Process text with NLTK
            filtered_words = process_text_with_nltk(review_text)
            
            # Track words with sentiment
            for word in filtered_words:
                if word not in word_sentiment_data:
                    word_sentiment_data[word] = {"positive": 0, "negative": 0, "neutral": 0, "total": 0}
                
                word_sentiment_data[word][sentiment] += 1
                word_sentiment_data[word]["total"] += 1
        
        # Sort and format top words
        sorted_words = sorted(word_sentiment_data.items(), key=lambda x: x[1]["total"], reverse=True)[:50]
        
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
            
            word_data.append({
                "text": word,
                "value": total,
                "sentiment": dominant_sentiment,
                "color": color,
                "sentiment_breakdown": {
                    "positive": positive,
                    "negative": negative,
                    "neutral": neutral,
                    "positive_percentage": round((positive / total) * 100, 1) if total > 0 else 0,
                    "negative_percentage": round((negative / total) * 100, 1) if total > 0 else 0,
                    "neutral_percentage": round((neutral / total) * 100, 1) if total > 0 else 0
                }
            })
        
        return {
            "words": word_data,
            "total_reviews": len(reviews),
            "total_words_found": sum(sentiment_counts["total"] for _, sentiment_counts in word_sentiment_data.items()),
            "unique_words": len(word_sentiment_data)
        }
        
    except Exception as e:
        logger.error(f"Error fetching word cloud data: {str(e)}")
        raise e

async def get_sentiment_timeline_cached(
    parent_asin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None
) -> Dict[str, Any]:
    """Get cached sentiment timeline data for dashboard"""
    cache_key = redis_config.generate_cache_key(
        "timeline",
        parent_asin=parent_asin,
        start_date=start_date,
        end_date=end_date,
        cities=cities
    )
    
    return await cache_manager.cache_with_fallback(
        cache_key=cache_key,
        fetch_function=_fetch_sentiment_timeline,
        ttl=redis_config.component_ttl,
        parent_asin=parent_asin,
        start_date=start_date,
        end_date=end_date,
        cities=cities
    )

async def _fetch_sentiment_timeline(
    parent_asin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None
) -> Dict[str, Any]:
    """Fetch sentiment timeline data from database"""
    try:
        collection = get_collection("reviews_location")
        
        # Build base query
        match_query = {
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
            "timestamp": {"$exists": True, "$ne": None},
            "country": "UK",
            "$or": [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        }
        
        # Add cities filtering
        if cities:
            city_list = [city.strip() for city in cities.split(",") if city.strip()]
            if city_list:
                match_query["city"] = {"$in": city_list}
        
        # Build aggregation pipeline
        pipeline = [
            {"$match": match_query},
            {
                "$addFields": {
                    "timestamp_numeric": {
                        "$cond": {
                            "if": {"$eq": [{"$type": "$timestamp"}, "string"]},
                            "then": {"$toLong": "$timestamp"},
                            "else": "$timestamp"
                        }
                    }
                }
            },
            {
                "$addFields": {
                    "timestamp_seconds": {
                        "$cond": {
                            "if": {"$gt": ["$timestamp_numeric", 1000000000000]},
                            "then": {"$divide": ["$timestamp_numeric", 1000]},
                            "else": "$timestamp_numeric"
                        }
                    }
                }
            }
        ]
        
        # Add date filtering if provided
        if start_date and end_date:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
            start_timestamp = int(start_datetime.timestamp())
            end_timestamp = int(end_datetime.timestamp()) + 86400
            
            pipeline.append({
                "$match": {
                    "timestamp_seconds": {
                        "$gte": start_timestamp,
                        "$lte": end_timestamp
                    }
                }
            })
        
        # Continue with timeline aggregation
        pipeline.extend([
            {
                "$project": {
                    "month_year": {
                        "$dateToString": {
                            "format": "%Y-%m",
                            "date": {"$toDate": {"$multiply": ["$timestamp_seconds", 1000]}}
                        }
                    },
                    "sentiment": {
                        "$cond": {
                            "if": {"$lt": ["$rating", 3.0]},
                            "then": "negative",
                            "else": {
                                "$cond": {
                                    "if": {"$lt": ["$rating", 4.0]},
                                    "then": "neutral",
                                    "else": "positive"
                                }
                            }
                        }
                    },
                    "rating": 1
                }
            },
            {
                "$group": {
                    "_id": {
                        "month_year": "$month_year",
                        "sentiment": "$sentiment"
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.month_year",
                    "sentiments": {
                        "$push": {
                            "sentiment": "$_id.sentiment",
                            "count": "$count"
                        }
                    },
                    "total_reviews": {"$sum": "$count"}
                }
            },
            {
                "$project": {
                    "month": "$_id",
                    "total_reviews": 1,
                    "positive": {
                        "$round": [
                            {
                                "$multiply": [
                                    {
                                        "$divide": [
                                            {
                                                "$sum": {
                                                    "$map": {
                                                        "input": "$sentiments",
                                                        "as": "s",
                                                        "in": {
                                                            "$cond": {
                                                                "if": {"$eq": ["$$s.sentiment", "positive"]},
                                                                "then": "$$s.count",
                                                                "else": 0
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            "$total_reviews"
                                        ]
                                    },
                                    100
                                ]
                            },
                            1
                        ]
                    },
                    "neutral": {
                        "$round": [
                            {
                                "$multiply": [
                                    {
                                        "$divide": [
                                            {
                                                "$sum": {
                                                    "$map": {
                                                        "input": "$sentiments",
                                                        "as": "s",
                                                        "in": {
                                                            "$cond": {
                                                                "if": {"$eq": ["$$s.sentiment", "neutral"]},
                                                                "then": "$$s.count",
                                                                "else": 0
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            "$total_reviews"
                                        ]
                                    },
                                    100
                                ]
                            },
                            1
                        ]
                    },
                    "negative": {
                        "$round": [
                            {
                                "$multiply": [
                                    {
                                        "$divide": [
                                            {
                                                "$sum": {
                                                    "$map": {
                                                        "input": "$sentiments",
                                                        "as": "s",
                                                        "in": {
                                                            "$cond": {
                                                                "if": {"$eq": ["$$s.sentiment", "negative"]},
                                                                "then": "$$s.count",
                                                                "else": 0
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            "$total_reviews"
                                        ]
                                    },
                                    100
                                ]
                            },
                            1
                        ]
                    }
                }
            },
            {"$sort": {"month": 1}}
        ])
        
        cursor = collection.aggregate(pipeline)
        timeline_data = await cursor.to_list(length=None)
        
        # Calculate summary statistics
        if timeline_data:
            total_reviews = sum(item["total_reviews"] for item in timeline_data)
            avg_positive = sum(item["positive"] * item["total_reviews"] for item in timeline_data) / total_reviews if total_reviews > 0 else 0
            avg_neutral = sum(item["neutral"] * item["total_reviews"] for item in timeline_data) / total_reviews if total_reviews > 0 else 0
            avg_negative = sum(item["negative"] * item["total_reviews"] for item in timeline_data) / total_reviews if total_reviews > 0 else 0
        else:
            total_reviews = 0
            avg_positive = 0
            avg_neutral = 0
            avg_negative = 0
        
        return {
            "summary": {
                "totalReviews": total_reviews,
                "avgPositive": round(avg_positive, 1),
                "avgNeutral": round(avg_neutral, 1),
                "avgNegative": round(avg_negative, 1)
            },
            "timeSeries": [
                {
                    "month": item["month"],
                    "positive": item["positive"],
                    "neutral": item["neutral"],
                    "negative": item["negative"]
                }
                for item in timeline_data
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching sentiment timeline: {str(e)}")
        raise e

async def get_sentiment_distribution_cached(
    parent_asin: str,
    period: str = "year",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get cached sentiment distribution data for dashboard"""
    cache_key = redis_config.generate_cache_key(
        "distribution",
        parent_asin=parent_asin,
        period=period,
        start_date=start_date,
        end_date=end_date,
        cities=cities
    )
    
    return await cache_manager.cache_with_fallback(
        cache_key=cache_key,
        fetch_function=_fetch_sentiment_distribution,
        ttl=redis_config.component_ttl,
        parent_asin=parent_asin,
        period=period,
        start_date=start_date,
        end_date=end_date,
        cities=cities
    )

async def _fetch_sentiment_distribution(
    parent_asin: str,
    period: str = "year",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Fetch sentiment distribution data from database"""
    try:
        collection = get_collection("reviews_location")
        
        # Build base query
        match_query = {
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
            "timestamp": {"$exists": True, "$ne": None},
            "country": "UK",
            "$or": [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        }
        
        # Add cities filtering
        if cities:
            city_list = [city.strip() for city in cities.split(",") if city.strip()]
            if city_list:
                match_query["city"] = {"$in": city_list}
        
        # Build aggregation pipeline based on period
        if period == "year":
            group_field = {
                "$year": {
                    "$cond": {
                        "if": {"$gt": ["$timestamp_numeric", 1000000000000]},
                        "then": {"$toDate": "$timestamp_numeric"},
                        "else": {"$toDate": {"$multiply": ["$timestamp_numeric", 1000]}}
                    }
                }
            }
            result_key = "year"
        elif period == "month":
            group_field = {
                "$month": {
                    "$cond": {
                        "if": {"$gt": ["$timestamp_numeric", 1000000000000]},
                        "then": {"$toDate": "$timestamp_numeric"},
                        "else": {"$toDate": {"$multiply": ["$timestamp_numeric", 1000]}}
                    }
                }
            }
            result_key = "month"
        else:  # day_of_week
            group_field = {
                "$dayOfWeek": {
                    "$cond": {
                        "if": {"$gt": ["$timestamp_numeric", 1000000000000]},
                        "then": {"$toDate": "$timestamp_numeric"},
                        "else": {"$toDate": {"$multiply": ["$timestamp_numeric", 1000]}}
                    }
                }
            }
            result_key = "day"
        
        pipeline = [
            {"$match": match_query},
            {
                "$addFields": {
                    "timestamp_numeric": {
                        "$cond": {
                            "if": {"$eq": [{"$type": "$timestamp"}, "string"]},
                            "then": {"$toLong": "$timestamp"},
                            "else": "$timestamp"
                        }
                    }
                }
            }
        ]
        
        # Add date filtering if provided
        if start_date and end_date:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
            start_timestamp = int(start_datetime.timestamp())
            end_timestamp = int(end_datetime.timestamp()) + 86400
            
            pipeline.append({
                "$addFields": {
                    "timestamp_seconds": {
                        "$cond": {
                            "if": {"$gt": ["$timestamp_numeric", 1000000000000]},
                            "then": {"$divide": ["$timestamp_numeric", 1000]},
                            "else": "$timestamp_numeric"
                        }
                    }
                }
            })
            
            pipeline.append({
                "$match": {
                    "timestamp_seconds": {
                        "$gte": start_timestamp,
                        "$lte": end_timestamp
                    }
                }
            })
        
        # Continue with distribution aggregation
        pipeline.extend([
            {
                "$project": {
                    "period_value": group_field,
                    "sentiment": {
                        "$cond": {
                            "if": {"$lt": ["$rating", 3.0]},
                            "then": "negative",
                            "else": {
                                "$cond": {
                                    "if": {"$lt": ["$rating", 4.0]},
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
                    "_id": {
                        "period": "$period_value",
                        "sentiment": "$sentiment"
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.period",
                    "sentiments": {
                        "$push": {
                            "sentiment": "$_id.sentiment",
                            "count": "$count"
                        }
                    },
                    "total_reviews": {"$sum": "$count"}
                }
            },
            {
                "$project": {
                    "period_value": "$_id",
                    "total_reviews": 1,
                    "positive": {
                        "$round": [
                            {
                                "$multiply": [
                                    {
                                        "$divide": [
                                            {
                                                "$sum": {
                                                    "$map": {
                                                        "input": "$sentiments",
                                                        "as": "s",
                                                        "in": {
                                                            "$cond": {
                                                                "if": {"$eq": ["$$s.sentiment", "positive"]},
                                                                "then": "$$s.count",
                                                                "else": 0
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            "$total_reviews"
                                        ]
                                    },
                                    100
                                ]
                            },
                            1
                        ]
                    },
                    "neutral": {
                        "$round": [
                            {
                                "$multiply": [
                                    {
                                        "$divide": [
                                            {
                                                "$sum": {
                                                    "$map": {
                                                        "input": "$sentiments",
                                                        "as": "s",
                                                        "in": {
                                                            "$cond": {
                                                                "if": {"$eq": ["$$s.sentiment", "neutral"]},
                                                                "then": "$$s.count",
                                                                "else": 0
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            "$total_reviews"
                                        ]
                                    },
                                    100
                                ]
                            },
                            1
                        ]
                    },
                    "negative": {
                        "$round": [
                            {
                                "$multiply": [
                                    {
                                        "$divide": [
                                            {
                                                "$sum": {
                                                    "$map": {
                                                        "input": "$sentiments",
                                                        "as": "s",
                                                        "in": {
                                                            "$cond": {
                                                                "if": {"$eq": ["$$s.sentiment", "negative"]},
                                                                "then": "$$s.count",
                                                                "else": 0
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            "$total_reviews"
                                        ]
                                    },
                                    100
                                ]
                            },
                            1
                        ]
                    }
                }
            },
            {"$sort": {result_key: 1}}
        ])
        
        # Set the correct field name in the final projection
        pipeline[-2]["$project"][result_key] = "$period_value"
        del pipeline[-2]["$project"]["period_value"]
        
        cursor = collection.aggregate(pipeline)
        distribution_data = await cursor.to_list(length=None)
        
        # Handle special cases for day_of_week and month
        if period == "day_of_week":
            day_names = {1: "Sunday", 2: "Monday", 3: "Tuesday", 4: "Wednesday", 
                        5: "Thursday", 6: "Friday", 7: "Saturday"}
            
            for item in distribution_data:
                item["day"] = day_names.get(item["day"], f"Day {item['day']}")
            
            day_order = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
            distribution_data.sort(key=lambda x: day_order.index(x["day"]) if x["day"] in day_order else 7)
        
        elif period == "month":
            month_names = {1: "January", 2: "February", 3: "March", 4: "April", 
                          5: "May", 6: "June", 7: "July", 8: "August",
                          9: "September", 10: "October", 11: "November", 12: "December"}
            
            for item in distribution_data:
                item["month"] = month_names.get(item["month"], f"Month {item['month']}")
            
            month_order = ["January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"]
            distribution_data.sort(key=lambda x: month_order.index(x["month"]) if x["month"] in month_order else 12)
        
        return distribution_data
        
    except Exception as e:
        logger.error(f"Error fetching sentiment distribution: {str(e)}")
        raise e

async def get_sentiment_map_cached(
    parent_asin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None
) -> Dict[str, Any]:
    """Get cached sentiment map data for dashboard"""
    cache_key = redis_config.generate_cache_key(
        "sentiment_map",
        parent_asin=parent_asin,
        start_date=start_date,
        end_date=end_date,
        cities=cities
    )
    
    return await cache_manager.cache_with_fallback(
        cache_key=cache_key,
        fetch_function=_fetch_sentiment_map,
        ttl=redis_config.component_ttl,
        parent_asin=parent_asin,
        start_date=start_date,
        end_date=end_date,
        cities=cities
    )

async def _fetch_sentiment_map(
    parent_asin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None
) -> Dict[str, Any]:
    """Fetch sentiment map data from database"""
    try:
        collection = get_collection("reviews_location")
        
        # Build base query
        query = {
            "city": {"$exists": True, "$ne": None},
            "country": "UK",
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
            "text": {"$exists": True, "$ne": None, "$ne": ""},
            "$or": [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        }
        
        # Add date filtering
        if start_date and end_date:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
            start_timestamp = int(start_datetime.timestamp())
            end_timestamp = int(end_datetime.timestamp()) + 86400
            
            query["timestamp"] = {
                "$gte": start_timestamp,
                "$lte": end_timestamp
            }
        
        # Add cities filtering
        if cities:
            city_list = [city.strip() for city in cities.split(",") if city.strip()]
            if city_list:
                query["city"] = {"$in": city_list}
        
        # Aggregation pipeline
        pipeline = [
            {"$match": query},
            {
                "$addFields": {
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
                    "positive_percentage": {
                        "$multiply": [{"$divide": ["$positive_count", "$total_reviews"]}, 100]
                    },
                    "neutral_percentage": {
                        "$multiply": [{"$divide": ["$neutral_count", "$total_reviews"]}, 100]
                    },
                    "negative_percentage": {
                        "$multiply": [{"$divide": ["$negative_count", "$total_reviews"]}, 100]
                    },
                    "sentiment_score": {
                        "$multiply": [{"$divide": ["$positive_count", "$total_reviews"]}, 100]
                    }
                }
            },
            {
                "$addFields": {
                    "sentiment": {
                        "$divide": [{"$subtract": ["$sentiment_score", 50]}, 50]
                    },
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
                "sentiment": max(-1, min(1, city["sentiment"])),
                "score": round(city["sentiment_score"]),
                "avgRating": round(city["avg_rating"], 2),
                "reviews": city.get("sample_reviews", [])[:10]
            }
            
            map_data.append(processed_city)
        
        # Sort by total reviews
        map_data.sort(key=lambda x: x["totalReviews"], reverse=True)
        
        return {
            "cities": map_data,
            "total_cities": len(map_data),
            "total_reviews": sum(city["totalReviews"] for city in map_data)
        }
        
    except Exception as e:
        logger.error(f"Error fetching sentiment map: {str(e)}")
        raise e

async def get_sentiment_pie_data_cached(
    parent_asin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None
) -> Dict[str, Any]:
    """Get cached sentiment pie chart data for dashboard"""
    cache_key = redis_config.generate_cache_key(
        "sentiment_pie",
        parent_asin=parent_asin,
        start_date=start_date,
        end_date=end_date,
        cities=cities
    )
    
    return await cache_manager.cache_with_fallback(
        cache_key=cache_key,
        fetch_function=_fetch_sentiment_pie_data,
        ttl=redis_config.component_ttl,
        parent_asin=parent_asin,
        start_date=start_date,
        end_date=end_date,
        cities=cities
    )

async def _fetch_sentiment_pie_data(
    parent_asin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None
) -> Dict[str, Any]:
    """Fetch sentiment pie chart data from database"""
    try:
        collection = get_collection("reviews_location")
        
        # Build base query
        match_query = {
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
            "country": "UK",
            "$or": [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        }
        
        # Add cities filtering
        if cities:
            city_list = [city.strip() for city in cities.split(",") if city.strip()]
            if city_list:
                match_query["city"] = {"$in": city_list}
        
        # Aggregation pipeline for sentiment pie data
        pipeline = [
            {"$match": match_query},
        ]
        
        # Add robust timestamp processing and date filtering if dates are provided
        if start_date and end_date:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
            start_timestamp = int(start_datetime.timestamp())
            end_timestamp = int(end_datetime.timestamp()) + 86400
            
            # Add timestamp processing stages (same pattern as ComparisonDashboard)
            pipeline.extend([
                {
                    "$addFields": {
                        "timestamp_numeric": {
                            "$cond": {
                                "if": {"$eq": [{"$type": "$timestamp"}, "string"]},
                                "then": {"$toLong": "$timestamp"},
                                "else": "$timestamp"
                            }
                        }
                    }
                },
                {
                    "$addFields": {
                        "timestamp_seconds": {
                            "$cond": {
                                "if": {"$gt": ["$timestamp_numeric", 1000000000000]},
                                "then": {"$divide": ["$timestamp_numeric", 1000]},
                                "else": "$timestamp_numeric"
                            }
                        }
                    }
                },
                {
                    "$match": {
                        "timestamp_seconds": {
                            "$gte": start_timestamp,
                            "$lte": end_timestamp
                        }
                    }
                }
            ])
        
        # Continue with sentiment processing
        pipeline.extend([
            {
                "$addFields": {
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
                    "sentiment": {
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
                    "_id": "$sentiment",
                    "count": {"$sum": 1},
                    "avg_rating": {"$avg": "$rating_float"}
                }
            }
        ])
        
        cursor = collection.aggregate(pipeline)
        sentiment_data = await cursor.to_list(length=None)
        
        # Process results
        total_reviews = sum(item["count"] for item in sentiment_data)
        positive_count = 0
        neutral_count = 0
        negative_count = 0
        avg_rating = 0
        
        for item in sentiment_data:
            count = item["count"]
            if item["_id"] == "positive":
                positive_count = count
            elif item["_id"] == "neutral":
                neutral_count = count
            else:
                negative_count = count
        
        # Calculate overall average rating
        if total_reviews > 0:
            total_rating_sum = sum(item["avg_rating"] * item["count"] for item in sentiment_data)
            avg_rating = total_rating_sum / total_reviews
        
        return {
            "summary_distribution": {
                "positive": round((positive_count / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                "neutral": round((neutral_count / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                "negative": round((negative_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
            },
            "sentiment_counts": {
                "positive": positive_count,
                "neutral": neutral_count,
                "negative": negative_count
            },
            "total_reviews": total_reviews,
            "average_rating": round(avg_rating, 1),
            "parent_asin": parent_asin
        }
        
    except Exception as e:
        logger.error(f"Error fetching sentiment pie data: {str(e)}")
        raise e

@router.get("/comprehensive")
async def get_comprehensive_dashboard(
    parent_asin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Get comprehensive dashboard data with Redis caching
    
    Parameters:
    - parent_asin (required): Product identifier
    - start_date (optional): Filter start date (YYYY-MM-DD)
    - end_date (optional): Filter end date (YYYY-MM-DD)
    - cities (optional): Comma-separated UK cities filter
    """
    try:
        logger.info(f"Fetching comprehensive dashboard for product: {parent_asin}")
        
        # Check cache first
        cache_key = redis_config.generate_cache_key(
            "dashboard",
            parent_asin=parent_asin,
            start_date=start_date,
            end_date=end_date,
            cities=cities
        )
        
        cached_data = await redis_config.get(cache_key)
        if cached_data:
            logger.info(f"Returning cached dashboard data for {parent_asin}")
            return cached_data
        
        # Fetch all data in parallel using asyncio.gather
        logger.info("Cache miss - fetching fresh data from database")
        
        tasks = [
            get_summary_statistics_cached(parent_asin, start_date, end_date, cities),
            get_word_cloud_data_cached(parent_asin, start_date, end_date, cities),
            get_sentiment_timeline_cached(parent_asin, start_date, end_date, cities),
            get_sentiment_distribution_cached(parent_asin, "year", start_date, end_date, cities),
            get_sentiment_distribution_cached(parent_asin, "month", start_date, end_date, cities),
            get_sentiment_map_cached(parent_asin, start_date, end_date, cities)
        ]
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results and handle partial failures
            summary_stats = results[0] if not isinstance(results[0], Exception) else None
            word_cloud_data = results[1] if not isinstance(results[1], Exception) else None
            timeline_data = results[2] if not isinstance(results[2], Exception) else None
            yearly_distribution = results[3] if not isinstance(results[3], Exception) else None
            monthly_distribution = results[4] if not isinstance(results[4], Exception) else None
            sentiment_map = results[5] if not isinstance(results[5], Exception) else None
            
            # Log any failures
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Task {i} failed: {str(result)}")
            
            # Build comprehensive response
            dashboard_data = {
                "product_info": {
                    "parent_asin": parent_asin,
                    "filters": {
                        "start_date": start_date,
                        "end_date": end_date,
                        "cities": cities.split(",") if cities else None
                    }
                },
                "summary_statistics": summary_stats,
                "word_cloud": word_cloud_data,
                "sentiment_timeline": timeline_data,
                "yearly_distribution": yearly_distribution,
                "monthly_distribution": monthly_distribution,
                "sentiment_map": sentiment_map,
                "metadata": {
                    "generated_at": datetime.utcnow().isoformat(),
                    "cache_key": cache_key,
                    "partial_failures": sum(1 for r in results if isinstance(r, Exception)),
                    "total_components": len(results)
                }
            }
            
            # Cache the result
            await redis_config.set(cache_key, dashboard_data, redis_config.default_ttl)
            logger.info(f"Cached dashboard data for {parent_asin}")
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Error in parallel data fetching: {str(e)}")
            # Return partial data if available
            return {
                "product_info": {
                    "parent_asin": parent_asin,
                    "filters": {
                        "start_date": start_date,
                        "end_date": end_date,
                        "cities": cities.split(",") if cities else None
                    }
                },
                "error": f"Partial failure in data fetching: {str(e)}",
                "metadata": {
                    "generated_at": datetime.utcnow().isoformat(),
                    "cache_key": cache_key,
                    "status": "partial_failure"
                }
            }
        
    except Exception as e:
        logger.error(f"Error in comprehensive dashboard endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching comprehensive dashboard data: {str(e)}"
        )

@router.get("/product-comprehensive")
async def get_product_comprehensive_dashboard(
    parent_asin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Get comprehensive product dashboard data - dedicated endpoint for ProductDashboard page
    
    This endpoint reuses existing data fetching patterns with unified filter support.
    ALL data fetching uses reviews_location collection for consistency.
    
    Parameters:
    - parent_asin (required): Product identifier
    - start_date (optional): Filter start date (YYYY-MM-DD) - restrictive: both dates required
    - end_date (optional): Filter end date (YYYY-MM-DD) - restrictive: both dates required
    - cities (optional): Comma-separated UK cities filter
    """
    try:
        logger.info(f"Fetching product comprehensive dashboard for product: {parent_asin}")
        
        # Check cache first
        cache_key = redis_config.generate_cache_key(
            "product_dashboard",
            parent_asin=parent_asin,
            start_date=start_date,
            end_date=end_date,
            cities=cities
        )
        
        cached_data = await redis_config.get(cache_key)
        if cached_data:
            logger.info(f"Returning cached product dashboard data for {parent_asin}")
            return cached_data
        
        # Fetch all data in parallel using asyncio.gather - reusing existing functions
        logger.info("Cache miss - fetching fresh product dashboard data from database")
        
        tasks = [
            get_summary_statistics_cached(parent_asin, start_date, end_date, cities),
            get_word_cloud_data_cached(parent_asin, start_date, end_date, cities),
            get_sentiment_timeline_cached(parent_asin, start_date, end_date, cities),
            get_sentiment_distribution_cached(parent_asin, "year", start_date, end_date, cities),
            get_sentiment_map_cached(parent_asin, start_date, end_date, cities),
            get_sentiment_pie_data_cached(parent_asin, start_date, end_date, cities)
        ]
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results and handle partial failures
            summary_stats = results[0] if not isinstance(results[0], Exception) else None
            word_cloud_data = results[1] if not isinstance(results[1], Exception) else None
            timeline_data = results[2] if not isinstance(results[2], Exception) else None
            yearly_distribution = results[3] if not isinstance(results[3], Exception) else None
            sentiment_map = results[4] if not isinstance(results[4], Exception) else None
            sentiment_pie = results[5] if not isinstance(results[5], Exception) else None
            
            # Log any failures
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Product dashboard task {i} failed: {str(result)}")
            
            # Build comprehensive response - structured for ProductDashboard components
            dashboard_data = {
                "product_info": {
                    "parent_asin": parent_asin,
                    "filters": {
                        "start_date": start_date,
                        "end_date": end_date,
                        "cities": cities.split(",") if cities else None
                    }
                },
                "summary_statistics": summary_stats,
                "word_cloud": word_cloud_data,
                "sentiment_timeline": timeline_data,
                "sentiment_distribution": yearly_distribution,
                "sentiment_map": sentiment_map,
                "sentiment_pie": sentiment_pie,
                "metadata": {
                    "generated_at": datetime.utcnow().isoformat(),
                    "cache_key": cache_key,
                    "partial_failures": sum(1 for r in results if isinstance(r, Exception)),
                    "total_components": len(results),
                    "endpoint": "product-comprehensive",
                    "collection_used": "reviews_location"
                }
            }
            
            # Cache the result
            await redis_config.set(cache_key, dashboard_data, redis_config.default_ttl)
            logger.info(f"Cached product dashboard data for {parent_asin}")
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Error in parallel product dashboard data fetching: {str(e)}")
            # Return partial data if available
            return {
                "product_info": {
                    "parent_asin": parent_asin,
                    "filters": {
                        "start_date": start_date,
                        "end_date": end_date,
                        "cities": cities.split(",") if cities else None
                    }
                },
                "error": f"Partial failure in product dashboard data fetching: {str(e)}",
                "metadata": {
                    "generated_at": datetime.utcnow().isoformat(),
                    "cache_key": cache_key,
                    "status": "partial_failure",
                    "endpoint": "product-comprehensive"
                }
            }
        
    except Exception as e:
        logger.error(f"Error in product comprehensive dashboard endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching product comprehensive dashboard data: {str(e)}"
        )

@router.get("/cache/invalidate/{parent_asin}")
async def invalidate_product_cache(
    parent_asin: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Invalidate all cache entries for a specific product"""
    try:
        result = await cache_manager.invalidate_product_cache(parent_asin)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error invalidating cache: {str(e)}"
        )

@router.get("/cache/stats")
async def get_cache_statistics(
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get cache performance statistics"""
    try:
        stats = await cache_manager.get_cache_performance_metrics()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting cache statistics: {str(e)}"
        )

@router.post("/cache/warm/{parent_asin}")
async def warm_product_cache(
    parent_asin: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Pre-warm cache for a product"""
    try:
        date_range = None
        if start_date and end_date:
            date_range = {"start_date": start_date, "end_date": end_date}
        
        result = await cache_manager.warm_cache_for_product(parent_asin, date_range)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error warming cache: {str(e)}"
        )
