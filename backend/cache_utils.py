import asyncio
import logging
from typing import Any, Optional, Dict, List, Callable
from datetime import datetime
from redis_config import redis_config

logger = logging.getLogger(__name__)

class CacheManager:
    
    def __init__(self):
        self.redis = redis_config
        
    async def cache_with_fallback(
        self,
        cache_key: str,
        fetch_function: Callable,
        ttl: Optional[int] = None,
        **fetch_kwargs
    ) -> Any:
        cached_data = await self.redis.get(cache_key)
        if cached_data is not None:
            logger.debug(f"Cache hit for key: {cache_key}")
            return cached_data
        
        logger.debug(f"Cache miss for key: {cache_key}, fetching from database")
        try:
            fresh_data = await fetch_function(**fetch_kwargs)
            
            if fresh_data is not None:
                await self.redis.set(cache_key, fresh_data, ttl)
                logger.debug(f"Cached fresh data for key: {cache_key}")
            
            return fresh_data
            
        except Exception as e:
            logger.error(f"Error fetching data for cache key {cache_key}: {str(e)}")
            raise e
    
    async def warm_cache_for_product(self, parent_asin: str, date_range: Optional[Dict] = None):
        logger.info(f"Starting cache warming for product: {parent_asin}")
        
        from routes.dashboard import (
            get_summary_statistics_cached,
            get_word_cloud_data_cached,
            get_sentiment_timeline_cached,
            get_sentiment_distribution_cached,
            get_sentiment_map_cached
        )
        
        base_params = {"parent_asin": parent_asin}
        if date_range:
            base_params.update(date_range)
        
        warming_tasks = [
            get_summary_statistics_cached(**base_params),
            get_word_cloud_data_cached(**base_params),
            get_sentiment_timeline_cached(**base_params),
            get_sentiment_distribution_cached(period="year", **base_params),
            get_sentiment_distribution_cached(period="month", **base_params),
            get_sentiment_map_cached(**base_params)
        ]
        
        try:
            results = await asyncio.gather(*warming_tasks, return_exceptions=True)
            
            successful = sum(1 for r in results if not isinstance(r, Exception))
            failed = len(results) - successful
            
            logger.info(f"Cache warming completed for {parent_asin}: {successful} successful, {failed} failed")
            
            return {
                "product": parent_asin,
                "successful": successful,
                "failed": failed,
                "total": len(results)
            }
            
        except Exception as e:
            logger.error(f"Error during cache warming for {parent_asin}: {str(e)}")
            return {
                "product": parent_asin,
                "successful": 0,
                "failed": len(warming_tasks),
                "error": str(e)
            }
    
    async def invalidate_product_cache(self, parent_asin: str) -> Dict[str, Any]:
        logger.info(f"Invalidating cache for product: {parent_asin}")
        
        try:
            deleted_count = await self.redis.invalidate_product_cache(parent_asin)
            
            return {
                "product": parent_asin,
                "deleted_keys": deleted_count,
                "status": "success",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error invalidating cache for {parent_asin}: {str(e)}")
            return {
                "product": parent_asin,
                "deleted_keys": 0,
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def bulk_invalidate_cache(self, parent_asins: List[str]) -> Dict[str, Any]:
        logger.info(f"Bulk invalidating cache for {len(parent_asins)} products")
        
        results = []
        total_deleted = 0
        
        for parent_asin in parent_asins:
            result = await self.invalidate_product_cache(parent_asin)
            results.append(result)
            total_deleted += result.get("deleted_keys", 0)
        
        return {
            "total_products": len(parent_asins),
            "total_deleted_keys": total_deleted,
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_cache_performance_metrics(self) -> Dict[str, Any]:
        try:
            stats = await self.redis.get_cache_stats()
            
            metrics = {
                **stats,
                "cache_efficiency": self._calculate_cache_efficiency(stats),
                "memory_usage_category": self._categorize_memory_usage(stats.get("used_memory", "0B")),
                "performance_status": self._assess_performance_status(stats),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting cache performance metrics: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _calculate_cache_efficiency(self, stats: Dict[str, Any]) -> str:
        hit_rate = stats.get("hit_rate", 0)
        
        if hit_rate >= 80:
            return "excellent"
        elif hit_rate >= 60:
            return "good"
        elif hit_rate >= 40:
            return "fair"
        else:
            return "poor"
    
    def _categorize_memory_usage(self, memory_str: str) -> str:
        try:
            if "M" in memory_str:
                value = float(memory_str.replace("M", ""))
                if value > 100:
                    return "high"
                elif value > 50:
                    return "medium"
                else:
                    return "low"
            elif "K" in memory_str:
                return "low"
            elif "G" in memory_str:
                return "high"
            else:
                return "unknown"
        except:
            return "unknown"
    
    def _assess_performance_status(self, stats: Dict[str, Any]) -> str:
        if stats.get("status") != "connected":
            return "offline"
        
        hit_rate = stats.get("hit_rate", 0)
        connected_clients = stats.get("connected_clients", 0)
        
        if hit_rate >= 70 and connected_clients > 0:
            return "optimal"
        elif hit_rate >= 50:
            return "good"
        elif hit_rate >= 30:
            return "degraded"
        else:
            return "poor"
    
    async def schedule_cache_cleanup(self, max_age_hours: int = 24) -> Dict[str, Any]:
        logger.info(f"Starting cache cleanup for entries older than {max_age_hours} hours")
        
        try:
            patterns_to_clean = [
                "dashboard:*",
                "summary:*",
                "wordcloud:*",
                "timeline:*",
                "distribution:*",
                "sentiment_map:*"
            ]
            
            total_cleaned = 0
            for pattern in patterns_to_clean:
                keys = await self.redis.redis_client.keys(pattern) if self.redis.redis_client else []
                logger.debug(f"Found {len(keys)} keys matching pattern: {pattern}")
            
            return {
                "status": "completed",
                "cleaned_entries": total_cleaned,
                "max_age_hours": max_age_hours,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error during cache cleanup: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

cache_manager = CacheManager()

async def get_cache_manager() -> CacheManager:
    return cache_manager
