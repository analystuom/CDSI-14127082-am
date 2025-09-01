#!/usr/bin/env python3

import json
import sys
from datetime import datetime
from typing import Optional, Tuple


def unix_timestamp_to_year(timestamp: int) -> int:
    timestamp_seconds = timestamp / 1000
    return datetime.fromtimestamp(timestamp_seconds).year


def process_reviews_for_year_range(file_path: str) -> Tuple[Optional[int], Optional[int]]:
    
    Args:
        file_path: Path to the JSONL file
        
    Returns:
        Tuple of (earliest_year, latest_year) or (None, None) if no valid data
    """
    min_year = None
    max_year = None
    processed_count = 0
    error_count = 0
    
    print(f"Processing reviews from: {file_path}")
    print("This may take a while for large datasets...")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            for line_num, line in enumerate(file, 1):
                try:
                    # Skip empty lines
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Parse JSON
                    review = json.loads(line)
                    
                    # Extract timestamp
                    if 'timestamp' not in review:
                        error_count += 1
                        continue
                    
                    timestamp = review['timestamp']
                    if not isinstance(timestamp, (int, float)) or timestamp <= 0:
                        error_count += 1
                        continue
                    
                    # Convert to year
                    year = unix_timestamp_to_year(timestamp)
                    
                    # Update min/max years
                    if min_year is None or year < min_year:
                        min_year = year
                    if max_year is None or year > max_year:
                        max_year = year
                    
                    processed_count += 1
                    
                    # Progress indicator for large files
                    if processed_count % 100000 == 0:
                        print(f"Processed {processed_count:,} reviews... "
                              f"Current year range: {min_year} - {max_year}")
                
                except json.JSONDecodeError:
                    error_count += 1
                    if error_count <= 10:  # Only show first 10 errors
                        print(f"Warning: Invalid JSON on line {line_num}")
                except Exception as e:
                    error_count += 1
                    if error_count <= 10:  # Only show first 10 errors
                        print(f"Warning: Error processing line {line_num}: {e}")
    
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        return None, None
    except Exception as e:
        print(f"Error reading file: {e}")
        return None, None
    
    print(f"\nProcessing complete!")
    print(f"Total reviews processed: {processed_count:,}")
    if error_count > 0:
        print(f"Errors encountered: {error_count:,}")
    
    return min_year, max_year


def main():
    """Main function to run the year range analysis."""
    file_path = "Sports_and_Outdoors.jsonl"
    
    # Check if custom file path provided
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    
    print("=" * 60)
    print("SPORTS & OUTDOORS REVIEWS - YEAR RANGE ANALYSIS")
    print("=" * 60)
    
    # Process the file
    earliest_year, latest_year = process_reviews_for_year_range(file_path)
    
    # Display results
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    
    if earliest_year is not None and latest_year is not None:
        print(f"Earliest review year: {earliest_year}")
        print(f"Latest review year:   {latest_year}")
        print(f"Total year span:      {latest_year - earliest_year + 1} years")
        
        # Additional insights
        if earliest_year == latest_year:
            print("All reviews are from the same year!")
        else:
            print(f"Reviews span from {earliest_year} to {latest_year}")
    else:
        print("No valid timestamp data found in the dataset.")
    
    print("=" * 60)


if __name__ == "__main__":
    main()
