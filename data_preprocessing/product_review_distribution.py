import json
from collections import defaultdict, Counter
import os
from datetime import datetime
import matplotlib.pyplot as plt
import numpy as np

def count_reviews_per_product(reviews_file):
    print("Counting reviews per product...")
    review_counts = defaultdict(int)
    total_reviews_processed = 0
    
    try:
        with open(reviews_file, 'r', encoding='utf-8') as file:
            for line_num, line in enumerate(file, 1):
                line = line.strip()
                if line:
                    try:
                        review = json.loads(line)
                        parent_asin = review.get('parent_asin')
                        if parent_asin:
                            review_counts[parent_asin] += 1
                            total_reviews_processed += 1
                        
                        # Progress indicator for large files
                        if line_num % 1000000 == 0:
                            print(f"Processed {line_num:,} reviews...")
                            
                    except json.JSONDecodeError:
                        print(f"Warning: Could not parse line {line_num}")
                        continue
                        
    except FileNotFoundError:
        print(f"Error: File {reviews_file} not found.")
        return {}
    except Exception as e:
        print(f"Error reading {reviews_file}: {e}")
        return {}
    
    print(f"Total reviews processed: {total_reviews_processed:,}")
    print(f"Unique products found: {len(review_counts):,}")
    
    return dict(review_counts)

def categorize_products_by_review_count(review_counts):
    """
    Categorize products based on their review counts with finer granularity for better visualization.
    
    Args:
        review_counts (dict): Dictionary with parent_asin as key and review count as value
        
    Returns:
        dict: Dictionary with category names and product counts
    """
    categories = {
        'less_than_50': 0,
        'between_50_99': 0,
        'less_than_500': 0,
        'less_than_1000': 0,
        'less_than_2000': 0,
        'less_than_4000': 0,
        'less_than_8000': 0,
        'more_than_8000': 0
    }
    
    # Also track detailed statistics
    detailed_stats = {
        'less_than_50': [],
        'between_50_99': [],
        'less_than_500': [],
        'less_than_1000': [],
        'less_than_2000': [],
        'less_than_4000': [],
        'less_than_8000': [],
        'more_than_8000': []
    }
    
    for parent_asin, count in review_counts.items():
        if count < 50:
            categories['less_than_50'] += 1
            detailed_stats['less_than_50'].append(count)
        elif count < 100:
            categories['between_50_99'] += 1
            detailed_stats['between_50_99'].append(count)
        elif count < 500:
            categories['less_than_500'] += 1
            detailed_stats['less_than_500'].append(count)
        elif count < 1000:
            categories['less_than_1000'] += 1
            detailed_stats['less_than_1000'].append(count)
        elif count < 2000:
            categories['less_than_2000'] += 1
            detailed_stats['less_than_2000'].append(count)
        elif count < 4000:
            categories['less_than_4000'] += 1
            detailed_stats['less_than_4000'].append(count)
        elif count < 8000:
            categories['less_than_8000'] += 1
            detailed_stats['less_than_8000'].append(count)
        else:
            categories['more_than_8000'] += 1
            detailed_stats['more_than_8000'].append(count)
    
    return categories, detailed_stats

def get_category_statistics(detailed_stats):
    """
    Calculate statistics for each category.
    
    Args:
        detailed_stats (dict): Dictionary with category names and lists of review counts
        
    Returns:
        dict: Dictionary with category statistics
    """
    stats = {}
    
    for category, counts in detailed_stats.items():
        if counts:
            stats[category] = {
                'count': len(counts),
                'min_reviews': min(counts),
                'max_reviews': max(counts),
                'avg_reviews': sum(counts) / len(counts),
                'total_reviews': sum(counts)
            }
        else:
            stats[category] = {
                'count': 0,
                'min_reviews': 0,
                'max_reviews': 0,
                'avg_reviews': 0,
                'total_reviews': 0
            }
    
    return stats

