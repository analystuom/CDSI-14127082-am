import asyncio
import random
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

# Database Configuration
MONGODB_URL = "mongodb+srv://mike123:mike123@customers.sqmfelq.mongodb.net/?retryWrites=true&w=majority&appName=Customers"
DATABASE_NAME = "users"

UK_CITIES = [
    'London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 
    'Sheffield', 'Bristol', 'Glasgow', 'Edinburgh', 'Newcastle',
    'Cardiff', 'Belfast', 'Nottingham', 'Leicester', 'Coventry',
    'Hull', 'Bradford', 'Southampton', 'Plymouth', 'Reading'
]

async def copy_reviews_with_location():
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    source_collection = db["reviews_main"]
    target_collection = db["reviews_location"]
    
    try:
        print("Starting copy operation...")
        start_time = datetime.now()
        
        # Get source collection size
        total_docs = await source_collection.count_documents({})
        print(f"Processing {total_docs:,} documents")
        
        # Drop target collection if it exists
        await target_collection.drop()
        
        # Process in batches to avoid aggregation complexity
        batch_size = 5000
        processed = 0
        
        print("Processing documents in batches...")
        
        # Use find cursor to process documents
        cursor = source_collection.find({})
        batch = []
        
        async for doc in cursor:
            # Add random city and country to each document
            doc['city'] = random.choice(UK_CITIES)
            doc['country'] = 'UK'
            
            batch.append(doc)
            
            # Insert batch when it reaches batch_size
            if len(batch) >= batch_size:
                await target_collection.insert_many(batch)
                processed += len(batch)
                batch = []
                
                # Progress update
                progress = (processed / total_docs) * 100
                print(f"Progress: {processed:,}/{total_docs:,} ({progress:.1f}%)")
        
        # Insert remaining documents
        if batch:
            await target_collection.insert_many(batch)
            processed += len(batch)
        
        # Verify results
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        final_count = await target_collection.count_documents({})
        
        print(f"Operation completed successfully")
        print(f"Documents processed: {final_count:,}")
        print(f"Processing time: {duration:.2f} seconds")
        print(f"Rate: {final_count/duration:.0f} documents/second")
        
        # Verify location fields were added
        sample_doc = await target_collection.find_one({})
        if sample_doc and 'city' in sample_doc and 'country' in sample_doc:
            print(f"Location fields added - Sample: {sample_doc['city']}, {sample_doc['country']}")
            
            # Show city distribution
            city_counts = await target_collection.aggregate([
                {"$group": {"_id": "$city", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 5}
            ]).to_list(length=5)
            
            print("Top 5 cities by count:")
            for city_data in city_counts:
                print(f"  {city_data['_id']}: {city_data['count']:,}")
        else:
            print("Warning: Location fields may not have been added correctly")
            
    except Exception as e:
        print(f"Error during operation: {str(e)}")
        raise
        
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(copy_reviews_with_location())