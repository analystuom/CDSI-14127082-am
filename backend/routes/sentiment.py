from fastapi import APIRouter, Depends, HTTPException, status
from models import UserInDB
from auth import get_current_active_user
from config import get_collection
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api", tags=["sentiment"])

@router.get("/trends/sentiment-over-time")
async def get_sentiment_over_time(
    parent_asin: str,
    startDate: str,
    endDate: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get sentiment trend data over time for line chart with summary statistics"""
    try:
        collection = get_collection("reviews_main")
        
        # Parse dates and convert to timestamps
        start_datetime = datetime.strptime(startDate, "%Y-%m-%d")
        end_datetime = datetime.strptime(endDate, "%Y-%m-%d")
        start_timestamp = int(start_datetime.timestamp())
        end_timestamp = int(end_datetime.timestamp()) + 86400  # Add 24 hours to include end date
        
        # Build query - filter by parent_asin and date range
        match_query = {
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
            "timestamp": {"$exists": True, "$ne": None},
            "$or": [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        }
        
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
            {
                "$project": {
                    "month": "$_id",
                    "total_reviews": 1,
                    "positive_count": {
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
                    "neutral_count": {
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
                    "negative_count": {
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
                    }
                }
            },
            {
                "$project": {
                    "month": 1,
                    "total_reviews": 1,
                    "positive": {
                        "$round": [
                            {
                                "$multiply": [
                                    {"$divide": ["$positive_count", "$total_reviews"]},
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
                                    {"$divide": ["$neutral_count", "$total_reviews"]},
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
                                    {"$divide": ["$negative_count", "$total_reviews"]},
                                    100
                                ]
                            },
                            1
                        ]
                    }
                }
            },
            {"$sort": {"month": 1}}
        ]
        
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
        
        # Format response according to specification
        response = {
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
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching sentiment trend data: {str(e)}"
        )

@router.get("/distributions/sentiment")
async def get_sentiment_distributions(
    parent_asin: str,
    period: str,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get sentiment distribution data for bar charts (yearly, monthly, or daily)"""
    try:
        collection = get_collection("reviews_main")
        
        # Validate period parameter
        if period not in ["year", "month", "day_of_week"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Period must be one of: year, month, day_of_week"
            )
        
        # Build base query - filter by parent_asin
        match_query = {
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
            "timestamp": {"$exists": True, "$ne": None},
            "$or": [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        }
        
        # Add date filtering if provided
        if startDate and endDate:
            try:
                start_datetime = datetime.strptime(startDate, "%Y-%m-%d")
                end_datetime = datetime.strptime(endDate, "%Y-%m-%d")
                start_timestamp = int(start_datetime.timestamp())
                end_timestamp = int(end_datetime.timestamp()) + 86400  # Add 24 hours to include end date
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date format. Use YYYY-MM-DD"
                )
        
        # Build aggregation pipeline based on period
        if period == "year":
            group_field = {
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
            }
            result_key = "year"
            
        elif period == "month":
            group_field = {
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
        ]
        
        # Add date filtering stage if dates are provided
        if startDate and endDate:
            pipeline.append({
                "$match": {
                    "timestamp_seconds": {
                        "$gte": start_timestamp,
                        "$lte": end_timestamp
                    }
                }
            })
        
        # Continue with the rest of the pipeline
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
                    },
                    "rating": 1
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
                    "positive_count": {
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
                    "neutral_count": {
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
                    "negative_count": {
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
                    }
                }
            },
            {
                "$project": {
                    result_key: "$period_value",
                    "positive": {
                        "$round": [
                            {
                                "$multiply": [
                                    {"$divide": ["$positive_count", "$total_reviews"]},
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
                                    {"$divide": ["$neutral_count", "$total_reviews"]},
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
                                    {"$divide": ["$negative_count", "$total_reviews"]},
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
        
        cursor = collection.aggregate(pipeline)
        distribution_data = await cursor.to_list(length=None)
        
        # Handle day_of_week special case - convert numbers to day names and reorder
        if period == "day_of_week":
            day_names = {1: "Sunday", 2: "Monday", 3: "Tuesday", 4: "Wednesday", 
                        5: "Thursday", 6: "Friday", 7: "Saturday"}
            
            # Convert day numbers to names
            for item in distribution_data:
                item["day"] = day_names.get(item["day"], f"Day {item['day']}")
            
            # Sort by day order (Sunday first)
            day_order = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
            distribution_data.sort(key=lambda x: day_order.index(x["day"]) if x["day"] in day_order else 7)
        
        # Handle month special case - convert numbers to month names and reorder
        elif period == "month":
            month_names = {1: "January", 2: "February", 3: "March", 4: "April", 
                          5: "May", 6: "June", 7: "July", 8: "August",
                          9: "September", 10: "October", 11: "November", 12: "December"}
            
            # Convert month numbers to names
            for item in distribution_data:
                item["month"] = month_names.get(item["month"], f"Month {item['month']}")
            
            # Sort by month order (January first)
            month_order = ["January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"]
            distribution_data.sort(key=lambda x: month_order.index(x["month"]) if x["month"] in month_order else 12)
        
        return distribution_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching sentiment distribution data: {str(e)}"
        )

@router.get("/date-range")
async def get_product_date_range(
    parent_asin: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get the earliest and latest dates for a specific product leveraging composite indexing"""
    try:
        collection = get_collection("reviews_main")
        
        # Build query - filter by parent_asin
        match_query = {
            "rating": {"$exists": True, "$ne": None, "$gte": 1, "$lte": 5},
            "timestamp": {"$exists": True, "$ne": None},
            "$or": [
                {"parent_asin": parent_asin},
                {"asin": parent_asin}
            ]
        }
        
        # Use MongoDB's composite index on parent_asin + timestamp
        # Find the earliest timestamp (MIN)
        earliest_cursor = collection.find(
            match_query,
            {"timestamp": 1, "_id": 0}
        ).sort("timestamp", 1).limit(1)
        
        # Find the latest timestamp (MAX)  
        latest_cursor = collection.find(
            match_query,
            {"timestamp": 1, "_id": 0}
        ).sort("timestamp", -1).limit(1)
        
        earliest_result = await earliest_cursor.to_list(length=1)
        latest_result = await latest_cursor.to_list(length=1)
        
        if not earliest_result or not latest_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No reviews found for product {parent_asin}"
            )
        
        earliest_timestamp = earliest_result[0]["timestamp"]
        latest_timestamp = latest_result[0]["timestamp"]
        
        # Handle different timestamp formats (string vs numeric)
        def normalize_timestamp(timestamp):
            if isinstance(timestamp, str):
                try:
                    timestamp = int(timestamp)
                except (ValueError, TypeError):
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Invalid timestamp format in database"
                    )
            
            # Convert milliseconds to seconds if needed
            if timestamp > 1000000000000:  # Milliseconds
                timestamp = timestamp / 1000
            
            return int(timestamp)
        
        earliest_timestamp = normalize_timestamp(earliest_timestamp)
        latest_timestamp = normalize_timestamp(latest_timestamp)
        
        # Convert to datetime objects and format as YYYY-MM-DD
        earliest_date = datetime.fromtimestamp(earliest_timestamp).strftime("%Y-%m-%d")
        latest_date = datetime.fromtimestamp(latest_timestamp).strftime("%Y-%m-%d")
        
        return {
            "parent_asin": parent_asin,
            "earliest_date": earliest_date,
            "latest_date": latest_date,
            "earliest_timestamp": earliest_timestamp,
            "latest_timestamp": latest_timestamp
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching date range for product {parent_asin}: {str(e)}"
        )