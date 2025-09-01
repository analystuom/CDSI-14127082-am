import redis.asyncio as redis
import json
import hashlib
import logging
from typing import Any, Optional, Dict, List
from datetime import datetime, timedelta
import os

logger = logging.getLogger(__name__)

class RedisConfig:
    
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis_client: Optional[redis.Redis] = None
        self.default_ttl = 600
        self.component_ttl = 1800
        
    async def connect(self):
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            await self.redis_client.ping()
            logger.info("Successfully connected to Redis")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            self.redis_client = None
            raise e
    
    async def disconnect(self):
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Disconnected from Redis")
    
    def generate_cache_key(self, prefix: str, **kwargs) -> str:
        sorted_params = sorted(kwargs.items())
        param_string = "&".join([f"{k}={v}" for k, v in sorted_params if v is not None])
        
        hash_object = hashlib.md5(param_string.encode())
        hash_hex = hash_object.hexdigest()
        
        return f"{prefix}:{hash_hex}"
    
    async def get(self, key: str) -> Optional[Any]:
        if not self.redis_client:
            logger.warning("Redis client not available, skipping cache get")
            return None
            
        try:
            cached_data = await self.redis_client.get(key)
            if cached_data:
                logger.debug(f"Cache hit for key: {key}")
                return json.loads(cached_data)
            else:
                logger.debug(f"Cache miss for key: {key}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {str(e)}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        if not self.redis_client:
            logger.warning("Redis client not available, skipping cache set")
            return False
            
        try:
            ttl = ttl or self.default_ttl
            serialized_value = json.dumps(value, default=str)
            
            await self.redis_client.setex(key, ttl, serialized_value)
            logger.debug(f"Cache set for key: {key} with TTL: {ttl}")
            return True
            
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {str(e)}")
            return False
    
    async def delete(self, key: str) -> bool:
        if not self.redis_client:
            logger.warning("Redis client not available, skipping cache delete")
            return False
            
        try:
            result = await self.redis_client.delete(key)
            logger.debug(f"Cache delete for key: {key}, result: {result}")
            return bool(result)
            
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {str(e)}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        if not self.redis_client:
            logger.warning("Redis client not available, skipping pattern delete")
            return 0
            
        try:
            keys = await self.redis_client.keys(pattern)
            if keys:
                deleted_count = await self.redis_client.delete(*keys)
                logger.info(f"Deleted {deleted_count} keys matching pattern: {pattern}")
                return deleted_count
            return 0
            
        except Exception as e:
            logger.error(f"Error deleting keys with pattern {pattern}: {str(e)}")
            return 0
    
    async def invalidate_product_cache(self, parent_asin: str):
        patterns = [
            f"dashboard:*{parent_asin}*",
            f"summary:*{parent_asin}*",
            f"wordcloud:*{parent_asin}*",
            f"timeline:*{parent_asin}*",
            f"distribution:*{parent_asin}*",
            f"sentiment_map:*{parent_asin}*"
        ]
        
        total_deleted = 0
        for pattern in patterns:
            deleted = await self.delete_pattern(pattern)
            total_deleted += deleted
        
        logger.info(f"Invalidated {total_deleted} cache entries for product: {parent_asin}")
        return total_deleted
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        if not self.redis_client:
            return {"status": "disconnected"}
            
        try:
            info = await self.redis_client.info()
            return {
                "status": "connected",
                "used_memory": info.get("used_memory_human", "N/A"),
                "connected_clients": info.get("connected_clients", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(
                    info.get("keyspace_hits", 0),
                    info.get("keyspace_misses", 0)
                )
            }
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    def _calculate_hit_rate(self, hits: int, misses: int) -> float:
        total = hits + misses
        if total == 0:
            return 0.0
        return round((hits / total) * 100, 2)
    
    async def health_check(self) -> bool:
        if not self.redis_client:
            return False
            
        try:
            await self.redis_client.ping()
            return True
        except Exception:
            return False

redis_config = RedisConfig()

async def get_redis() -> RedisConfig:
    return redis_config
