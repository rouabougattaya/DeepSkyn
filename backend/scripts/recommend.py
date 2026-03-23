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

    if not os.path.exists(DATA_PATH):
        print(json.dumps({"error": f"Dataset not found at {DATA_PATH}"}))
        return

    try:
        # 1. Chargement et nettoyage
        df = pd.read_csv(DATA_PATH)
        df = df.dropna(subset=['clean_ingreds', 'price'])
        df['price'] = df['price'].replace('[^0-9.]', '', regex=True)
        df['price'] = pd.to_numeric(df['price'], errors='coerce')
        df = df.dropna(subset=['price'])

        # 2. Inférence du type de peau (même logique que le modèle utilisateur)
        df['skin_type'] = df['clean_ingreds'].apply(lambda x: infer_skin_type(str(x).split(', ')))

        # 3. Vectorisation TF-IDF
        vectorizer = TfidfVectorizer(max_features=500)
        X_text = vectorizer.fit_transform(df['clean_ingreds'])
        
        # 4. Clustering (KMeans)
        # On refait le clustering pour trouver les produits similaires dans le même groupe
        kmeans = KMeans(n_clusters=5, random_state=42)
        df['cluster'] = kmeans.fit_predict(X_text)

        # 5. Filtrage et Recommandation "Smart"
        # On cherche des produits du même type de peau et du même cluster dominant pour ce type
        filtered = df[df['skin_type'] == target_skin_type]
        
        if filtered.empty:
            # Fallback : on prend tous les produits si le type exact n'est pas trouvé
            filtered = df
            
        # On retourne les 5 meilleurs produits (par exemple les 5 premiers du cluster majoritaire du type de peau)
        # Ou simplement les 5 premiers filtrés si on veut rester simple
        results = filtered.head(5).to_dict(orient='records')
        
        # Conversion pour JSON
        final_results = []
        for r in results:
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
