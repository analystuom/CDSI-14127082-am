import json
import os
from pathlib import Path

def count_jsonl_records(file_path):
    count = 0
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            for line in file:
                line = line.strip()
                if line:
                    count += 1
        return count
    except FileNotFoundError:
        print(f"Error: File {file_path} not found.")
        return 0
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return 0

def get_file_size(file_path):
    """
    Get the file size in MB.
    
    Args:
        file_path (str): Path to the file
        
    Returns:
        float: File size in MB
    """
    try:
        size_bytes = os.path.getsize(file_path)
        size_mb = size_bytes / (1024 * 1024)
        return size_mb
    except FileNotFoundError:
        return 0

def analyze_datasets():
    """
    Analyze both datasets and provide record counts and basic information.
    """
    # Define file paths
    reviews_file = "Sports_and_Outdoors.jsonl"
    meta_file = "meta_Sports_and_Outdoors.jsonl"
    
    print("=== Dataset Analysis ===\n")
    
    # Analyze customer reviews dataset
    print("1. Customer Reviews Dataset (Sports_and_Outdoors.jsonl)")
    print("-" * 50)
    
    if os.path.exists(reviews_file):
        reviews_count = count_jsonl_records(reviews_file)
        reviews_size = get_file_size(reviews_file)
        
        print(f"Number of records: {reviews_count:,}")
        print(f"File size: {reviews_size:.2f} MB")
        
        # Sample a few records to show structure
        print("\nSample record structure:")
        try:
            with open(reviews_file, 'r', encoding='utf-8') as file:
                first_line = file.readline().strip()
                if first_line:
                    sample_record = json.loads(first_line)
                    print(f"Fields: {list(sample_record.keys())}")
        except Exception as e:
            print(f"Could not parse sample record: {e}")
    else:
        print("File not found!")
    
    print("\n")
    
    # Analyze product metadata dataset
    print("2. Product Metadata Dataset (meta_Sports_and_Outdoors.jsonl)")
    print("-" * 50)
    
    if os.path.exists(meta_file):
        meta_count = count_jsonl_records(meta_file)
        meta_size = get_file_size(meta_file)
        
        print(f"Number of records: {meta_count:,}")
        print(f"File size: {meta_size:.2f} MB")
        
        # Sample a few records to show structure
        print("\nSample record structure:")
        try:
            with open(meta_file, 'r', encoding='utf-8') as file:
                first_line = file.readline().strip()
                if first_line:
                    sample_record = json.loads(first_line)
                    print(f"Fields: {list(sample_record.keys())}")
        except Exception as e:
            print(f"Could not parse sample record: {e}")
    else:
        print("File not found!")
    
    print("\n" + "=" * 60)
    
    # Summary
    if os.path.exists(reviews_file) and os.path.exists(meta_file):
        total_records = reviews_count + meta_count
        total_size = reviews_size + meta_size
        print(f"SUMMARY:")
        print(f"Total records across both datasets: {total_records:,}")
        print(f"Total file size: {total_size:.2f} MB")
        
        if meta_count > 0:
            coverage_ratio = reviews_count / meta_count
            print(f"Reviews to Products ratio: {coverage_ratio:.2f}")

if __name__ == "__main__":
    analyze_datasets()
