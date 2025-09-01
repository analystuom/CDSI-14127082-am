import os
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

MONGODB_URL = "mongodb+srv://mike123:mike123@customers.sqmfelq.mongodb.net/?retryWrites=true&w=majority&appName=Customers"
DATABASE_NAME = "users"
USERS_COLLECTION = "users"

SECRET_KEY = "asjkdahjdsakhdw"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = None

class Database:
    client: Optional[AsyncIOMotorClient] = None

db = Database()

async def get_database() -> AsyncIOMotorClient:
    return db.client

async def connect_to_mongo():
    db.client = AsyncIOMotorClient(MONGODB_URL)
    print("Connected to MongoDB")

async def close_mongo_connection():
    if db.client:
        db.client.close()
        print("Disconnected from MongoDB")

def get_collection(collection_name: str):
    if db.client is None:
        raise RuntimeError("Database client is not initialized. Make sure connect_to_mongo() was called.")
    return db.client[DATABASE_NAME][collection_name]