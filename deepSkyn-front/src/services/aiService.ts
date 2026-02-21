// AI Service pour vérification d'identité
export interface AIVerificationResult {
  verified: boolean;
  score: number;
  details: {
    photoQuality: number;
    nameConsistency: number;
    emailTrust: number;
    overallScore: number;
  };
  message: string;
}

export interface PhotoAnalysis {
  quality: number;
  hasFace: boolean;
  brightness: number;
  clarity: number;
}

class AIService {
  // Analyser la photo de profil
  async analyzePhoto(photoUrl?: string): Promise<PhotoAnalysis> {
    if (!photoUrl) {
      return { quality: 0.1, hasFace: false, brightness: 0.5, clarity: 0.4 };
    }

    await new Promise(resolve => setTimeout(resolve, 800));

    const isGooglePhoto = photoUrl.includes('googleusercontent.com');
    
    // Demander une résolution plus haute pour mieux analyser
    const highResUrl = photoUrl.replace('=s96-c', '=s400-c').replace('=s96', '=s400');
    
    // Tenter de fetch l'image pour voir si c'est une vraie photo
    let isRealPhoto = false;
    
    if (isGooglePhoto) {
      try {
        const response = await fetch(highResUrl, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        
        // Avatar lettre = fichier très petit (~2-5KB)
        // Vraie photo = fichier plus grand (>10KB)
        const fileSize = parseInt(contentLength || '0');
        isRealPhoto = fileSize > 8000; // > 8KB = vraie photo
        
        console.log(`� Taille image: ${fileSize} bytes → ${isRealPhoto ? 'VRAIE PHOTO' : 'AVATAR'}`);
      } catch (e) {
        // Si fetch échoue (CORS), fallback sur l'URL
        console.log('⚠️ Fetch bloqué par CORS, fallback URL analysis');
        isRealPhoto = false;
      }
    }

    let quality = 0.3;
    let hasFace = false;

    if (isGooglePhoto && isRealPhoto) {
      quality = 0.9;
      hasFace = true;
    } else if (isGooglePhoto && !isRealPhoto) {
      quality = 0.2;
      hasFace = false;
    } else if (photoUrl.startsWith('https://')) {
      quality = 0.6;
      hasFace = Math.random() > 0.5;
    }

    console.log(`🎭 isRealPhoto: ${isRealPhoto}, quality=${quality}, hasFace=${hasFace}`);

    return {
      quality,
      hasFace,
      brightness: 0.7,
      clarity: quality > 0.7 ? 0.8 : 0.5,
    };
  }

  // Vérifier cohérence nom/photo
  async verifyNamePhotoConsistency(name: string, photoAnalysis: PhotoAnalysis): Promise<number> {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simuler vérification AI
      const nameLength = name.length;
      const hasFirstName = name.split(' ').length >= 2;
      const photoQuality = photoAnalysis.quality;
      
      // Score basé sur la cohérence
      let consistencyScore = 0.5;
      
      if (hasFirstName && nameLength >= 4) consistencyScore += 0.2;
      if (photoQuality > 0.7) consistencyScore += 0.2;
      if (photoAnalysis.hasFace) consistencyScore += 0.1;
      
      return Math.min(consistencyScore, 1.0);
    } catch (error) {
      console.error('Name-photo consistency check failed:', error);
      return 0.3;
    }
  }

  // Analyser la confiance de l'email
  analyzeEmailTrust(email: string): number {
    try {
      if (!email || typeof email !== 'string') {
        return 0.3;
      }
      
      const domain = email.split('@')[1];
      
      if (!domain) {
        return 0.2;
      }
      
      // Domaines de confiance
      const trustedDomains = [
        'gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com',
        'protonmail.com', 'tutanota.com', 'zoho.com'
      ];
      
      // Domaines d'entreprise
      const businessDomains = [
        'company.com', 'corp.com', 'tech.com', 'studio.com'
      ];
      
      let trustScore = 0.5; // Base score
      
      if (trustedDomains.includes(domain)) trustScore += 0.3;
      if (businessDomains.some(bd => domain.includes(bd))) trustScore += 0.2;
      
      // Vérifier format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email)) trustScore += 0.1;
      
      // Pénaliser les emails suspects
      if (domain.includes('temp') || domain.includes('fake') || domain.includes('10minutemail')) {
        trustScore -= 0.3;
      }
      
      return Math.max(0.1, Math.min(trustScore, 1.0));
    } catch (error) {
      console.error('Email trust analysis failed:', error);
      return 0.3;
    }
  }

