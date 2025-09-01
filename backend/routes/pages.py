from fastapi import APIRouter, Depends, HTTPException, status
from models import UserInDB
from auth import get_current_active_user, get_admin_user
from config import get_collection
from typing import Dict, Any, List, Optional

router = APIRouter(prefix="/pages", tags=["pages"])

@router.get("/guest")
async def guest_page():
    """Landing page for the application"""
    return {
        "message": "Welcome to the Sentiment Visualisation Application!",
        "description": "We visualise the sentiment of customers' reviews and feedback.",
        "features": [
            "Getting different insights from the textual reviews",
            "Access to different visualisations of the customer sentiment"
        ]
    }



@router.get("/profile")
async def profile_page(current_user: UserInDB = Depends(get_current_active_user)):
    """Another protected page for authenticated users"""
    return {
        "message": "User Profile Page",
        "description": "Detailed user profile information",
        "profile": {
            "username": current_user.username,
            "email": current_user.email,
            "role": current_user.role,
            "account_status": "Active" if current_user.is_active else "Inactive",
            "created_at": current_user.created_at.isoformat()
        },
        "permissions": {
            "can_edit_profile": True,
            "can_view_dashboard": True,
            "can_access_admin": current_user.role == "admin"
        }
    }

@router.get("/admin")
async def admin_page(admin_user: UserInDB = Depends(get_admin_user)):
    """Protected page for admin users only"""
    return {
        "message": f"Welcome to the Admin Panel!",
        "description": "This page is only accessible to administrators.",
        "admin_info": {
            "username": admin_user.username,
            "email": admin_user.email,
            "role": admin_user.role,
            "admin_since": admin_user.created_at.strftime("%Y-%m-%d")
        }
    }

