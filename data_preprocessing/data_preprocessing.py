#!/usr/bin/env python3

import json
import sys
import os
from typing import Dict, List, Any, Set, Optional
from collections import defaultdict, Counter
import re


class DataQualityInspector:
    
    def __init__(self):
        self.reviews_expected_fields = {
            'rating', 'title', 'text', 'images', 'asin', 'parent_asin', 
            'user_id', 'timestamp', 'helpful_vote', 'verified_purchase'
        }
        
        self.meta_expected_fields = {
            'main_category', 'title', 'average_rating', 'rating_number', 
            'features', 'description', 'price', 'images', 'videos', 
            'store', 'categories', 'details', 'parent_asin', 'bought_together'
        }
        
        self.reset_stats()
    
    def reset_stats(self):
        self.stats = {
            'total_records': 0,
            'valid_records': 0,
            'json_errors': 0,
            'missing_fields': defaultdict(int),
            'null_fields': defaultdict(int),
            'empty_fields': defaultdict(int),
            'field_types': defaultdict(Counter),
            'rating_issues': defaultdict(int),
            'unique_fields_found': set(),
            'sample_errors': [],
            'field_presence': defaultdict(int)
        }
    
    def is_empty_value(self, value: Any) -> bool:
        """Check if a value is considered empty."""
        if value is None:
            return True
        if isinstance(value, str) and value.strip() == "":
            return True
        if isinstance(value, (list, dict)) and len(value) == 0:
            return True
        return False
    
    def validate_rating_field(self, rating: Any, line_num: int) -> Dict[str, Any]:
        issues = {}
        
        if rating is None:
            issues['null_rating'] = True
            return issues
        
        if not isinstance(rating, (int, float)):
            issues['non_numeric_rating'] = True
            issues['rating_type'] = type(rating).__name__
            issues['rating_value'] = str(rating)[:50]
            return issues
        
        if not (1.0 <= rating <= 5.0):
            issues['out_of_range_rating'] = True
            issues['rating_value'] = rating
        
        if isinstance(rating, float):
            decimal_places = len(str(rating).split('.')[-1]) if '.' in str(rating) else 0
            if decimal_places > 1:
                issues['high_precision_rating'] = True
                issues['rating_value'] = rating
        
        return issues
    
    def analyze_field_types(self, data: Dict[str, Any]):
        for field, value in data.items():
            if value is not None:
                self.stats['field_types'][field][type(value).__name__] += 1
    
    def inspect_reviews_file(self, file_path: str, sample_size: Optional[int] = None) -> Dict:
        print(f"Inspecting Reviews Dataset: {file_path}")
        print("=" * 60)
        
        self.reset_stats()
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                for line_num, line in enumerate(file, 1):
                    self.stats['total_records'] = line_num
                    
                    # Sample size limit for testing
                    if sample_size and line_num > sample_size:
                        break
                    
                    try:
                        # Skip empty lines
                        line = line.strip()
                        if not line:
                            continue
                        
                        # Parse JSON
                        try:
                            review = json.loads(line)
                        except json.JSONDecodeError as e:
                            self.stats['json_errors'] += 1
                            if len(self.stats['sample_errors']) < 10:
                                self.stats['sample_errors'].append({
                                    'line': line_num,
                                    'error': f"JSON Parse Error: {str(e)[:100]}",
                                    'sample': line[:100]
                                })
                            continue
                        
                        self.stats['valid_records'] += 1
                        
                        # Track all fields found
                        self.stats['unique_fields_found'].update(review.keys())
                        
                        # Analyze field types
                        self.analyze_field_types(review)
                        
                        # Check for missing expected fields
                        for field in self.reviews_expected_fields:
                            if field in review:
                                self.stats['field_presence'][field] += 1
                                
                                # Check for null/empty values
                                value = review[field]
                                if value is None:
                                    self.stats['null_fields'][field] += 1
                                elif self.is_empty_value(value):
                                    self.stats['empty_fields'][field] += 1
                            else:
                                self.stats['missing_fields'][field] += 1
                        
                        # Special validation for rating field
                        if 'rating' in review:
                            rating_issues = self.validate_rating_field(review['rating'], line_num)
                            for issue_type, issue_value in rating_issues.items():
                                if issue_type in ['null_rating', 'non_numeric_rating', 'out_of_range_rating', 'high_precision_rating']:
                                    self.stats['rating_issues'][issue_type] += 1
                                    
                                    # Store sample for detailed reporting
                                    if len(self.stats['sample_errors']) < 20:
                                        self.stats['sample_errors'].append({
                                            'line': line_num,
                                            'error': f"Rating Issue: {issue_type}",
                                            'details': rating_issues
                                        })
                        
                        # Progress indicator
                        if line_num % 100000 == 0:
                            print(f"Processed {line_num:,} records...")
                    
                    except Exception as e:
                        if len(self.stats['sample_errors']) < 10:
                            self.stats['sample_errors'].append({
                                'line': line_num,
                                'error': f"Processing Error: {str(e)[:100]}",
                                'sample': line[:100]
                            })
        
        except FileNotFoundError:
            print(f"Error: File '{file_path}' not found.")
            return {}
        except Exception as e:
            print(f"Error reading file: {e}")
            return {}
        
        return self.stats
    
    def inspect_metadata_file(self, file_path: str, sample_size: Optional[int] = None) -> Dict:
        """Inspect the metadata dataset for data quality issues."""
        print(f"Inspecting Metadata Dataset: {file_path}")
        print("=" * 60)
        
        self.reset_stats()
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                for line_num, line in enumerate(file, 1):
                    self.stats['total_records'] = line_num
                    
                    # Sample size limit for testing
                    if sample_size and line_num > sample_size:
                        break
                    
                    try:
                        # Skip empty lines
                        line = line.strip()
                        if not line:
                            continue
                        
                        # Parse JSON
                        try:
                            metadata = json.loads(line)
                        except json.JSONDecodeError as e:
                            self.stats['json_errors'] += 1
                            if len(self.stats['sample_errors']) < 10:
                                self.stats['sample_errors'].append({
                                    'line': line_num,
                                    'error': f"JSON Parse Error: {str(e)[:100]}",
                                    'sample': line[:100]
                                })
                            continue
                        
                        self.stats['valid_records'] += 1
                        
                        # Track all fields found
                        self.stats['unique_fields_found'].update(metadata.keys())
                        
                        # Analyze field types
                        self.analyze_field_types(metadata)
                        
                        # Check for missing expected fields
                        for field in self.meta_expected_fields:
                            if field in metadata:
                                self.stats['field_presence'][field] += 1
                                
                                # Check for null/empty values
                                value = metadata[field]
                                if value is None:
                                    self.stats['null_fields'][field] += 1
                                elif self.is_empty_value(value):
                                    self.stats['empty_fields'][field] += 1
                            else:
                                self.stats['missing_fields'][field] += 1
                        
                        # Progress indicator
                        if line_num % 10000 == 0:
                            print(f"Processed {line_num:,} records...")
                    
                    except Exception as e:
                        if len(self.stats['sample_errors']) < 10:
                            self.stats['sample_errors'].append({
                                'line': line_num,
                                'error': f"Processing Error: {str(e)[:100]}",
                                'sample': line[:100]
                            })
        
        except FileNotFoundError:
            print(f"Error: File '{file_path}' not found.")
            return {}
        except Exception as e:
            print(f"Error reading file: {e}")
            return {}
        
        return self.stats
    
    def print_quality_report(self, stats: Dict, dataset_name: str, expected_fields: Set[str]):
        """Print a comprehensive data quality report."""
        print(f"\nDATA QUALITY REPORT - {dataset_name.upper()}")
        print("=" * 80)
        
        # Basic Statistics
        print(f"BASIC STATISTICS")
        print("-" * 40)
        print(f"Total records processed:     {stats['total_records']:,}")
        print(f"Valid JSON records:          {stats['valid_records']:,}")
        print(f"JSON parsing errors:         {stats['json_errors']:,}")
        if stats['total_records'] > 0:
            success_rate = (stats['valid_records'] / stats['total_records']) * 100
            print(f"Success rate:                {success_rate:.2f}%")
        
        # Field Presence Analysis
        print(f"\nFIELD PRESENCE ANALYSIS")
        print("-" * 40)
        print(f"Expected fields: {len(expected_fields)}")
        print(f"Unique fields found: {len(stats['unique_fields_found'])}")
        
        # Missing Fields
        if stats['missing_fields']:
            print(f"\nMISSING FIELDS")
            print("-" * 40)
            for field, count in sorted(stats['missing_fields'].items(), key=lambda x: x[1], reverse=True):
                percentage = (count / stats['valid_records']) * 100 if stats['valid_records'] > 0 else 0
                print(f"  {field:20} : {count:8,} records ({percentage:6.2f}%)")
        else:
            print(f"\nNo missing fields detected!")
        
        # Null Fields
        if any(stats['null_fields'].values()):
            print(f"\nNULL VALUES")
            print("-" * 40)
            for field, count in sorted(stats['null_fields'].items(), key=lambda x: x[1], reverse=True):
                if count > 0:
                    percentage = (count / stats['field_presence'][field]) * 100 if stats['field_presence'][field] > 0 else 0
                    print(f"  {field:20} : {count:8,} records ({percentage:6.2f}%)")
        
        # Empty Fields
        if any(stats['empty_fields'].values()):
            print(f"\nEMPTY VALUES")
            print("-" * 40)
            for field, count in sorted(stats['empty_fields'].items(), key=lambda x: x[1], reverse=True):
                if count > 0:
                    percentage = (count / stats['field_presence'][field]) * 100 if stats['field_presence'][field] > 0 else 0
                    print(f"  {field:20} : {count:8,} records ({percentage:6.2f}%)")
        
        # Rating Issues (for reviews dataset)
        if stats['rating_issues']:
            print(f"\nRATING FIELD ISSUES")
            print("-" * 40)
            for issue_type, count in stats['rating_issues'].items():
                if count > 0:
                    percentage = (count / stats['valid_records']) * 100 if stats['valid_records'] > 0 else 0
                    print(f"  {issue_type:25} : {count:8,} records ({percentage:6.2f}%)")
        
        # Field Types Analysis
        print(f"\nFIELD TYPES ANALYSIS")
        print("-" * 40)
        for field in sorted(expected_fields):
            if field in stats['field_types']:
                types = stats['field_types'][field]
                type_str = ", ".join([f"{t}({c:,})" for t, c in types.most_common()])
                print(f"  {field:20} : {type_str}")
        
        # Sample Errors
        if stats['sample_errors']:
            print(f"\nSAMPLE ERRORS (First 10)")
            print("-" * 40)
            for i, error in enumerate(stats['sample_errors'][:10], 1):
                print(f"  {i}. Line {error['line']:,}: {error['error']}")
                if 'details' in error:
                    print(f"     Details: {error['details']}")
                elif 'sample' in error:
                    print(f"     Sample: {error['sample']}")
        
        print("=" * 80)
    
    def filter_reviews_file(self, file_path: str) -> Dict:
        """Filter reviews dataset to remove records with empty 'text' field in-place."""
        print(f"Filtering Reviews Dataset: {file_path}")
        print("=" * 60)
        
        stats = {
            'total_records': 0,
            'valid_records': 0,
            'filtered_records': 0,
            'json_errors': 0,
            'empty_text_records': 0
        }
        
        temp_file = file_path + '.tmp'
        
        try:
            with open(file_path, 'r', encoding='utf-8') as infile, \
                 open(temp_file, 'w', encoding='utf-8') as outfile:
                
                for line_num, line in enumerate(infile, 1):
                    stats['total_records'] = line_num
                    
                    try:
                        # Skip empty lines
                        line = line.strip()
                        if not line:
                            continue
                        
                        # Parse JSON
                        try:
                            review = json.loads(line)
                        except json.JSONDecodeError:
                            stats['json_errors'] += 1
                            continue
                        
                        stats['valid_records'] += 1
                        
                        # Check if 'text' field exists and is not empty
                        if 'text' not in review or self.is_empty_value(review['text']):
                            stats['empty_text_records'] += 1
                            continue
                        
                        # Write valid record to temp file
                        outfile.write(json.dumps(review, ensure_ascii=False) + '\n')
                        stats['filtered_records'] += 1
                        
                        # Progress indicator
                        if line_num % 100000 == 0:
                            print(f"Processed {line_num:,} records...")
                    
                    except Exception as e:
                        print(f"Error processing line {line_num}: {e}")
                        continue
            
            # Replace original file with filtered version
            os.replace(temp_file, file_path)
            print(f"Updated {file_path} with filtered data")
        
        except FileNotFoundError:
            print(f"Error: File '{file_path}' not found.")
            return {}
        except Exception as e:
            print(f"Error processing file: {e}")
            # Clean up temp file if it exists
            if os.path.exists(temp_file):
                os.remove(temp_file)
            return {}
        
        return stats
    
    def filter_metadata_file(self, file_path: str) -> Dict:
        """Filter metadata dataset to remove records with empty 'title' field in-place."""
        print(f"Filtering Metadata Dataset: {file_path}")
        print("=" * 60)
        
        stats = {
            'total_records': 0,
            'valid_records': 0,
            'filtered_records': 0,
            'json_errors': 0,
            'empty_title_records': 0
        }
        
        temp_file = file_path + '.tmp'
        
        try:
            with open(file_path, 'r', encoding='utf-8') as infile, \
                 open(temp_file, 'w', encoding='utf-8') as outfile:
                
                for line_num, line in enumerate(infile, 1):
                    stats['total_records'] = line_num
                    
                    try:
                        # Skip empty lines
                        line = line.strip()
                        if not line:
                            continue
                        
                        # Parse JSON
                        try:
                            metadata = json.loads(line)
                        except json.JSONDecodeError:
                            stats['json_errors'] += 1
                            continue
                        
                        stats['valid_records'] += 1
                        
                        # Check if 'title' field exists and is not empty
                        if 'title' not in metadata or self.is_empty_value(metadata['title']):
                            stats['empty_title_records'] += 1
                            continue
                        
                        # Write valid record to temp file
                        outfile.write(json.dumps(metadata, ensure_ascii=False) + '\n')
                        stats['filtered_records'] += 1
                        
                        # Progress indicator
                        if line_num % 10000 == 0:
                            print(f"Processed {line_num:,} records...")
                    
                    except Exception as e:
                        print(f"Error processing line {line_num}: {e}")
                        continue
            
            # Replace original file with filtered version
            os.replace(temp_file, file_path)
            print(f"Updated {file_path} with filtered data")
        
        except FileNotFoundError:
            print(f"Error: File '{file_path}' not found.")
            return {}
        except Exception as e:
            print(f"Error processing file: {e}")
            # Clean up temp file if it exists
            if os.path.exists(temp_file):
                os.remove(temp_file)
            return {}
        
        return stats
    
    def print_filtering_report(self, stats: Dict, dataset_name: str):
        """Print a report of the filtering results."""
        print(f"\nFILTERING REPORT - {dataset_name.upper()}")
        print("=" * 60)
        print(f"Total records processed:     {stats['total_records']:,}")
        print(f"Valid JSON records:          {stats['valid_records']:,}")
        print(f"JSON parsing errors:         {stats['json_errors']:,}")
        
        if 'empty_text_records' in stats:
            print(f"Records with empty text:     {stats['empty_text_records']:,}")
        if 'empty_title_records' in stats:
            print(f"Records with empty title:    {stats['empty_title_records']:,}")
        
        print(f"Records written to output:   {stats['filtered_records']:,}")
        
        if stats['valid_records'] > 0:
            retention_rate = (stats['filtered_records'] / stats['valid_records']) * 100
            print(f"Data retention rate:         {retention_rate:.2f}%")
        
        print("=" * 60)


