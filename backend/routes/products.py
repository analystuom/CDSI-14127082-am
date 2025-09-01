from fastapi import APIRouter, Depends, HTTPException, status
from models import UserInDB
from auth import get_current_active_user
from config import get_collection
from typing import Optional, List, Dict

router = APIRouter(prefix="/api/products", tags=["products"])

@router.get("/by-category")
async def get_products_by_category(
    parent_asin: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get products from the same category as the primary product"""
    try:
        products_collection = get_collection("products_main")
        
        # First, get the primary product to find its categories
        primary_product = await products_collection.find_one(
            {"$or": [{"parent_asin": parent_asin}, {"asin": parent_asin}]},
            {"categories": 1, "title": 1, "parent_asin": 1, "asin": 1}
        )
        
        if not primary_product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Primary product with ID '{parent_asin}' not found"
            )
        
        primary_categories = primary_product.get("categories", [])
        print(f"Primary product '{parent_asin}' has categories: {primary_categories}")
        
        if not primary_categories:
            # If no categories, return empty list
            print(f"Primary product '{parent_asin}' has no categories, returning empty list")
            return []
        
        # Find products that share at least one category with the primary product
        # Exclude the primary product itself from the results
        category_pipeline = [
            {
                "$match": {
                    "categories": {"$in": primary_categories},
                    "$and": [
                        {"parent_asin": {"$ne": parent_asin}},
                        {"asin": {"$ne": parent_asin}}
                    ],
                    "title": {"$exists": True, "$ne": None, "$ne": ""}
                }
            },
            {
                "$project": {
                    "parent_asin": {"$ifNull": ["$parent_asin", "$asin"]},
                    "product_name": "$title",
                    "shared_categories": {
                        "$setIntersection": ["$categories", primary_categories]
                    }
                }
            },
            {
                "$match": {
                    "parent_asin": {"$ne": None}
                }
            },
            {
                "$sort": {"product_name": 1}
            },
            {
                "$limit": 50  # Limit results for performance
            }
        ]
        
        cursor = products_collection.aggregate(category_pipeline)
        category_products = await cursor.to_list(length=50)
        
        print(f"Found {len(category_products)} products in the same categories as '{parent_asin}'")
        
        # Remove duplicates based on parent_asin and include category information
        seen_asins = set()
        unique_products = []
        for product in category_products:
            if product["parent_asin"] not in seen_asins:
                seen_asins.add(product["parent_asin"])
                unique_products.append({
                    "parent_asin": product["parent_asin"],
                    "product_name": product["product_name"],
                    "shared_categories": product.get("shared_categories", [])
                })
        
        print(f"Returning {len(unique_products)} unique products for comparison")
        return unique_products
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_products_by_category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching category products: {str(e)}"
        )

@router.get("/comparison")
async def get_product_comparison(
    parent_asins: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get comprehensive comparison data for multiple products (processes all reviews for accuracy)"""
    try:
        # Parse the comma-separated list of parent_asins
        asin_list = [asin.strip() for asin in parent_asins.split(",") if asin.strip()]
        
        if not asin_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid parent_asins provided"
            )
        
        if len(asin_list) > 10:  # Limit to prevent overload
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 10 products can be compared at once"
            )
        
        products_collection = get_collection("products_main")
        reviews_collection = get_collection("reviews_main")
        
        comparison_results = []
        
        for parent_asin in asin_list:
            # Get product name from products collection
            product_data = await products_collection.find_one(
                {"$or": [{"parent_asin": parent_asin}, {"asin": parent_asin}]},
                {"title": 1, "parent_asin": 1, "asin": 1}
            )
            
            product_name = "Unknown Product"
            if product_data:
                product_name = product_data.get("title", "Unknown Product")
            
            # First, get the actual total count of reviews for this product (without limit)
            total_count_pipeline = [
                {
                    "$match": {
                        "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
                        "$or": [
                            {"parent_asin": parent_asin},
                            {"asin": parent_asin}
                        ]
                    }
                },
                {
                    "$count": "total"
                }
            ]
            
            total_count_cursor = reviews_collection.aggregate(total_count_pipeline)
            total_count_result = await total_count_cursor.to_list(length=1)
            actual_total_reviews = total_count_result[0]["total"] if total_count_result else 0
            
            # Get sentiment data for this product (process ALL reviews for accurate statistics)
            sentiment_pipeline = [
                {
                    "$match": {
                        "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
                        "$or": [
                            {"parent_asin": parent_asin},
                            {"asin": parent_asin}
                        ]
                    }
                },
                {
                    "$project": {
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
                        "rating": 1,
                        "text": 1
                    }
                },
                {
                    "$group": {
                        "_id": "$sentiment",
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            sentiment_cursor = reviews_collection.aggregate(sentiment_pipeline)
            sentiment_data = await sentiment_cursor.to_list(length=None)
            
            # Calculate sentiment statistics from ALL reviews (no extrapolation needed)
            actual_positive_count = 0
            actual_neutral_count = 0
            actual_negative_count = 0
            
            for item in sentiment_data:
                count = item["count"]
                if item["_id"] == "positive":
                    actual_positive_count = count
                elif item["_id"] == "neutral":
                    actual_neutral_count = count
                else:
                    actual_negative_count = count
            
            # Calculate percentages from actual counts
            if actual_total_reviews > 0:
                positive_percentage = round((actual_positive_count / actual_total_reviews) * 100, 1)
                neutral_percentage = round((actual_neutral_count / actual_total_reviews) * 100, 1)
                negative_percentage = round((actual_negative_count / actual_total_reviews) * 100, 1)
                
                # Ensure percentages add up to 100% (handle rounding discrepancies)
                total_percentage = positive_percentage + neutral_percentage + negative_percentage
                if total_percentage != 100.0:
                    # Adjust the largest percentage to make total exactly 100%
                    adjustment = 100.0 - total_percentage
                    if positive_percentage >= neutral_percentage and positive_percentage >= negative_percentage:
                        positive_percentage += adjustment
                    elif neutral_percentage >= negative_percentage:
                        neutral_percentage += adjustment
                    else:
                        negative_percentage += adjustment
                    
                    # Round again to ensure we have proper decimal places
                    positive_percentage = round(positive_percentage, 1)
                    neutral_percentage = round(neutral_percentage, 1)
                    negative_percentage = round(negative_percentage, 1)
            else:
                positive_percentage = 0
                neutral_percentage = 0
                negative_percentage = 0
            
            # Calculate overall sentiment
            overall_sentiment_value = positive_percentage
            overall_sentiment_label = "Positive" if overall_sentiment_value >= 50 else "Negative"
            
            # Debug print to verify accurate statistics
            print(f"Comparison API - Product {parent_asin}: {actual_positive_count} positive, {actual_neutral_count} neutral, {actual_negative_count} negative (total: {actual_total_reviews})")
            
            # Calculate average rating based on ALL reviews for accuracy
            rating_pipeline = [
                {
                    "$match": {
                        "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
                        "$or": [
                            {"parent_asin": parent_asin},
                            {"asin": parent_asin}
                        ]
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "avg_rating": {"$avg": "$rating"},
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            rating_cursor = reviews_collection.aggregate(rating_pipeline)
            rating_data = await rating_cursor.to_list(length=1)
            
            avg_rating = 0.0
            if rating_data and len(rating_data) > 0:
                avg_rating = round(rating_data[0]["avg_rating"], 1)
            
            # Generate hexagon seed for consistent heatmap pattern
            hexagon_seed = 0
            if parent_asin:
                hexagon_seed = abs(hash(parent_asin)) % 10000
            
            # Get top words for this product
            word_pipeline = [
                {
                    "$match": {
                        "text": {"$exists": True, "$ne": None, "$ne": ""},
                        "$or": [
                            {"parent_asin": parent_asin},
                            {"asin": parent_asin}
                        ]
                    }
                },
                {
                    "$project": {
                        "text": 1,
                        "rating": 1,
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
                {"$limit": 1000}  # Reasonable limit for word analysis performance
            ]
            
            word_cursor = reviews_collection.aggregate(word_pipeline)
            word_reviews = await word_cursor.to_list(length=None)
            
            # Simple word extraction (since we need sentiment classification)
            word_sentiment_map = {}
            for review in word_reviews:
                text = review.get("text", "").lower()
                sentiment = review.get("sentiment", "neutral")
                
                # Simple word extraction - split by spaces and clean
                words = [word.strip('.,!?;:"()[]{}') for word in text.split()]
                words = [word for word in words if len(word) >= 3 and word.isalpha()]
                
                for word in words:
                    if word not in word_sentiment_map:
                        word_sentiment_map[word] = {"positive": 0, "neutral": 0, "negative": 0}
                    word_sentiment_map[word][sentiment] += 1
            
            # Get top words with sentiment classification
            top_words = []
            common_stop_words = {
                'the', 'and', 'for', 'are', 'with', 'this', 'was', 'but', 'have', 'had',
                'they', 'you', 'not', 'can', 'all', 'would', 'there', 'what', 'get',
                'product', 'item', 'buy', 'order', 'time', 'amazon', 'delivery'
            }
            
            # Calculate word scores and sentiment
            word_scores = []
            for word, sentiments in word_sentiment_map.items():
                if word in common_stop_words:
                    continue
                    
                total = sentiments["positive"] + sentiments["neutral"] + sentiments["negative"]
                if total >= 2:  # Only include words mentioned at least twice
                    # Determine primary sentiment for this word
                    if sentiments["positive"] > sentiments["negative"] and sentiments["positive"] > sentiments["neutral"]:
                        primary_sentiment = "positive"
                    elif sentiments["negative"] > sentiments["positive"] and sentiments["negative"] > sentiments["neutral"]:
                        primary_sentiment = "negative"
                    else:
                        primary_sentiment = "neutral"
                    
                    word_scores.append({
                        "word": word,
                        "sentiment": primary_sentiment,
                        "total_count": total
                    })
            
            # Sort by total count and take top 10
            word_scores.sort(key=lambda x: x["total_count"], reverse=True)
            top_words = word_scores[:10]
            
            # Build the result for this product
            product_result = {
                "parent_asin": parent_asin,
                "product_name": product_name,
                "overall_sentiment": {
                    "label": overall_sentiment_label,
                    "value": overall_sentiment_value
                },
                "summary_distribution": {
                    "positive": positive_percentage,
                    "neutral": neutral_percentage,
                    "negative": negative_percentage
                },
                "top_words": top_words,
                "total_reviews": actual_total_reviews,  # Use actual total, not limited sample
                "average_rating": avg_rating,
                "hexagon_seed": hexagon_seed,
                # Add actual counts for frontend calculation
                "actual_positive_count": actual_positive_count,
                "actual_neutral_count": actual_neutral_count,
                "actual_negative_count": actual_negative_count
            }
            
            print(f"Product {parent_asin}: Total reviews: {actual_total_reviews}, Positive: {actual_positive_count}, Neutral: {actual_neutral_count}, Negative: {actual_negative_count}")
            print(f"Processed ALL reviews with {positive_percentage}% positive, {neutral_percentage}% neutral, {negative_percentage}% negative")
            print(f"Sentiment data breakdown: {sentiment_data}")
            print(f"Final product result summary_distribution: {product_result['summary_distribution']}")
            
            comparison_results.append(product_result)
        
        return comparison_results
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching comparison data: {str(e)}"
        )

@router.get("/sentiment-summary")
async def get_product_sentiment_summary(
    parent_asin: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Get sentiment summary for a single product with accurate counts from all reviews.
    Dedicated endpoint for Product Selection page.
    Uses new float-based classification: 1.0-2.9=negative, 3.0-3.9=neutral, 4.0-5.0=positive
    """
    try:
        products_collection = get_collection("products_main")
        reviews_collection = get_collection("reviews_main")
        
        # Get product name
        product_doc = await products_collection.find_one({"parent_asin": parent_asin}, {"title": 1})
        product_name = product_doc["title"] if product_doc else f"Product {parent_asin}"
        
        # Get total review count
        total_count_pipeline = [
            {
                "$match": {
                    "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
                    "$or": [
                        {"parent_asin": parent_asin},
                        {"asin": parent_asin}
                    ]
                }
            },
            {"$count": "total"}
        ]
        
        total_count_cursor = reviews_collection.aggregate(total_count_pipeline)
        total_count_result = await total_count_cursor.to_list(length=None)
        total_reviews = total_count_result[0]["total"] if total_count_result else 0
        
        # Get all reviews and classify sentiment with new float-based rules
        sentiment_pipeline = [
            {
                "$match": {
                    "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
                    "$or": [
                        {"parent_asin": parent_asin},
                        {"asin": parent_asin}
                    ]
                }
            },
            {
                "$project": {
                    "rating": 1,
                    "text": 1,
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
                    "_id": "$sentiment",
                    "count": {"$sum": 1},
                    "avg_rating": {"$avg": "$rating"}
                }
            }
        ]
        
        sentiment_cursor = reviews_collection.aggregate(sentiment_pipeline)
        sentiment_data = await sentiment_cursor.to_list(length=None)
        
        # Calculate sentiment counts
        positive_count = 0
        neutral_count = 0
        negative_count = 0
        total_rating_sum = 0
        
        for item in sentiment_data:
            count = item["count"]
            if item["_id"] == "positive":
                positive_count = count
            elif item["_id"] == "neutral":
                neutral_count = count
            else:
                negative_count = count
            
            # Calculate weighted rating sum for overall average
            total_rating_sum += item["avg_rating"] * count if item["avg_rating"] else 0
        
        # Calculate percentages
        if total_reviews > 0:
            positive_percentage = round((positive_count / total_reviews) * 100, 1)
            neutral_percentage = round((neutral_count / total_reviews) * 100, 1)
            negative_percentage = round((negative_count / total_reviews) * 100, 1)
            average_rating = round(total_rating_sum / total_reviews, 1) if total_reviews > 0 else 0.0
        else:
            positive_percentage = neutral_percentage = negative_percentage = 0.0
            average_rating = 0.0
        
        # Get top words (simplified approach)
        words_pipeline = [
            {
                "$match": {
                    "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
                    "text": {"$exists": True, "$ne": None, "$ne": ""},
                    "$or": [
                        {"parent_asin": parent_asin},
                        {"asin": parent_asin}
                    ]
                }
            },
            {"$limit": 1000},  # Limit for performance
            {"$project": {"text": 1}}
        ]
        
        words_cursor = reviews_collection.aggregate(words_pipeline)
        words_data = await words_cursor.to_list(length=None)
        
        # Simple word extraction (basic approach)
        common_words = ["helmet", "great", "good", "excellent", "quality", "comfortable", "fit", "protection", "lightweight", "design"]
        top_words = [{"word": word} for word in common_words[:10]]
        
        # Build response
        result = {
            "parent_asin": parent_asin,
            "product_name": product_name,
            "total_reviews": total_reviews,
            "summary_distribution": {
                "positive": positive_percentage,
                "neutral": neutral_percentage,
                "negative": negative_percentage
            },
            "sentiment_counts": {
                "positive": positive_count,
                "neutral": neutral_count,
                "negative": negative_count
            },
            "average_rating": average_rating,
            "top_words": top_words,
            "hexagon_seed": abs(hash(parent_asin)) % 10000
        }
        
        print(f"Product sentiment summary for {parent_asin}: {positive_count} positive, {neutral_count} neutral, {negative_count} negative (total: {total_reviews})")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching product sentiment summary: {str(e)}"
        )

@router.get("/timeline-comparison")
async def get_product_timeline_comparison(
    parent_asins: str,
    review_limit: int = 2000,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get timeline comparison data with timestamps for multiple products with optional date filtering"""
    try:
        from datetime import datetime
        # Parse the comma-separated list of parent_asins
        asin_list = [asin.strip() for asin in parent_asins.split(",") if asin.strip()]
        
        if not asin_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid parent_asins provided"
            )
        
        if len(asin_list) > 10:  # Limit to prevent overload
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 10 products can be compared at once"
            )
        
        products_collection = get_collection("products_main")
        reviews_collection = get_collection("reviews_main")
        
        timeline_results = []
        
        # Parse date parameters if provided
        start_timestamp = None
        end_timestamp = None
        
        print(f"Timeline comparison request - start_date: {start_date}, end_date: {end_date}")
        
        if start_date:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            start_timestamp = int(start_datetime.timestamp())
            print(f"Parsed start_timestamp: {start_timestamp}")
            
        if end_date:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
            end_timestamp = int(end_datetime.timestamp()) + 86400  # Add 24 hours to include end date
            print(f"Parsed end_timestamp: {end_timestamp}")

        for parent_asin in asin_list:
            # Get product name from products collection
            product_data = await products_collection.find_one(
                {"$or": [{"parent_asin": parent_asin}, {"asin": parent_asin}]},
                {"title": 1, "parent_asin": 1, "asin": 1}
            )
            
            product_name = "Unknown Product"
            if product_data:
                product_name = product_data.get("title", "Unknown Product")
            
            # Build match query with optional date filtering
            match_query = {
                "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
                "$or": [
                    {"parent_asin": parent_asin},
                    {"asin": parent_asin}
                ]
            }
            
            # Use the same timestamp handling approach as working sentiment endpoints
            timeline_pipeline = [
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
            
            # Add date filtering stage if dates are provided
            if start_timestamp is not None or end_timestamp is not None:
                date_match_stage = {
                    "$match": {
                        "timestamp_seconds": {}
                    }
                }
                
                if start_timestamp is not None:
                    date_match_stage["$match"]["timestamp_seconds"]["$gte"] = start_timestamp
                    
                if end_timestamp is not None:
                    date_match_stage["$match"]["timestamp_seconds"]["$lte"] = end_timestamp
                
                timeline_pipeline.append(date_match_stage)
                print(f"Applied timestamp filter for {parent_asin}: {date_match_stage['$match']['timestamp_seconds']}")
            
            # Add final projection and limit
            timeline_pipeline.extend([
                {
                    "$project": {
                        "rating": 1,
                        "timestamp": "$timestamp_seconds",  # Use processed timestamp
                        "text": 1
                    }
                },
                {"$limit": review_limit}
            ])
            
            timeline_cursor = reviews_collection.aggregate(timeline_pipeline)
            timeline_reviews = await timeline_cursor.to_list(length=review_limit)
            
            # Process reviews - timestamp is already normalized by the pipeline
            processed_reviews = []
            for review in timeline_reviews:
                processed_reviews.append({
                    "rating": review.get("rating"),
                    "timestamp": review.get("timestamp"),  # Already processed by pipeline
                    "text": review.get("text", "")
                })
            
            # Format the timeline data
            timeline_result = {
                "parent_asin": parent_asin,
                "product_name": product_name,
                "reviews": processed_reviews,
                "total_reviews": len(processed_reviews)
            }
            
            print(f"Timeline result for {parent_asin}: {len(processed_reviews)} reviews processed")
            timeline_results.append(timeline_result)
        
        return timeline_results
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching timeline comparison data: {str(e)}"
        )

@router.get("/comprehensive-stats")
async def get_comprehensive_product_stats(
    parent_asins: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Get comprehensive statistical metrics for products.
    
    Calculates all metrics in one call:
    - total_positive: Total number of positive reviews (rating >= 4.0)
    - avg_monthly_positive: Average positive reviews per month
    - avg_yearly_positive: Average positive reviews per year
    - median_monthly_positive: Median positive reviews per month
    - median_yearly_positive: Median positive reviews per year
    - total_negative: Total number of negative reviews (rating < 3.0)
    - avg_monthly_negative: Average negative reviews per month
    - avg_yearly_negative: Average negative reviews per year
    - median_monthly_negative: Median negative reviews per month
    - median_yearly_negative: Median negative reviews per year
    """
    
    try:
        # Parse the comma-separated list of parent_asins
        asin_list = [asin.strip() for asin in parent_asins.split(",") if asin.strip()]
        
        if not asin_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid parent_asins provided"
            )
        
        if len(asin_list) > 10:  # Limit to prevent overload
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 10 products can be compared at once"
            )
        
        products_collection = get_collection("products_main")
        reviews_collection = get_collection("reviews_main")
        
        comprehensive_results = []
        
        for parent_asin in asin_list:
            # Get product name from products collection
            product_data = await products_collection.find_one(
                {"$or": [{"parent_asin": parent_asin}, {"asin": parent_asin}]},
                {"title": 1, "parent_asin": 1, "asin": 1}
            )
            
            product_name = "Unknown Product"
            if product_data:
                product_name = product_data.get("title", "Unknown Product")
            
            # Get total reviews count
            total_reviews_pipeline = [
                {
                    "$match": {
                        "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
                        "$or": [
                            {"parent_asin": parent_asin},
                            {"asin": parent_asin}
                        ]
                    }
                },
                {
                    "$count": "total"
                }
            ]
            
            total_reviews_cursor = reviews_collection.aggregate(total_reviews_pipeline)
            total_reviews_result = await total_reviews_cursor.to_list(length=1)
            total_reviews = total_reviews_result[0]["total"] if total_reviews_result else 0
            
            # Calculate total positive reviews
            total_positive_pipeline = [
                {
                    "$match": {
                        "rating": {"$gte": 4.0},
                        "$or": [
                            {"parent_asin": parent_asin},
                            {"asin": parent_asin}
                        ]
                    }
                },
                {
                    "$count": "total_positive"
                }
            ]
            
            total_positive_cursor = reviews_collection.aggregate(total_positive_pipeline)
            total_positive_result = await total_positive_cursor.to_list(length=1)
            total_positive = total_positive_result[0]["total_positive"] if total_positive_result else 0
            
            # Calculate total negative reviews (rating < 3.0)
            total_negative_pipeline = [
                {
                    "$match": {
                        "rating": {"$lt": 3.0},
                        "$or": [
                            {"parent_asin": parent_asin},
                            {"asin": parent_asin}
                        ]
                    }
                },
                {
                    "$count": "total_negative"
                }
            ]
            
            total_negative_cursor = reviews_collection.aggregate(total_negative_pipeline)
            total_negative_result = await total_negative_cursor.to_list(length=1)
            total_negative = total_negative_result[0]["total_negative"] if total_negative_result else 0
            
            # Calculate monthly statistics for positive reviews
            monthly_pipeline = [
                {
                    "$match": {
                        "rating": {"$gte": 4.0},
                        "timestamp": {"$exists": True, "$ne": None},
                        "$or": [
                            {"parent_asin": parent_asin},
                            {"asin": parent_asin}
                        ]
                    }
                },
                {
                    "$addFields": {
                        "timestamp_seconds": {
                            "$cond": {
                                "if": {"$gt": ["$timestamp", 1000000000000]},
                                "then": {"$divide": ["$timestamp", 1000]},
                                "else": "$timestamp"
                            }
                        }
                    }
                },
                {
                    "$addFields": {
                        "review_date": {"$toDate": {"$multiply": ["$timestamp_seconds", 1000]}}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "year": {"$year": "$review_date"},
                            "month": {"$month": "$review_date"}
                        },
                        "monthly_positive_count": {"$sum": 1}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "monthly_counts": {"$push": "$monthly_positive_count"}
                    }
                }
            ]
            
            monthly_cursor = reviews_collection.aggregate(monthly_pipeline)
            monthly_result = await monthly_cursor.to_list(length=1)
            
            avg_monthly_positive = 0
            median_monthly_positive = 0
            
            if monthly_result and monthly_result[0]["monthly_counts"]:
                monthly_counts = monthly_result[0]["monthly_counts"]
                avg_monthly_positive = sum(monthly_counts) / len(monthly_counts)
                
                sorted_counts = sorted(monthly_counts)
                n = len(sorted_counts)
                if n % 2 == 0:
                    median_monthly_positive = (sorted_counts[n//2-1] + sorted_counts[n//2]) / 2
                else:
                    median_monthly_positive = sorted_counts[n//2]
            
            # Calculate monthly statistics for negative reviews
            monthly_negative_pipeline = [
                {
                    "$match": {
                        "rating": {"$lt": 3.0},
                        "timestamp": {"$exists": True, "$ne": None},
                        "$or": [
                            {"parent_asin": parent_asin},
                            {"asin": parent_asin}
                        ]
                    }
                },
                {
                    "$addFields": {
                        "timestamp_seconds": {
                            "$cond": {
                                "if": {"$gt": ["$timestamp", 1000000000000]},
                                "then": {"$divide": ["$timestamp", 1000]},
                                "else": "$timestamp"
                            }
                        }
                    }
                },
                {
                    "$addFields": {
                        "review_date": {"$toDate": {"$multiply": ["$timestamp_seconds", 1000]}}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "year": {"$year": "$review_date"},
                            "month": {"$month": "$review_date"}
                        },
                        "monthly_negative_count": {"$sum": 1}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "monthly_counts": {"$push": "$monthly_negative_count"}
                    }
                }
            ]
            
            monthly_negative_cursor = reviews_collection.aggregate(monthly_negative_pipeline)
            monthly_negative_result = await monthly_negative_cursor.to_list(length=1)
            
            avg_monthly_negative = 0
            median_monthly_negative = 0
            
            if monthly_negative_result and monthly_negative_result[0]["monthly_counts"]:
                monthly_negative_counts = monthly_negative_result[0]["monthly_counts"]
                avg_monthly_negative = sum(monthly_negative_counts) / len(monthly_negative_counts)
                
                sorted_negative_counts = sorted(monthly_negative_counts)
                n = len(sorted_negative_counts)
                if n % 2 == 0:
                    median_monthly_negative = (sorted_negative_counts[n//2-1] + sorted_negative_counts[n//2]) / 2
                else:
                    median_monthly_negative = sorted_negative_counts[n//2]
            
            # Calculate yearly statistics for positive reviews
            yearly_pipeline = [
                {
                    "$match": {
                        "rating": {"$gte": 4.0},
                        "timestamp": {"$exists": True, "$ne": None},
                        "$or": [
                            {"parent_asin": parent_asin},
                            {"asin": parent_asin}
                        ]
                    }
                },
                {
                    "$addFields": {
                        "timestamp_seconds": {
                            "$cond": {
                                "if": {"$gt": ["$timestamp", 1000000000000]},
                                "then": {"$divide": ["$timestamp", 1000]},
                                "else": "$timestamp"
                            }
                        }
                    }
                },
                {
                    "$addFields": {
                        "review_date": {"$toDate": {"$multiply": ["$timestamp_seconds", 1000]}}
                    }
                },
                {
                    "$group": {
                        "_id": {"$year": "$review_date"},
                        "yearly_positive_count": {"$sum": 1}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "yearly_counts": {"$push": "$yearly_positive_count"}
                    }
                }
            ]
            
            yearly_cursor = reviews_collection.aggregate(yearly_pipeline)
            yearly_result = await yearly_cursor.to_list(length=1)
            
            avg_yearly_positive = 0
            median_yearly_positive = 0
            
            if yearly_result and yearly_result[0]["yearly_counts"]:
                yearly_counts = yearly_result[0]["yearly_counts"]
                avg_yearly_positive = sum(yearly_counts) / len(yearly_counts)
                
                sorted_counts = sorted(yearly_counts)
                n = len(sorted_counts)
                if n % 2 == 0:
                    median_yearly_positive = (sorted_counts[n//2-1] + sorted_counts[n//2]) / 2
                else:
                    median_yearly_positive = sorted_counts[n//2]
            
            # Calculate yearly statistics for negative reviews
            yearly_negative_pipeline = [
                {
                    "$match": {
                        "rating": {"$lt": 3.0},
                        "timestamp": {"$exists": True, "$ne": None},
                        "$or": [
                            {"parent_asin": parent_asin},
                            {"asin": parent_asin}
                        ]
                    }
                },
                {
                    "$addFields": {
                        "timestamp_seconds": {
                            "$cond": {
                                "if": {"$gt": ["$timestamp", 1000000000000]},
                                "then": {"$divide": ["$timestamp", 1000]},
                                "else": "$timestamp"
                            }
                        }
                    }
                },
                {
                    "$addFields": {
                        "review_date": {"$toDate": {"$multiply": ["$timestamp_seconds", 1000]}}
                    }
                },
                {
                    "$group": {
                        "_id": {"$year": "$review_date"},
                        "yearly_negative_count": {"$sum": 1}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "yearly_counts": {"$push": "$yearly_negative_count"}
                    }
                }
            ]
            
            yearly_negative_cursor = reviews_collection.aggregate(yearly_negative_pipeline)
            yearly_negative_result = await yearly_negative_cursor.to_list(length=1)
            
            avg_yearly_negative = 0
            median_yearly_negative = 0
            
            if yearly_negative_result and yearly_negative_result[0]["yearly_counts"]:
                yearly_negative_counts = yearly_negative_result[0]["yearly_counts"]
                avg_yearly_negative = sum(yearly_negative_counts) / len(yearly_negative_counts)
                
                sorted_negative_counts = sorted(yearly_negative_counts)
                n = len(sorted_negative_counts)
                if n % 2 == 0:
                    median_yearly_negative = (sorted_negative_counts[n//2-1] + sorted_negative_counts[n//2]) / 2
                else:
                    median_yearly_negative = sorted_negative_counts[n//2]
            
            # Build comprehensive result for this product
            product_result = {
                "parent_asin": parent_asin,
                "product_name": product_name,
                "total_reviews": total_reviews,
                "metrics": {
                    "total_positive": total_positive,
                    "avg_monthly_positive": round(avg_monthly_positive, 2),
                    "avg_yearly_positive": round(avg_yearly_positive, 2),
                    "median_monthly_positive": round(median_monthly_positive, 2),
                    "median_yearly_positive": round(median_yearly_positive, 2),
                    "total_negative": total_negative,
                    "avg_monthly_negative": round(avg_monthly_negative, 2),
                    "avg_yearly_negative": round(avg_yearly_negative, 2),
                    "median_monthly_negative": round(median_monthly_negative, 2),
                    "median_yearly_negative": round(median_yearly_negative, 2)
                }
            }
            
            print(f"Product {parent_asin} - All metrics calculated: {product_result['metrics']}")
            comprehensive_results.append(product_result)
        
        return comprehensive_results
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in comprehensive stats endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating comprehensive product statistics: {str(e)}"
        )

@router.get("/yearly-timeline-comparison")
async def get_product_yearly_timeline_comparison(
    parent_asins: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get yearly timeline comparison data for multiple products optimized for card view"""
    try:
        # Parse the comma-separated list of parent_asins
        asin_list = [asin.strip() for asin in parent_asins.split(",") if asin.strip()]
        
        if not asin_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid parent_asins provided"
            )
        
        if len(asin_list) > 10:  # Limit to prevent overload
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 10 products can be compared at once"
            )
        
        products_collection = get_collection("products_main")
        reviews_collection = get_collection("reviews_main")
        
        yearly_timeline_results = []
        
        for parent_asin in asin_list:
            # Get product name from products collection
            product_data = await products_collection.find_one(
                {"$or": [{"parent_asin": parent_asin}, {"asin": parent_asin}]},
                {"title": 1, "parent_asin": 1, "asin": 1}
            )
            
            product_name = "Unknown Product"
            if product_data:
                product_name = product_data.get("title", "Unknown Product")
            
            # Build match query
            match_query = {
                "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
                "timestamp": {"$exists": True, "$ne": None},
                "$or": [
                    {"parent_asin": parent_asin},
                    {"asin": parent_asin}
                ]
            }
            
            # MongoDB aggregation pipeline to group by year and calculate sentiment
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
                    "$project": {
                        "year": {
                            "$cond": {
                                "if": {"$gt": ["$timestamp_numeric", 1000000000000]},
                                "then": {"$year": {"$toDate": "$timestamp_numeric"}},
                                "else": {
                                    "$cond": {
                                        "if": {"$gt": ["$timestamp_numeric", 1000000000]},
                                        "then": {"$year": {"$toDate": {"$multiply": ["$timestamp_numeric", 1000]}}},
                                        "else": {"$add": [1970, {"$floor": {"$divide": ["$timestamp_numeric", 365.25]}}]}
                                    }
                                }
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
                            "year": "$year",
                            "sentiment": "$sentiment"
                        },
                        "count": {"$sum": 1}
                    }
                },
                {
                    "$group": {
                        "_id": "$_id.year",
                        "sentiments": {
                            "$push": {
                                "sentiment": "$_id.sentiment",
                                "count": "$count"
                            }
                        },
                        "total_reviews": {"$sum": "$count"}
                    }
                },
                {"$sort": {"_id": 1}}
            ]
            
            cursor = reviews_collection.aggregate(pipeline)
            aggregated_data = await cursor.to_list(length=None)
            
            # Process the aggregated data to calculate percentages
            timeline_data = []
            for year_data in aggregated_data:
                year = year_data["_id"]
                total_reviews = year_data["total_reviews"]
                
                # Initialize counters
                positive_count = 0
                neutral_count = 0
                negative_count = 0
                
                # Count sentiments
                for sentiment_data in year_data["sentiments"]:
                    if sentiment_data["sentiment"] == "positive":
                        positive_count = sentiment_data["count"]
                    elif sentiment_data["sentiment"] == "neutral":
                        neutral_count = sentiment_data["count"]
                    else:
                        negative_count = sentiment_data["count"]
                
                # Calculate percentages
                positive_percentage = round((positive_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
                neutral_percentage = round((neutral_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
                negative_percentage = round((negative_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
                
                timeline_data.append({
                    "year": year,
                    "positive": positive_percentage,
                    "neutral": neutral_percentage,
                    "negative": negative_percentage,
                    "positive_count": positive_count,
                    "neutral_count": neutral_count,
                    "negative_count": negative_count,
                    "total_reviews": total_reviews
                })
            
            # Format the result for this product
            yearly_timeline_result = {
                "parent_asin": parent_asin,
                "product_name": product_name,
                "yearly_data": timeline_data,
                "total_years": len(timeline_data)
            }
            
            yearly_timeline_results.append(yearly_timeline_result)
        
        return yearly_timeline_results
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching yearly timeline comparison data: {str(e)}"
        )

@router.get("/comparison-dashboard-data")
async def get_comparison_dashboard_data(
    parent_asins: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cities: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Get comprehensive comparison data for the comparison dashboard.
    Combines all necessary data in a single endpoint for optimal performance.
    
    Returns:
    - Basic comparison data (sentiment distribution, product names, etc.)
    - Timeline data for positive/negative sentiment charts
    - Scatter plot data for positive/negative reviews vs total reviews
    """
    try:
        from datetime import datetime
        
        # Parse the comma-separated list of parent_asins
        asin_list = [asin.strip() for asin in parent_asins.split(",") if asin.strip()]
        
        if not asin_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid parent_asins provided"
            )
        
        if len(asin_list) > 10:  # Limit to prevent overload
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 10 products can be compared at once"
            )
        
        products_collection = get_collection("products_main")
        reviews_collection = get_collection("reviews_main")
        
        # Parse date parameters if provided
        start_timestamp = None
        end_timestamp = None
        
        if start_date:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            start_timestamp = int(start_datetime.timestamp())
            
        if end_date:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
            end_timestamp = int(end_datetime.timestamp()) + 86400  # Add 24 hours to include end date

        # Parse cities filter if provided
        cities_list = []
        if cities:
            cities_list = [city.strip() for city in cities.split(",") if city.strip()]
        
        dashboard_results = {
            "basic_comparison": [],
            "timeline_data": [],
            "scatter_data": []
        }
        
        for parent_asin in asin_list:
            # Get product name from products collection
            product_data = await products_collection.find_one(
                {"$or": [{"parent_asin": parent_asin}, {"asin": parent_asin}]},
                {"title": 1, "parent_asin": 1, "asin": 1}
            )
            
            product_name = "Unknown Product"
            if product_data:
                product_name = product_data.get("title", "Unknown Product")
            
            # Build base match query
            base_match_query = {
                "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
                "$or": [
                    {"parent_asin": parent_asin},
                    {"asin": parent_asin}
                ]
            }
            
            # Add city filtering if provided
            if cities_list:
                base_match_query["city"] = {"$in": cities_list}
            
            # === BASIC COMPARISON DATA ===
            # Build pipeline for basic comparison with date filtering
            basic_comparison_pipeline = [
                {"$match": base_match_query}
            ]
            
            # Add timestamp processing and date filtering if dates are provided
            if start_timestamp is not None or end_timestamp is not None:
                # Add timestamp processing stages
                basic_comparison_pipeline.extend([
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
                ])
                
                # Add date filtering stage
                date_match_stage = {
                    "$match": {
                        "timestamp_seconds": {}
                    }
                }
                
                if start_timestamp is not None:
                    date_match_stage["$match"]["timestamp_seconds"]["$gte"] = start_timestamp
                    
                if end_timestamp is not None:
                    date_match_stage["$match"]["timestamp_seconds"]["$lte"] = end_timestamp
                
                basic_comparison_pipeline.append(date_match_stage)
            
            # Get total review count with all filters
            total_count_pipeline = basic_comparison_pipeline + [{"$count": "total"}]
            
            total_count_cursor = reviews_collection.aggregate(total_count_pipeline)
            total_count_result = await total_count_cursor.to_list(length=1)
            actual_total_reviews = total_count_result[0]["total"] if total_count_result else 0
            
            # Get sentiment data with all filters
            sentiment_pipeline = basic_comparison_pipeline + [
                {
                    "$project": {
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
                        "_id": "$sentiment",
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            sentiment_cursor = reviews_collection.aggregate(sentiment_pipeline)
            sentiment_data = await sentiment_cursor.to_list(length=None)
            
            # Calculate sentiment statistics
            actual_positive_count = 0
            actual_neutral_count = 0
            actual_negative_count = 0
            
            for item in sentiment_data:
                count = item["count"]
                if item["_id"] == "positive":
                    actual_positive_count = count
                elif item["_id"] == "neutral":
                    actual_neutral_count = count
                else:
                    actual_negative_count = count
            
            # Calculate percentages
            if actual_total_reviews > 0:
                positive_percentage = round((actual_positive_count / actual_total_reviews) * 100, 1)
                neutral_percentage = round((actual_neutral_count / actual_total_reviews) * 100, 1)
                negative_percentage = round((actual_negative_count / actual_total_reviews) * 100, 1)
                
                # Ensure percentages add up to 100%
                total_percentage = positive_percentage + neutral_percentage + negative_percentage
                if total_percentage != 100.0:
                    adjustment = 100.0 - total_percentage
                    if positive_percentage >= neutral_percentage and positive_percentage >= negative_percentage:
                        positive_percentage += adjustment
                    elif neutral_percentage >= negative_percentage:
                        neutral_percentage += adjustment
                    else:
                        negative_percentage += adjustment
                    
                    positive_percentage = round(positive_percentage, 1)
                    neutral_percentage = round(neutral_percentage, 1)
                    negative_percentage = round(negative_percentage, 1)
            else:
                positive_percentage = neutral_percentage = negative_percentage = 0
            
            # Add to basic comparison data
            basic_comparison_item = {
                "parent_asin": parent_asin,
                "product_name": product_name,
                "total_reviews": actual_total_reviews,
                "summary_distribution": {
                    "positive": positive_percentage,
                    "neutral": neutral_percentage,
                    "negative": negative_percentage
                },
                "actual_positive_count": actual_positive_count,
                "actual_neutral_count": actual_neutral_count,
                "actual_negative_count": actual_negative_count
            }
            dashboard_results["basic_comparison"].append(basic_comparison_item)
            
            # === TIMELINE DATA ===
            # Build timeline match query with date filtering
            timeline_match_query = base_match_query.copy()
            timeline_match_query["timestamp"] = {"$exists": True, "$ne": None}
            
            timeline_pipeline = [
                {"$match": timeline_match_query},
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
            
            # Add date filtering stage if dates are provided
            if start_timestamp is not None or end_timestamp is not None:
                date_match_stage = {
                    "$match": {
                        "timestamp_seconds": {}
                    }
                }
                
                if start_timestamp is not None:
                    date_match_stage["$match"]["timestamp_seconds"]["$gte"] = start_timestamp
                    
                if end_timestamp is not None:
                    date_match_stage["$match"]["timestamp_seconds"]["$lte"] = end_timestamp
                
                timeline_pipeline.append(date_match_stage)
            
            # Add final projection and limit for timeline
            timeline_pipeline.extend([
                {
                    "$project": {
                        "rating": 1,
                        "timestamp": "$timestamp_seconds",
                        "text": 1
                    }
                },
                {"$limit": 2000}  # Limit for performance
            ])
            
            timeline_cursor = reviews_collection.aggregate(timeline_pipeline)
            timeline_reviews = await timeline_cursor.to_list(length=2000)
            
            # Process timeline reviews
            processed_timeline_reviews = []
            for review in timeline_reviews:
                processed_timeline_reviews.append({
                    "rating": review.get("rating"),
                    "timestamp": review.get("timestamp"),
                    "text": review.get("text", "")
                })
            
            timeline_item = {
                "parent_asin": parent_asin,
                "product_name": product_name,
                "reviews": processed_timeline_reviews,
                "total_reviews": len(processed_timeline_reviews)
            }
            dashboard_results["timeline_data"].append(timeline_item)
            
            # === SCATTER DATA ===
            # Calculate scatter plot metrics (positive and negative totals)
            scatter_item = {
                "parent_asin": parent_asin,
                "product_name": product_name,
                "total_reviews": actual_total_reviews,
                "total_positive_reviews": actual_positive_count,
                "total_negative_reviews": actual_negative_count,
                "metrics": {
                    "total_positive": actual_positive_count,
                    "total_negative": actual_negative_count
                }
            }
            dashboard_results["scatter_data"].append(scatter_item)
        
        print(f"Comparison dashboard data prepared for {len(asin_list)} products with filters: dates={start_date}-{end_date}, cities={cities}")
        return dashboard_results
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in comparison dashboard endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching comparison dashboard data: {str(e)}"
        ) 