  // Calculer score de confiance global
  calculateTrustScore(user: {
    name: string;
    email: string;
    picture?: string;
    photoAnalysis?: PhotoAnalysis;
  }): number {
    try {
      const emailTrust = this.analyzeEmailTrust(user.email);
      const photoQuality = user.photoAnalysis?.quality || 0.5;
      const nameLength = user.name.length;
      const hasValidName = nameLength >= 3 && user.name.split(' ').length >= 2;
      
      // Critères strictes additionnels
      const hasPhoto = !!user.picture;
      const photoAnalysis = user.photoAnalysis;
      const hasFaceDetection = photoAnalysis?.hasFace || false;
      const photoBrightnessScore = photoAnalysis?.brightness || 0;
      
      // Vérifications ULTRA strictes
      const isRealPerson = hasFaceDetection && photoBrightnessScore > 0.3 && photoQuality > 0.6;
      const hasQualityPhoto = hasPhoto && photoQuality > 0.8; // Augmenté à 80%
      const isProfessionalEmail = emailTrust > 0.85; // Augmenté à 85%
      const isCompleteProfile = hasValidName && hasPhoto && user.email;
      
      // Nouveaux critères anti-avatar
      const isLikelyAvatar = hasPhoto && (!hasFaceDetection || photoQuality < 0.6);
      const isDefaultPhoto = user.picture?.includes('default') || user.picture?.includes('avatar') || user.picture?.includes('placeholder');
      
      // Nouvelles pondérations plus strictes
      const weights = {
        email: 0.20, // Réduit
        photo: 0.40, // Augmenté
        name: 0.10,  // Réduit
        completeness: 0.15,
        authenticity: 0.15, // Augmenté
      };
      
      let score = 0;
      score += emailTrust * weights.email;
      score += photoQuality * weights.photo;
      score += (hasValidName ? 0.7 : 0.1) * weights.name; // Plus sévère
      score += (isCompleteProfile ? 1.0 : 0.2) * weights.completeness;
      score += (isRealPerson ? 1.0 : 0.05) * weights.authenticity; // Très sévère
      
      // Pénalités TRÈS strictes
      if (!hasPhoto) score -= 0.3; // Augmenté
      if (isLikelyAvatar) score -= 0.25; // Nouvelle pénalité avatar
      if (isDefaultPhoto) score -= 0.4; // Pénalité forte pour photos par défaut
      if (!hasFaceDetection && hasPhoto) score -= 0.2; // Augmenté
      if (photoQuality < 0.5) score -= 0.15; // Augmenté
      
      // Bonus uniquement pour profils EXCEPTIONNELS
      if (hasQualityPhoto && isProfessionalEmail && hasFaceDetection && photoQuality > 0.9) {
        score += 0.05; // Bonus réduit
      }
      
      // Plafonner strictement les comptes sans vraie photo
      if (!hasFaceDetection || photoQuality < 0.7) {
        console.log(`🚫 Avatar détecté - Plafond 65%: hasFace=${hasFaceDetection}, quality=${photoQuality}`);
        score = Math.min(score, 0.65); // Max 65% pour avatars/photos douteuses
      }
      
      return Math.max(0.1, Math.min(score, 1.0));
    } catch (error) {
      console.error('Trust score calculation failed:', error);
      return 0.3;
    }
  }

  // Vérification complète d'identité
  async verifyIdentity(user: {
    name: string;
    email: string;
    picture?: string;
  }): Promise<AIVerificationResult> {
    try {
      // 1. Analyser la photo
      const photoAnalysis = await this.analyzePhoto(user.picture);
      
      // 2. Vérifier cohérence nom/photo
      const nameConsistency = await this.verifyNamePhotoConsistency(user.name, photoAnalysis);
      
      // 3. Analyser la confiance de l'email
      const emailTrust = this.analyzeEmailTrust(user.email);
      
      // 4. Calculer score global
      const overallScore = this.calculateTrustScore({
        ...user,
        photoAnalysis,
      });
      
      // 5. Déterminer si vérifié
      const verified = overallScore >= 0.6;
      
      // 6. Générer message
      let message = '';
      if (verified) {
        message = overallScore >= 0.8 
          ? 'Identité vérifiée avec haute confiance' 
          : 'Identité vérifiée avec confiance moyenne';
      } else {
        if (photoAnalysis.quality < 0.5) {
          message = 'Photo de profil de faible qualité';
        } else if (emailTrust < 0.5) {
          message = 'Adresse email suspecte';
        } else {
          message = 'Informations insuffisantes pour vérifier l\'identité';
        }
      }
      
      return {
        verified,
        score: overallScore, // ← utiliser celui-ci avec pénalités anti-avatar
        details: {
          photoQuality: photoAnalysis.quality,
          nameConsistency,
          emailTrust,
          overallScore,
        },
        message,
      };
    } catch (error) {
      console.error('Identity verification failed:', error);
      return {
        verified: false,
        score: 0.2,
        details: {
          photoQuality: 0.3,
          nameConsistency: 0.3,
          emailTrust: 0.3,
          overallScore: 0.2,
        },
        message: 'Erreur lors de la vérification d\'identité',
      };
    }
  }
  
  // Calculate overall trust score with dynamic photo weighting
  static calculateOverallScore(photoAnalysis: PhotoAnalysis, emailAnalysis: { score: number }): number {
    // Dynamic weighting based on photo quality
    let photoWeight = 0.4;
    let emailWeight = 0.6;
    
    // If photo is real and high quality, give it more weight
    if (photoAnalysis.quality >= 0.8) {
      photoWeight = 0.5;
      emailWeight = 0.5;
    }
    // If photo is missing or default, reduce its weight
    else if (photoAnalysis.quality < 0.5) {
      photoWeight = 0.2;
      emailWeight = 0.8;
    }
    
    const overallScore = (photoAnalysis.quality * photoWeight) + (emailAnalysis.score * emailWeight);
    
    console.log(`📊 Score calculation: Photo(${photoAnalysis.quality.toFixed(2)} × ${photoWeight}) + Email(${emailAnalysis.score.toFixed(2)} × ${emailWeight}) = ${overallScore.toFixed(2)}`);
    
    return Math.min(overallScore, 1.0);
  }
}

export const aiService = new AIService();
