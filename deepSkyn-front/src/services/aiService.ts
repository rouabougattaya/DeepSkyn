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

        if (!response.ok || response.status === 429) {
          // Rate limited — fallback : on assume que c'est une vraie photo car c'est un compte Google
          console.log(`⚠️ Google CDN status ${response.status}, assuming real photo for Google account`);
          isRealPhoto = true;
        } else {
          const contentLength = response.headers.get('content-length');
          const fileSize = parseInt(contentLength || '0');

          // Les avatars par défaut font souvent < 4-6KB. Les vraies photos font généralement > 8KB.
          isRealPhoto = fileSize > 6000;

          console.log(`📏 Taille image: ${fileSize} bytes → ${isRealPhoto ? 'PROBABLE PHOTO' : 'AVATAR'}`);
        }
      } catch (e) {
        // Fallback si fetch bloqué (CORS) - on fait confiance à Google
        isRealPhoto = true;
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
      const email = user.email || '';
      const name = user.name || 'User';
      const emailTrust = this.analyzeEmailTrust(email);
      const photoQuality = user.photoAnalysis?.quality || 0.5;
      const nameLength = name.length;
      const hasValidName = nameLength >= 3 && name.split(' ').length >= 2;

      // Critères strictes additionnels
      const hasPhoto = !!user.picture;
      const photoAnalysis = user.photoAnalysis;
      const hasFaceDetection = photoAnalysis?.hasFace || false;
      const photoBrightnessScore = photoAnalysis?.brightness || 0;

      // Vérifications ULTRA strictes
      const isRealPerson = hasFaceDetection && photoBrightnessScore > 0.3 && photoQuality > 0.6;
      const isCompleteProfile = hasValidName && hasPhoto && !!user.email;

      // Nouveaux critères anti-avatar
      const isLikelyAvatar = hasPhoto && (!hasFaceDetection || photoQuality < 0.6);
      const isDefaultPhoto = user.picture?.includes('default') || user.picture?.includes('avatar') || user.picture?.includes('placeholder');

      // Nouvelles pondérations plus équilibrées
      const weights = {
        email: 0.25,
        photo: 0.35,
        name: 0.15,
        completeness: 0.15,
        authenticity: 0.10,
      };

      let score = 0;
      score += emailTrust * weights.email;
      score += photoQuality * weights.photo;
      score += (hasValidName ? 1.0 : 0.4) * weights.name;
      score += (isCompleteProfile ? 1.0 : 0.3) * weights.completeness;
      score += (isRealPerson ? 1.0 : 0.2) * weights.authenticity;

      // Pénalités ciblées
      if (!hasPhoto) score -= 0.15; // Moins sévère
      if (isLikelyAvatar) score -= 0.1;
      if (isDefaultPhoto) score -= 0.2;

      // Plafonner la détection d'avatar mais de manière plus souple
      if (hasPhoto && !hasFaceDetection) {
        score = Math.min(score, 0.45); // Max 45% pour photos sans visage détecté
      } else if (!hasPhoto) {
        score = Math.min(score, 0.25); // Max 25% sans photo du tout
      }

      console.log(`📊 Resulting AI Score: ${score.toFixed(4)} (EmailTrust: ${emailTrust.toFixed(2)}, PhotoQual: ${photoQuality.toFixed(2)})`);

      return Math.max(0.05, Math.min(score, 1.0)); // Plancher à 5%
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
