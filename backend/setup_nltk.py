#!/usr/bin/env python3

import sys
import nltk

def install_nltk_data():
    packages = ['punkt', 'stopwords', 'averaged_perceptron_tagger']
    success_count = 0
    
    for package in packages:
        try:
            try:
                if package == 'punkt':
                    nltk.data.find('tokenizers/punkt')
                elif package == 'stopwords':
                    nltk.data.find('corpora/stopwords')
                elif package == 'averaged_perceptron_tagger':
                    nltk.data.find('taggers/averaged_perceptron_tagger')
                print(f"✅ {package} is already installed!")
                success_count += 1
                continue
            except LookupError:
                pass
            
            print(f"🔄 Installing NLTK {package}...")
            
            nltk.download(package, quiet=True)
            print(f"✅ Successfully installed {package}!")
            success_count += 1
            
        except Exception as e:
            print(f"❌ Failed to install {package}: {str(e)}")
    
    return success_count == len(packages)

def verify_installation():
    try:
        from nltk.corpus import stopwords
        from nltk.tokenize import word_tokenize
        from nltk import pos_tag
        
        test_text = "This is a great product with excellent quality."
        tokens = word_tokenize(test_text)
        pos_tags = pos_tag(tokens)
        stop_words = stopwords.words('english')
        
        print("✅ NLTK verification successful!")
        return True
    except Exception as e:
        print(f"❌ NLTK verification failed: {str(e)}")
        return False

def main():
    print("🚀 Setting up NLTK for the Word Cloud feature...")
    print("=" * 50)
    
    try:
        import nltk
        print("✅ NLTK is installed")
    except ImportError:
        print("❌ NLTK is not installed. Please run: pip install -r requirements.txt")
        sys.exit(1)
    
    success = install_nltk_data()
    
    if success:
        verify_success = verify_installation()
        
        print("=" * 50)
        if verify_success:
            print("🎉 Setup completed successfully!")
            print("You can now use the word cloud feature with NLTK processing.")
        else:
            print("⚠️  Setup incomplete. NLTK verification failed.")
            sys.exit(1)
    else:
        print("=" * 50)
        print("⚠️  Setup incomplete. Some NLTK packages failed to install.")
        print("Please try running: python -c \"import nltk; nltk.download(['punkt', 'stopwords', 'averaged_perceptron_tagger'])\"")
        sys.exit(1)

if __name__ == "__main__":
    main() 