def main():
    """Main function to run data quality inspection and filtering."""
    inspector = DataQualityInspector()
    
    # Configuration
    reviews_file = "Sports_and_Outdoors.jsonl"
    metadata_file = "meta_Sports_and_Outdoors.jsonl"
    
    # Check for command line arguments
    sample_size = None
    mode = "both"  # Default mode - both inspection and filtering
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "inspect":
            mode = "inspect"
        elif sys.argv[1] == "filter":
            mode = "filter"
        elif sys.argv[1] == "both":
            mode = "both"
        else:
            try:
                sample_size = int(sys.argv[1])
                print(f"Running in SAMPLE MODE: Processing first {sample_size:,} records from each file")
            except ValueError:
                print("Invalid argument. Use 'inspect', 'filter', 'both', or a number for sample size.")
                print("Usage: python data_preprocessing.py [inspect|filter|both|sample_size]")
                return
    
    print("AMAZON SPORTS & OUTDOORS - DATA QUALITY PROCESSING")
    print("=" * 80)
    
    if mode in ["inspect", "both"]:
        print("\nDATA QUALITY INSPECTION")
        print("=" * 40)
        
        # Inspect Reviews Dataset
        reviews_stats = inspector.inspect_reviews_file(reviews_file, sample_size)
        if reviews_stats:
            inspector.print_quality_report(reviews_stats, "Customer Reviews", inspector.reviews_expected_fields)
        
        print("\n" + "="*80 + "\n")
        
        # Inspect Metadata Dataset
        metadata_stats = inspector.inspect_metadata_file(metadata_file, sample_size)
        if metadata_stats:
            inspector.print_quality_report(metadata_stats, "Product Metadata", inspector.meta_expected_fields)
    
    if mode in ["filter", "both"]:
        print("\nDATA FILTERING")
        print("=" * 40)
        
        # Filter Reviews Dataset (remove empty text) - modifies original file
        print(f"\nFiltering reviews dataset...")
        reviews_filter_stats = inspector.filter_reviews_file(reviews_file)
        if reviews_filter_stats:
            inspector.print_filtering_report(reviews_filter_stats, "Customer Reviews")
        
        print()
        
        # Filter Metadata Dataset (remove empty title) - modifies original file
        print(f"Filtering metadata dataset...")
        metadata_filter_stats = inspector.filter_metadata_file(metadata_file)
        if metadata_filter_stats:
            inspector.print_filtering_report(metadata_filter_stats, "Product Metadata")
    
    # Summary
    print(f"\nPROCESSING COMPLETE!")
    if mode == "inspect":
        print("   Data quality inspection completed")
    elif mode == "filter":
        print("   Data filtering completed")
        print(f"   Original files updated with filtered data")
    else:  # both
        print("   Data inspection and filtering completed")
        print(f"   Original files updated with filtered data")
    
    if sample_size:
        print(f"   Sample size: {sample_size:,} records per file")
    
    print("=" * 80)


if __name__ == "__main__":
    main()