@router.get("/wordcloud-reviews")
async def get_wordcloud_reviews(
    parent_asin: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get reviews for word cloud generation, optionally filtered by parent_asin"""
    try:
        collection = get_collection("reviews_main")
        
        # Build query - filter by parent_asin if provided
        query = {"text": {"$exists": True, "$ne": None}}  # Only reviews with text
        if parent_asin:
            query["$or"] = [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}  # Fallback to asin if parent_asin not available
            ]
        
        # Get reviews with text field
        cursor = collection.find(
            query,
            {"text": 1, "rating": 1, "asin": 1, "parent_asin": 1, "_id": 0}  # Only return needed fields
        ).limit(100)
        
        reviews = await cursor.to_list(length=100)
        
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

@router.get("/product-categories")
async def get_product_categories(current_user: UserInDB = Depends(get_current_active_user)):
    """Get unique product categories from products collection"""
    try:
        collection = get_collection("products_main")
        
        # Get unique categories from the categories array field using aggregation
        pipeline = [
            {"$unwind": "$categories"},  # Flatten the categories array
            {"$group": {"_id": "$categories", "count": {"$sum": 1}}},
            {"$match": {"_id": {"$ne": None}}},
            {"$sort": {"_id": 1}}
        ]
        
        cursor = collection.aggregate(pipeline)
        categories_data = await cursor.to_list(length=None)
        
        # Extract category names and filter for those starting with uppercase letters
        # Also filter out discount categories starting with "Up to ...%"
        # Filter out categories containing promotional words
        promotional_words = ["Save", "Savings", "Saving", "End", "Get", "Buy", "Buys", "sale", "Sale", "off", "Off", "Deal", "Amazon", "BTS", "Gift", "Under"]
        categories = [
            cat["_id"] for cat in categories_data 
            if cat["_id"] and len(cat["_id"]) > 0 and cat["_id"][0].isupper() and cat["_id"][0].isalpha()
            and not cat["_id"].startswith("Up to ")
            and not any(word in cat["_id"] for word in promotional_words)
        ]
        
        return {
            "categories": categories,
            "count": len(categories),
            "message": f"Found {len(categories)} product categories"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching product categories: {str(e)}"
        )

@router.get("/products")
async def get_products(
    category: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get products filtered by category from products collection"""
    try:
        collection = get_collection("products_main")
        
        # Build query - filter by categories array
        query = {}
        if category:
            query["categories"] = category  # This will match if category is in the categories array
        
        # Get products with title and asin for better UX
        cursor = collection.find(
            query,
            {"asin": 1, "parent_asin": 1, "title": 1, "categories": 1, "_id": 0}
        ).limit(100)  # Limit to avoid performance issues
        
        products = await cursor.to_list(length=100)
        
        # Format products for frontend
        formatted_products = []
        for product in products:
            formatted_products.append({
                "asin": product.get("asin", ""),
                "parent_asin": product.get("parent_asin", product.get("asin", "")),  # Use parent_asin if available, fallback to asin
                "title": product.get("title", "Unknown Product"),
                "category": category,  # Return the selected category
                "categories": product.get("categories", [])  # Include all categories for reference
            })
        
        return {
            "products": formatted_products,
            "count": len(formatted_products),
            "category": category,
            "message": f"Found {len(formatted_products)} products" + (f" in category '{category}'" if category else "")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching products: {str(e)}"
        )

@router.get("/product-info")
async def get_product_info(
    asin: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get detailed product information by asin from products collection"""
    try:
        # First try to get from products collection
        products_collection = get_collection("products_main")
        product_data = await products_collection.find_one({"asin": asin})
        
        if not product_data:
            # Fallback to reviews_main collection
            reviews_collection = get_collection("reviews_main")
            product_data = await reviews_collection.find_one({"asin": asin})
        
        if not product_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with asin '{asin}' not found"
            )
        
        # Convert ObjectId to string for JSON serialization
        if "_id" in product_data:
            product_data["_id"] = str(product_data["_id"])
        
        # Extract the requested fields with fallback messages for null/missing values
        def get_field_or_default(data, field_name, default_message="This information is not available"):
            value = data.get(field_name)
            return value if value is not None else default_message
        
        detailed_info = {
            "parent_asin": parent_asin,
            "title": product_data.get("title", "Unknown Product"),
            "average_rating": get_field_or_default(product_data, "average_rating"),
            "rating_numbers": get_field_or_default(product_data, "rating_numbers"),
            "features": get_field_or_default(product_data, "features"),
            "description": get_field_or_default(product_data, "description"),
            "price": get_field_or_default(product_data, "price"),
            "images": get_field_or_default(product_data, "images"),
            "details": get_field_or_default(product_data, "details"),
            "categories": product_data.get("categories", [])
        }
        
        # Get review count for this product
        reviews_collection = get_collection("reviews_main")
        review_count = await reviews_collection.count_documents({"asin": asin})
        
        return {
            "product": detailed_info,
            "review_count": review_count,
            "asin": asin
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching product information: {str(e)}"
        )

@router.get("/product-details")
async def get_product_details(
    parent_asin: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get detailed product information by parent_asin from products collection"""
    try:
        # Try to get from products collection using parent_asin
        products_collection = get_collection("products_main")
        product_data = await products_collection.find_one({"parent_asin": parent_asin})
        
        # If not found, try with asin field as fallback
        if not product_data:
            product_data = await products_collection.find_one({"asin": parent_asin})
        
        if not product_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with parent_asin '{parent_asin}' not found"
            )
        
        # Convert ObjectId to string for JSON serialization
        if "_id" in product_data:
            product_data["_id"] = str(product_data["_id"])
        
        # Extract the requested fields with fallback messages for null/missing values
        def get_field_or_default(data, field_name, default_message="This information is not available"):
            value = data.get(field_name)
            return value if value is not None else default_message

        # Smart field lookup with alternative names (only for rating fields)
        def get_smart_field(data, primary_field, alternative_fields=None, default_message="This information is not available"):
            # Try primary field first
            value = data.get(primary_field)
            if value is not None and value != "":
                return value
            
            # Try alternative field names
            if alternative_fields:
                for alt_field in alternative_fields:
                    value = data.get(alt_field)
                    if value is not None and value != "":
                        return value
            
            return default_message

        # Direct field extraction
        price_value = product_data.get("price")
        print(f"Final price value being used: {price_value}")

        detailed_info = {
            "parent_asin": parent_asin,
            "title": product_data.get("title", "Unknown Product"),
            "average_rating": get_smart_field(product_data, "average_rating", ["rating", "avg_rating", "averageRating", "rate"]),
            "rating_numbers": get_smart_field(product_data, "rating_numbers", ["rating_count", "num_ratings", "total_ratings", "ratingNumbers", "rating_number"]),
            "features": get_field_or_default(product_data, "features"),
            "description": get_field_or_default(product_data, "description"),
            "price": price_value if price_value is not None else "This information is not available",
            "images": get_field_or_default(product_data, "images"),
            "details": get_field_or_default(product_data, "details"),
            "categories": product_data.get("categories", [])
        }
        
        # Get review count for this product
        reviews_collection = get_collection("reviews_main")
        review_count = await reviews_collection.count_documents({
            "$or": [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        })
        
        return {
            "product": detailed_info,
            "review_count": review_count,
            "parent_asin": parent_asin,
            "message": "Product details retrieved successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching product details: {str(e)}"
        )

@router.get("/debug-product-raw")
async def debug_product_raw(
    parent_asin: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Debug endpoint to see raw product data structure"""
    try:
        products_collection = get_collection("products_main")
        product_data = await products_collection.find_one({"parent_asin": parent_asin})
        
        if not product_data:
            product_data = await products_collection.find_one({"asin": parent_asin})
        
        if not product_data:
            return {"error": "Product not found"}
        
        # Convert ObjectId to string for JSON serialization
        if "_id" in product_data:
            product_data["_id"] = str(product_data["_id"])
        
        return {
            "raw_product_data": product_data,
            "available_fields": list(product_data.keys()),
            "field_types": {key: str(type(value).__name__) for key, value in product_data.items()}
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/sentiment-timeline")
async def get_sentiment_timeline(
    parent_asin: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get sentiment polarity data grouped by year for timeline chart"""
    try:
        collection = get_collection("reviews_main")
        
        # Build query - filter by parent_asin if provided
        match_query = {
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
            "timestamp": {"$exists": True, "$ne": None}
        }
        
        if parent_asin:
            match_query["$or"] = [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        
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
        
        cursor = collection.aggregate(pipeline)
        aggregated_data = await cursor.to_list(length=None)
        
        # Process the aggregated data to calculate percentages
        timeline_data = []
        for year_data in aggregated_data:
            year = year_data["_id"]
            total_reviews = year_data["total_reviews"]
            
            # Initialize counters
            positive_count = 0
            negative_count = 0
            
            # Count sentiments
            for sentiment_data in year_data["sentiments"]:
                if sentiment_data["sentiment"] == "positive":
                    positive_count = sentiment_data["count"]
                else:
                    negative_count = sentiment_data["count"]
            
            # Calculate percentages
            positive_percentage = round((positive_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
            negative_percentage = round((negative_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
            
            timeline_data.append({
                "year": year,
                "positive_percentage": positive_percentage,
                "negative_percentage": negative_percentage,
                "positive_count": positive_count,
                "negative_count": negative_count,
                "total_reviews": total_reviews
            })
        
        # Create response message
        if parent_asin:
            message = f"Sentiment timeline data for product {parent_asin} across {len(timeline_data)} years"
        else:
            message = f"Sentiment timeline data for all products across {len(timeline_data)} years"
        
        return {
            "timeline_data": timeline_data,
            "years_count": len(timeline_data),
            "parent_asin": parent_asin,
            "message": message
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching sentiment timeline data: {str(e)}"
        )

@router.get("/sentiment-time-series")
async def get_sentiment_time_series(
    start_date: str,
    end_date: str,
    parent_asin: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get sentiment polarity data as time series for line chart with date filtering"""
    try:
        from datetime import datetime
        collection = get_collection("reviews_main")
        
        # Parse dates and convert to timestamps
        start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
        end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
        start_timestamp = int(start_datetime.timestamp())
        end_timestamp = int(end_datetime.timestamp()) + 86400  # Add 24 hours to include end date
        
        # Build query - filter by parent_asin and date range if provided
        match_query = {
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
            "timestamp": {"$exists": True, "$ne": None}
        }
        
        if parent_asin:
            match_query["$or"] = [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        
        # MongoDB aggregation pipeline to group by date and calculate sentiment
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
            },
            {
                "$match": {
                    "timestamp_seconds": {
                        "$gte": start_timestamp,
                        "$lte": end_timestamp
                    }
                }
            },
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
            {"$sort": {"_id": 1}}
        ]
        
        cursor = collection.aggregate(pipeline)
        aggregated_data = await cursor.to_list(length=None)
        
        # Process the aggregated data to calculate percentages
        time_series_data = []
        total_positive = 0
        total_negative = 0
        total_all_reviews = 0
        
        for month_data in aggregated_data:
            month_year = month_data["_id"]
            total_reviews = month_data["total_reviews"]
            
            # Initialize counters
            positive_count = 0
            negative_count = 0
            
            # Count sentiments
            for sentiment_data in month_data["sentiments"]:
                if sentiment_data["sentiment"] == "positive":
                    positive_count = sentiment_data["count"]
                else:
                    negative_count = sentiment_data["count"]
            
            # Calculate percentages
            positive_percentage = round((positive_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
            negative_percentage = round((negative_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
            
            time_series_data.append({
                "month_year": month_year,
                "positive_percentage": positive_percentage,
                "negative_percentage": negative_percentage,
                "positive_count": positive_count,
                "negative_count": negative_count,
                "total_reviews": total_reviews
            })
            
            # Accumulate totals for averages
            total_positive += positive_count
            total_negative += negative_count
            total_all_reviews += total_reviews
        
        # Calculate overall averages
        avg_positive_percentage = round((total_positive / total_all_reviews) * 100, 1) if total_all_reviews > 0 else 0
        avg_negative_percentage = round((total_negative / total_all_reviews) * 100, 1) if total_all_reviews > 0 else 0
        
        # Create response message
        if parent_asin:
            message = f"Time series sentiment data for product {parent_asin} from {start_date} to {end_date}"
        else:
            message = f"Time series sentiment data for all products from {start_date} to {end_date}"
        
        return {
            "time_series_data": time_series_data,
            "total_months": len(time_series_data),
            "total_reviews": total_all_reviews,
            "avg_positive_percentage": avg_positive_percentage,
            "avg_negative_percentage": avg_negative_percentage,
            "start_date": start_date,
            "end_date": end_date,
            "parent_asin": parent_asin,
            "message": message
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching time series sentiment data: {str(e)}"
        )

@router.get("/sentiment-monthly")
async def get_sentiment_monthly(
    parent_asin: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get sentiment polarity data grouped by month names for monthly chart"""
    try:
        collection = get_collection("reviews_main")
        
        # Build query - filter by parent_asin if provided
        match_query = {
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
            "timestamp": {"$exists": True, "$ne": None}
        }
        
        if parent_asin:
            match_query["$or"] = [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        
        # MongoDB aggregation pipeline to group by month and calculate sentiment
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
                    "month": {
                        "$cond": {
                            "if": {"$gt": ["$timestamp_numeric", 1000000000000]},
                            "then": {"$month": {"$toDate": "$timestamp_numeric"}},
                            "else": {
                                "$cond": {
                                    "if": {"$gt": ["$timestamp_numeric", 1000000000]},
                                    "then": {"$month": {"$toDate": {"$multiply": ["$timestamp_numeric", 1000]}}},
                                    "else": {"$mod": [{"$add": [{"$floor": {"$divide": ["$timestamp_numeric", 30.44]}}, 1]}, 12]}
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
                        "month": "$month",
                        "sentiment": "$sentiment"
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.month",
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
        
        cursor = collection.aggregate(pipeline)
        aggregated_data = await cursor.to_list(length=None)
        
        # Month names mapping
        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        
        # Process the aggregated data to calculate percentages
        monthly_data = []
        for month_data in aggregated_data:
            month_num = month_data["_id"]
            month_name = month_names[month_num - 1] if 1 <= month_num <= 12 else f"Month {month_num}"
            total_reviews = month_data["total_reviews"]
            
            # Initialize counters
            positive_count = 0
            negative_count = 0
            
            # Count sentiments
            for sentiment_data in month_data["sentiments"]:
                if sentiment_data["sentiment"] == "positive":
                    positive_count = sentiment_data["count"]
                else:
                    negative_count = sentiment_data["count"]
            
            # Calculate percentages
            positive_percentage = round((positive_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
            negative_percentage = round((negative_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
            
            monthly_data.append({
                "month_number": month_num,
                "month_name": month_name,
                "positive_percentage": positive_percentage,
                "negative_percentage": negative_percentage,
                "positive_count": positive_count,
                "negative_count": negative_count,
                "total_reviews": total_reviews
            })
        
        # Create response message
        if parent_asin:
            message = f"Monthly sentiment data for product {parent_asin} across {len(monthly_data)} months"
        else:
            message = f"Monthly sentiment data for all products across {len(monthly_data)} months"
        
        return {
            "monthly_data": monthly_data,
            "months_count": len(monthly_data),
            "parent_asin": parent_asin,
            "message": message
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching monthly sentiment data: {str(e)}"
        )

@router.get("/sentiment-daily")
async def get_sentiment_daily(
    parent_asin: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get sentiment polarity data grouped by day of week for daily chart"""
    try:
        collection = get_collection("reviews_main")
        
        # Build query - filter by parent_asin if provided
        match_query = {
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
            "timestamp": {"$exists": True, "$ne": None}
        }
        
        if parent_asin:
            match_query["$or"] = [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        
        # MongoDB aggregation pipeline to group by day of week and calculate sentiment
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
                    "dayOfWeek": {
                        "$cond": {
                            "if": {"$gt": ["$timestamp_numeric", 1000000000000]},
                            "then": {"$dayOfWeek": {"$toDate": "$timestamp_numeric"}},
                            "else": {
                                "$cond": {
                                    "if": {"$gt": ["$timestamp_numeric", 1000000000]},
                                    "then": {"$dayOfWeek": {"$toDate": {"$multiply": ["$timestamp_numeric", 1000]}}},
                                    "else": {"$add": [{"$mod": [{"$floor": {"$divide": ["$timestamp_numeric", 86400]}}, 7]}, 1]}
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
                        "dayOfWeek": "$dayOfWeek",
                        "sentiment": "$sentiment"
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.dayOfWeek",
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
        
        cursor = collection.aggregate(pipeline)
        aggregated_data = await cursor.to_list(length=None)
        
        # Day names mapping (MongoDB dayOfWeek: 1=Sunday, 2=Monday, ..., 7=Saturday)
        day_names = [
            "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
        ]
        
        # Process the aggregated data to calculate percentages
        daily_data = []
        for day_data in aggregated_data:
            day_num = day_data["_id"]
            day_name = day_names[day_num - 1] if 1 <= day_num <= 7 else f"Day {day_num}"
            total_reviews = day_data["total_reviews"]
            
            # Initialize counters
            positive_count = 0
            negative_count = 0
            
            # Count sentiments
            for sentiment_data in day_data["sentiments"]:
                if sentiment_data["sentiment"] == "positive":
                    positive_count = sentiment_data["count"]
                else:
                    negative_count = sentiment_data["count"]
            
            # Calculate percentages
            positive_percentage = round((positive_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
            negative_percentage = round((negative_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
            
            daily_data.append({
                "day_number": day_num,
                "day_name": day_name,
                "positive_percentage": positive_percentage,
                "negative_percentage": negative_percentage,
                "positive_count": positive_count,
                "negative_count": negative_count,
                "total_reviews": total_reviews
            })
        
        # Create response message
        if parent_asin:
            message = f"Daily sentiment data for product {parent_asin} across {len(daily_data)} days of week"
        else:
            message = f"Daily sentiment data for all products across {len(daily_data)} days of week"
        
        return {
            "daily_data": daily_data,
            "days_count": len(daily_data),
            "parent_asin": parent_asin,
            "message": message
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching daily sentiment data: {str(e)}"
        )

