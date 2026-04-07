import sys
import os
import json
import warnings

# Supprimer les warnings (sklearn, pandas, etc.) pour ne pas polluer le STDOUT
warnings.filterwarnings("ignore")
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from scipy.sparse import hstack, csr_matrix

# Configuration des chemins
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, '..', 'data', 'skincare_products_clean.csv')

def infer_skin_type(ingredients_list):
    dry_keywords = ['butyrospermum', 'beurre', 'ceramide', 'glycerin', 'phytosphingosine', 'shorea', 'borago']
    oily_keywords = ['capric triglyceride', 'dimethicone', 'polydecene', 'cetearyl ethylhexanoate', 'non-comedogenic']
    sensitive_keywords = ['allantoin', 'pelargonium', 'chamomilla', 'calendula', 'panthenol', 'niacinamide', 'asiaticoside']

    if not isinstance(ingredients_list, list):
        return 'Normal'
        
    dry_count = sum(any(k.lower() in str(i).lower() for k in dry_keywords) for i in ingredients_list)
    oily_count = sum(any(k.lower() in str(i).lower() for k in oily_keywords) for i in ingredients_list)
    sensitive_count = sum(any(k.lower() in str(i).lower() for k in sensitive_keywords) for i in ingredients_list)

    counts = {'Dry': dry_count, 'Oily': oily_count, 'Sensitive': sensitive_count}
    # Si tout est à 0, c'est une peau normale
    if max(counts.values()) == 0:
        return 'Normal'
    return max(counts, key=counts.get)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing target skin type"}))
        return

    target_skin_type = sys.argv[1].capitalize() # e.g. "Dry", "Oily", "Sensitive"
    target_concerns = []
    if len(sys.argv) > 2:
        # Expected format: "acne,wrinkles,pores"
        target_concerns = [c.strip().lower() for c in sys.argv[2].split(',') if c.strip()]

    if not os.path.exists(DATA_PATH):
        print(json.dumps({"error": f"Dataset not found at {DATA_PATH}"}))
        return

    try:
        # 1. Chargement et nettoyage
        df = pd.read_csv(DATA_PATH)
        df = df.dropna(subset=['clean_ingreds', 'price'])
        
        # Ensure product_type exists
        if 'product_type' not in df.columns:
            df['product_type'] = 'Skincare'

        df['price'] = df['price'].replace('[^0-9.]', '', regex=True)
        df['price'] = pd.to_numeric(df['price'], errors='coerce')
        df = df.dropna(subset=['price'])

        # 2. Inférence du type de peau
        df['skin_type'] = df['clean_ingreds'].apply(lambda x: infer_skin_type(str(x).split(', ')))

        # 3. Filtrage par type de peau (ou universel)
        filtered = df[(df['skin_type'] == target_skin_type) | (df['skin_type'] == 'Normal')]
        if filtered.empty:
            filtered = df

        # 4. Scoring basé sur les préoccupations (Concerns)
        def calculate_relevance(row):
            score = 0
            ingredients = str(row['clean_ingreds']).lower()
            product_name = str(row['product_name']).lower()
            
            mapping = {
                'acne': ['salicylic', 'benzoyl', 'tea tree', 'niacinamide', 'zinc'],
                'wrinkles': ['retinol', 'peptide', 'collagen', 'hyaluronic'],
                'aging': ['retinol', 'peptide', 'collagen', 'antioxidant'],
                'dark_spots': ['vitamin c', 'niacinamide', 'glycolic', 'kojic'],
                'redness': ['centella', 'panthenol', 'allantoin', 'madecassoside'],
                'pores': ['salicylic', 'clay', 'charcoal'],
                'dryness': ['ceramide', 'glycerin', 'squalane', 'shea butter']
            }

            for concern in target_concerns:
                if concern in product_name:
                    score += 10 # Forte correspondance au nom
                
                keywords = mapping.get(concern, [])
                for kw in keywords:
                    if kw in ingredients:
                        score += 3
            return score

        filtered['score'] = filtered.apply(calculate_relevance, axis=1)

        # 5. Diversification
        # Mélanger pour éviter d'avoir toujours les mêmes produits si les scores sont identiques
        filtered = filtered.sample(frac=1, random_state=None).sort_values(by='score', ascending=False)

        # Prendre un produit de chaque type principal pour une routine complète
        final_list = []
        types_to_find = ['Cleanser', 'Moisturiser', 'Serum', 'Treatment', 'Sunscreen']
        
        for t in types_to_find:
            match = filtered[filtered['product_type'].str.contains(t, case=False, na=False)]
            if not match.empty:
                final_list.append(match.iloc[0])

        # Compléter si on a moins de 6 produits
        already_named = [p['product_name'] for p in final_list]
        remaining = filtered[~filtered['product_name'].isin(already_named)]
        if len(final_list) < 6:
            extra = remaining.head(6 - len(final_list))
            for _, row in extra.iterrows():
                final_list.append(row)

        # conversion JSON
        final_results = []
        for r in final_list[:10]:
            final_results.append({
                "name": r.get('product_name', 'Unknown'),
                "type": r.get('product_type', 'Skincare'),
                "price": float(r.get('price', 0)),
                "skinType": r.get('skin_type', 'Any'),
                "url": r.get('product_url', '#')
            })

        print(json.dumps(final_results))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()

        print(json.dumps(final_results))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
