import json
from collections import defaultdict
from pymongo import MongoClient

def count_reviews_per_product(reviews_file):
    review_counts = defaultdict(int)
    
    print("Reading reviews file and counting reviews per product...")
    with open(reviews_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            if line_num % 100000 == 0:
                print(f"Processed {line_num} reviews...")
            
            try:
                review = json.loads(line.strip())
                parent_asin = review.get('parent_asin')
                if parent_asin:
                    review_counts[parent_asin] += 1
            except json.JSONDecodeError:
                print(f"Warning: Skipping malformed JSON at line {line_num}")
                continue
    
    print(f"Finished reading reviews. Total unique products with reviews: {len(review_counts)}")
    return review_counts

def filter_products_with_review_range(meta_file, review_counts, min_reviews=4000, max_reviews=5000):
    products_with_reviews_in_range = []
    qualifying_parent_asins = set()
    
    print(f"Reading meta file and filtering products with {min_reviews}-{max_reviews} reviews...")
    with open(meta_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            if line_num % 10000 == 0:
                print(f"Processed {line_num} products...")
            
            try:
                product = json.loads(line.strip())
                parent_asin = product.get('parent_asin')
                
                if parent_asin and min_reviews <= review_counts[parent_asin] <= max_reviews:
                    product['actual_review_count'] = review_counts[parent_asin]
                    products_with_reviews_in_range.append(product)
                    qualifying_parent_asins.add(parent_asin)
            except json.JSONDecodeError:
                print(f"Warning: Skipping malformed JSON at line {line_num}")
                continue
    
    return products_with_reviews_in_range, qualifying_parent_asins

def filter_reviews_for_products(reviews_file, qualifying_parent_asins):
    """Filter reviews that belong to the qualifying products"""
    qualifying_reviews = []
    
    print(f"Reading reviews file and filtering reviews for {len(qualifying_parent_asins)} qualifying products...")
    with open(reviews_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            if line_num % 100000 == 0:
                print(f"Processed {line_num} reviews...")
            
            try:
                review = json.loads(line.strip())
                parent_asin = review.get('parent_asin')
                
                if parent_asin and parent_asin in qualifying_parent_asins:
                    qualifying_reviews.append(review)
            except json.JSONDecodeError:
                print(f"Warning: Skipping malformed JSON at line {line_num}")
                continue
    
    print(f"Found {len(qualifying_reviews)} reviews for qualifying products")
    return qualifying_reviews

def upload_to_mongodb(products, reviews, connection_string):
    """Upload products and reviews to MongoDB collections"""
    print("Connecting to MongoDB...")
    client = MongoClient(connection_string)
    
    # Get database (using 'users' as the database name)
    db = client.users
    
    # Check if collections exist and have data
    collection_names = db.list_collection_names()
    products_exists = 'products_main' in collection_names
    reviews_exists = 'reviews_main' in collection_names
    
    # Get collections (create if they don't exist)
    products_collection = db.products_main
    reviews_collection = db.reviews_main
    
    # Check if collections have data
    products_has_data = products_exists and products_collection.count_documents({}) > 0
    reviews_has_data = reviews_exists and reviews_collection.count_documents({}) > 0
    
    if products_has_data and reviews_has_data:
        print("Collections 'products_main' and 'reviews_main' already exist and contain data.")
        print(f"Products collection has {products_collection.count_documents({})} documents")
        print(f"Reviews collection has {reviews_collection.count_documents({})} documents")
        print("Skipping data upload to avoid duplicates.")
        client.close()
        return
    
    # Clear existing data if collections exist but we're proceeding with upload
    if products_exists:
        print("Clearing existing products_main collection...")
        products_collection.delete_many({})
    if reviews_exists:
        print("Clearing existing reviews_main collection...")
        reviews_collection.delete_many({})
    
    # Upload products
    print(f"Uploading {len(products)} products to products_main collection...")
    if products:
        products_collection.insert_many(products)
        print(f"Successfully uploaded {len(products)} products")
    
    # Upload reviews in batches for better performance
    print(f"Uploading {len(reviews)} reviews to reviews_main collection...")
    if reviews:
        batch_size = 1000
        for i in range(0, len(reviews), batch_size):
            batch = reviews[i:i + batch_size]
            reviews_collection.insert_many(batch)
            print(f"Uploaded batch {i//batch_size + 1}/{(len(reviews) + batch_size - 1)//batch_size}")
        print(f"Successfully uploaded {len(reviews)} reviews")
    
    # Create comprehensive indexes for optimal query performance
    print("Creating optimized indexes...")
    
    # Products Collection Indexes
    print("Creating products indexes...")
    products_collection.create_index("parent_asin")  # Primary key for linking
    products_collection.create_index("average_rating")  # Rating-based queries
    products_collection.create_index("actual_review_count")  # Popularity sorting
    products_collection.create_index("price")  # Price range queries
    products_collection.create_index("categories")  # Category filtering
    products_collection.create_index("main_category")  # Broader category filtering
    
    # Compound indexes for products
    products_collection.create_index([("average_rating", 1), ("actual_review_count", -1)])  # Popular + highly rated
    products_collection.create_index([("categories", 1), ("average_rating", -1)])  # Category + rating
    products_collection.create_index([("price", 1), ("average_rating", -1)])  # Price + rating
    
    # Text index for product search
    try:
        products_collection.create_index([("title", "text"), ("description", "text")])
        print("Created text search index for products")
    except Exception as e:
        print(f"Text index creation failed (may already exist): {e}")
    
    # Reviews Collection Indexes
    print("Creating reviews indexes...")
    reviews_collection.create_index("parent_asin")  # Product linkage
    reviews_collection.create_index("rating")  # Rating-based filtering
    reviews_collection.create_index("timestamp")  # Chronological queries
    reviews_collection.create_index("verified_purchase")  # Verified review filtering
    reviews_collection.create_index("helpful_vote")  # Helpful review sorting
    reviews_collection.create_index("user_id")  # User-specific queries
    
    # Compound indexes for reviews (most critical for performance)
    reviews_collection.create_index([("parent_asin", 1), ("rating", 1)])  # Product + rating
    reviews_collection.create_index([("parent_asin", 1), ("timestamp", -1)])  # Product + latest
    reviews_collection.create_index([("parent_asin", 1), ("helpful_vote", -1)])  # Product + helpful
    reviews_collection.create_index([("rating", 1), ("helpful_vote", -1)])  # High rated + helpful
    reviews_collection.create_index([("verified_purchase", 1), ("rating", 1)])  # Verified + rating
    reviews_collection.create_index([("timestamp", -1), ("rating", 1)])  # Recent + rating
    
    # Text index for review search
    try:
        reviews_collection.create_index([("title", "text"), ("text", "text")])
        print("Created text search index for reviews")
    except Exception as e:
        print(f"Text index creation failed (may already exist): {e}")
        
    print("All indexes created successfully!")
    
    print("Upload completed successfully!")
    client.close()

def main():
    # File paths
    reviews_file = 'Sports_and_Outdoors.jsonl'
    meta_file = 'meta_Sports_and_Outdoors.jsonl'
    min_reviews = 4000
    
    # MongoDB connection string
    connection_string = "mongodb+srv://mike123:mike123@customers.sqmfelq.mongodb.net/?retryWrites=true&w=majority&appName=Customers"
    
    print("=== Finding Products with 4000-5000 Reviews and Uploading to MongoDB ===\n")
    
    # Step 1: Count reviews per product
    review_counts = count_reviews_per_product(reviews_file)
    
    # Step 2: Filter products with 4000-5000 reviews
    max_reviews = 5000
    qualifying_products, qualifying_parent_asins = filter_products_with_review_range(meta_file, review_counts, min_reviews, max_reviews)
    
    # Step 3: Filter reviews for qualifying products
    qualifying_reviews = filter_reviews_for_products(reviews_file, qualifying_parent_asins)
    
    # Step 4: Display results
    print(f"\n=== RESULTS ===")
    print(f"Total number of products with {min_reviews}-{max_reviews} reviews: {len(qualifying_products)}")
    print(f"Total number of reviews for these products: {len(qualifying_reviews)}")
    
    if qualifying_products:
        print(f"\nTop 10 products by review count:")
        # Sort by review count (descending)
        qualifying_products_sorted = sorted(qualifying_products, key=lambda x: x['actual_review_count'], reverse=True)
        
        for i, product in enumerate(qualifying_products_sorted[:10], 1):
            print(f"{i}. {product.get('title', 'Unknown')[:60]}...")
            print(f"   Parent ASIN: {product.get('parent_asin')}")
            print(f"   Reviews: {product['actual_review_count']}")
            print(f"   Average Rating: {product.get('average_rating')}")
            print()
    
    # Step 5: Upload to MongoDB
    if qualifying_products and qualifying_reviews:
        print("\n=== UPLOADING TO MONGODB ===")
        upload_to_mongodb(qualifying_products, qualifying_reviews, connection_string)
    else:
        print("No data to upload.")

if __name__ == "__main__":
    main()
