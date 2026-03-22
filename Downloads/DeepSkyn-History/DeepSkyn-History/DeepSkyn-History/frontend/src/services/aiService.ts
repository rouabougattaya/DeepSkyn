// AI Service pour vérification d'identité
export interface AIVerificationResult {
  verified: boolean;
  score: number;
  details: {
    photoQuality: number;
    nameConsistency: number;
    emailTrust: number;
    bioStatus: number;
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

      const domain = email.split('@')[1]?.toLowerCase();

      if (!domain) {
        return 0.2;
      }

      // Domaines de confiance
      const trustedDomains = [
        'gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com',
        'protonmail.com', 'tutanota.com', 'zoho.com'
      ];

      let trustScore = 0.5; // Base score

      // Règle spécifique : @gmail.com est le plus fiable
      if (domain === 'gmail.com') {
        trustScore += 0.4;
      } else if (trustedDomains.includes(domain)) {
        trustScore += 0.2;
      } else {
        // Autres domaines diminuent le score comme demandé
        trustScore -= 0.15;
      }

      // Vérifier format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email)) trustScore += 0.1;

      // Pénaliser les emails suspects
      if (domain.includes('temp') || domain.includes('fake') || domain.includes('10minutemail')) {
        trustScore = 0.1;
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
    bio?: string;
    picture?: string;
    photoAnalysis?: PhotoAnalysis;
    googleName?: string;
  }): { score: number, bioStatus: number } {
    try {
      const email = user.email || '';
      const name = user.name || 'User';
      const bio = user.bio || '';
      const emailTrust = this.analyzeEmailTrust(email);
      const photoQuality = user.photoAnalysis?.quality || 0.5;

      const nameParts = name.toLowerCase().split(/\s+/).filter(p => p.length > 1);
      const emailHandle = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ' ');

      // 1. Cohérence Nom vs Email Prefix
      let nameEmailConsistency = 0.4;
      if (nameParts.length > 0) {
        const matches = nameParts.filter(part => emailHandle.includes(part));
        if (matches.length > 0) {
          nameEmailConsistency = 0.5 + (matches.length / nameParts.length) * 0.5;
        }
      }

      // 2. Comparaison avec le nom Google
      let nameGoogleMatch = 1.0;
      if (user.googleName) {
        const profileName = name.toLowerCase().trim();
        const gName = user.googleName.toLowerCase().trim();

        if (profileName !== gName) {
          const gParts = gName.split(/\s+/);
          const hasCommonPart = nameParts.some(p => gParts.includes(p));
          nameGoogleMatch = hasCommonPart ? 0.5 : 0.1;
        }
      }

      const nameConsistency = user.googleName
        ? (nameGoogleMatch * 0.7 + nameEmailConsistency * 0.3)
        : nameEmailConsistency;

      // 3. Vérification de la BIO
      const hasBio = bio.trim().length > 10;
      const bioStatus = hasBio ? 1.0 : 0.0;
      const bioPenalty = hasBio ? 0 : 0.15;

      // Critères de photo et complétude
      const hasPhoto = !!user.picture;
      const photoAnalysis = user.photoAnalysis;
      const hasFaceDetection = photoAnalysis?.hasFace || false;
      const isRealPerson = hasFaceDetection && photoQuality > 0.6;
      const isCompleteProfile = nameParts.length >= 2 && hasPhoto && !!user.email && hasBio;

      // Pondérations PLUS STRICTES
      const weights = {
        email: 0.25,
        photo: 0.25,
        nameConsistency: 0.35,
        completeness: 0.15
      };

      let score = 0;
      score += emailTrust * weights.email;
      score += (hasPhoto ? photoQuality : 0.1) * weights.photo;
      score += nameConsistency * weights.nameConsistency;
      score += (isCompleteProfile ? 1.0 : 0.2) * weights.completeness;

      // Bonus/Malus
      if (isRealPerson) score += 0.05;
      if (hasPhoto && !hasFaceDetection) score -= 0.2;
      score -= bioPenalty;

      const finalScore = Math.max(0.01, Math.min(score, 1.0));

      console.log(`📊 AI Score Final: ${finalScore.toFixed(4)} | Bio: ${bioStatus} | Name: ${nameConsistency.toFixed(2)}`);

      return { score: finalScore, bioStatus };
    } catch (error) {
      console.error('Trust score calculation failed:', error);
      return { score: 0.3, bioStatus: 0 };
    }
  }

  // Vérification complète d'identité
  async verifyIdentity(user: {
    name: string;
    email: string;
    bio?: string;
    picture?: string;
    googleName?: string;
  }): Promise<AIVerificationResult> {
    try {
      // 1. Analyser la photo
      const photoAnalysis = await this.analyzePhoto(user.picture);

      // 2. Vérifier cohérence nom/photo
      const nameConsistency = await this.verifyNamePhotoConsistency(user.name, photoAnalysis);

      // 3. Analyser la confiance de l'email
      const emailTrust = this.analyzeEmailTrust(user.email);

      // 4. Calculer score global
      const { score: overallScore, bioStatus } = this.calculateTrustScore({
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
          bioStatus,
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
          bioStatus: 0.3,
          overallScore: 0.2,
        },
        message: 'Identity verification error',
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