def analyze_product_review_distribution():
    """
    Main function to analyze the distribution of products by review count.
    """
    reviews_file = "Sports_and_Outdoors.jsonl"
    
    print("=== Product Review Distribution Analysis ===")
    print()
    
    # Step 1: Count reviews per product
    print("Step 1: Counting reviews per product...")
    review_counts = count_reviews_per_product(reviews_file)
    
    if not review_counts:
        print("No data to analyze. Exiting.")
        return
    
    print()
    
    # Step 2: Categorize products
    print("Step 2: Categorizing products by review count...")
    categories, detailed_stats = categorize_products_by_review_count(review_counts)
    
    # Step 3: Calculate statistics
    print("Step 3: Calculating statistics...")
    stats = get_category_statistics(detailed_stats)
    
    # Step 4: Display results
    print("\n" + "=" * 80)
    print("PRODUCT DISTRIBUTION BY REVIEW COUNT")
    print("=" * 80)
    
    total_products = sum(categories.values())
    
    category_labels = {
        'less_than_50': 'Less than 50 reviews',
        'between_50_99': '50-99 reviews',
        'less_than_500': '100-499 reviews',
        'less_than_1000': '500-999 reviews',
        'less_than_2000': '1,000-1,999 reviews',
        'less_than_4000': '2,000-3,999 reviews',
        'less_than_8000': '4,000-7,999 reviews',
        'more_than_8000': '8,000+ reviews'
    }
    
    for category, label in category_labels.items():
        count = categories[category]
        percentage = (count / total_products * 100) if total_products > 0 else 0
        stat = stats[category]
        
        print(f"\n{label}:")
        print(f"  Products: {count:,} ({percentage:.2f}%)")
        if count > 0:
            print(f"  Review range: {stat['min_reviews']:,} - {stat['max_reviews']:,}")
            print(f"  Average reviews per product: {stat['avg_reviews']:.1f}")
            print(f"  Total reviews in category: {stat['total_reviews']:,}")
    
    print(f"\n{'='*80}")
    print(f"SUMMARY:")
    print(f"Total unique products: {total_products:,}")
    print(f"Total reviews analyzed: {sum(review_counts.values()):,}")
    print(f"Average reviews per product: {sum(review_counts.values()) / total_products:.1f}")
    
    # Find products with most reviews
    top_products = sorted(review_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    print(f"\nTop 10 products by review count:")
    for i, (asin, count) in enumerate(top_products, 1):
        print(f"  {i}. {asin}: {count:,} reviews")
    
    # Step 5: Create visualizations
    print("\nStep 4: Creating visualizations...")
    try:
        # Create bar chart
        create_bar_chart(categories, stats)
        
        # Create summary table
        create_summary_table_chart(categories, stats)
        
        # Save results to JSON file
        save_results_to_file(review_counts, categories, stats)
        
    except ImportError as e:
        print(f"Warning: Could not create visualizations. Missing dependency: {e}")
        print("To install matplotlib, run: pip install matplotlib")
        
        # Still save results to JSON file
        save_results_to_file(review_counts, categories, stats)
    except Exception as e:
        print(f"Error creating visualizations: {e}")
        
        # Still save results to JSON file
        save_results_to_file(review_counts, categories, stats)

def create_bar_chart(categories, stats):
    """
    Create a bar chart visualization of the product distribution by review count.
    
    Args:
        categories (dict): Product counts by category
        stats (dict): Detailed statistics per category
    """
    # Define category labels with adjusted bins for better visualization
    category_labels = [
        '1-49',
        '50-99',
        '100-499',
        '500-999', 
        '1,000-1,999',
        '2,000-3,999',
        '4,000-7,999',
        '8,000+'
    ]
    
    category_keys = [
        'less_than_50',
        'between_50_99',
        'less_than_500',
        'less_than_1000',
        'less_than_2000',
        'less_than_4000',
        'less_than_8000',
        'more_than_8000'
    ]
    
    # Get product counts for each category
    product_counts = [categories[key] for key in category_keys]
    
    # Create single subplot with better proportions
    fig, ax = plt.subplots(1, 1, figsize=(12, 8))
    
    # Color scheme - gradient from light to dark blue
    colors = ['#E8F4FD', '#D1E9FC', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1976D2']
    
    # Create bar chart
    bars = ax.bar(range(len(category_labels)), product_counts, color=colors, edgecolor='black', linewidth=0.8)
    ax.set_xlabel('Review Count Categories', fontsize=14, fontweight='bold')
    ax.set_ylabel('Number of Products', fontsize=14, fontweight='bold')
    ax.set_title('Product Distribution by Review Count Categories', fontsize=16, fontweight='bold', pad=20)
    ax.set_xticks(range(len(category_labels)))
    ax.set_xticklabels(category_labels, rotation=45, ha='right', fontsize=12)
    
    # Add value labels on bars
    for bar, count in zip(bars, product_counts):
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + max(product_counts)*0.01,
                f'{count:,}', ha='center', va='bottom', fontsize=11, fontweight='bold')
    

    
    # Format y-axis with commas and add grid
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{int(x):,}'))
    ax.grid(True, alpha=0.3, axis='y')
    ax.set_axisbelow(True)
    
    # Improve layout
    plt.tight_layout()
    
    # Save only as PNG
    chart_filename = 'product_review_distribution_chart.png'
    plt.savefig(chart_filename, dpi=300, bbox_inches='tight', facecolor='white')
    print(f"\nBar chart saved as: {chart_filename}")
    
    # Show the plot
    plt.show()
    
    return fig

def create_summary_table_chart(categories, stats):
    """
    Create a summary table visualization with key statistics.
    
    Args:
        categories (dict): Product counts by category
        stats (dict): Detailed statistics per category
    """
    fig, ax = plt.subplots(figsize=(14, 8))
    ax.axis('tight')
    ax.axis('off')
    
    # Prepare data for table
    category_labels = [
        'Less than 50 reviews',
        '50-99 reviews',
        '100-499 reviews',
        '500-999 reviews', 
        '1,000-1,999 reviews',
        '2,000-3,999 reviews',
        '4,000-7,999 reviews',
        '8,000+ reviews'
    ]
    
    category_keys = [
        'less_than_50',
        'between_50_99',
        'less_than_500',
        'less_than_1000',
        'less_than_2000',
        'less_than_4000',
        'less_than_8000',
        'more_than_8000'
    ]
    
    total_products = sum(categories.values())
    
    table_data = []
    for i, (label, key) in enumerate(zip(category_labels, category_keys)):
        count = categories[key]
        percentage = (count / total_products * 100) if total_products > 0 else 0
        stat = stats[key]
        
        table_data.append([
            label,
            f"{count:,}",
            f"{stat['avg_reviews']:.1f}" if count > 0 else "0",
            f"{stat['total_reviews']:,}"
        ])
    
    # Create table
    table = ax.table(cellText=table_data,
                    colLabels=['Category', 'Product Count', 'Percentage', 'Avg Reviews/Product', 'Total Reviews'],
                    cellLoc='center',
                    loc='center',
                    bbox=[0, 0, 1, 1])
    
    # Style the table
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    table.scale(1, 2)
    
    # Color the header
    for i in range(5):
        table[(0, i)].set_facecolor('#2196F3')
        table[(0, i)].set_text_props(weight='bold', color='white')
    
    # Alternate row colors
    for i in range(1, len(table_data) + 1):
        for j in range(5):
            if i % 2 == 0:
                table[(i, j)].set_facecolor('#F5F5F5')
    
    plt.title('Product Review Distribution Summary Table', 
              fontsize=16, fontweight='bold', pad=20)
    
    # Save the table
    table_filename = 'product_review_distribution_table.png'
    plt.savefig(table_filename, dpi=300, bbox_inches='tight', facecolor='white')
    print(f"Summary table saved as: {table_filename}")
    
    plt.show()
    
    return fig

def save_results_to_file(review_counts, categories, stats):
    """
    Save the analysis results to a JSON file for future reference.
    
    Args:
        review_counts (dict): Review counts per product
        categories (dict): Product counts by category
        stats (dict): Detailed statistics per category
    """
    results = {
        'timestamp': datetime.now().isoformat(),
        'total_products': len(review_counts),
        'total_reviews': sum(review_counts.values()),
        'categories': categories,
        'statistics': stats,
        'top_10_products': dict(sorted(review_counts.items(), key=lambda x: x[1], reverse=True)[:10])
    }
    
    output_file = 'product_review_distribution_results.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nResults saved to: {output_file}")

if __name__ == "__main__":
    analyze_product_review_distribution()
