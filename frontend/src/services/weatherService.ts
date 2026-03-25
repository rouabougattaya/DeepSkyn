import axios from 'axios';

export interface WeatherData {
  temp: number;
  humidity: number;
  uvIndex: number;
  city: string;
}

export interface SkinAdvice {
  title: string;
  advice: string;
  recommendation: string;
  icon: string;
}

export const weatherService = {
  async getWeatherData(): Promise<WeatherData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use Open-Meteo for weather and UV index (Free, no API key)
          const weatherRes = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,is_day&daily=uv_index_max&timezone=auto`
          );
          
          const current = weatherRes.data.current;
          const uvIndex = weatherRes.data.daily.uv_index_max[0];
          
          // Reverse geocoding to get city name (optional, using a free service)
          let city = 'Votre position';
          try {
            const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            city = geoRes.data.address.city || geoRes.data.address.town || geoRes.data.address.village || city;
          } catch (e) {
            console.warn('Geocoding failed');
          }

          resolve({
            temp: current.temperature_2m,
            humidity: current.relative_humidity_2m,
            uvIndex: uvIndex,
            city: city
          });
        } catch (error) {
          reject(error);
        }
      }, (_error) => {
        // Fallback for demo if geolocation is denied
        resolve({
          temp: 22,
          humidity: 45,
          uvIndex: 4,
          city: 'Paris (Démo)'
        });
      });
    });
  },

  getAdvice(data: WeatherData): SkinAdvice {
    const { temp, humidity, uvIndex } = data;
    
    if (uvIndex > 5) {
      return {
        title: "Alerte UV Élevée",
        advice: `L'indice UV est de ${uvIndex}. Risque élevé de dommages cutanés et taches brunes.`,
        recommendation: "Appliquez impérativement un SPF 50+ toutes les 2 heures.",
        icon: "☀️"
      };
    }
    
    if (humidity < 35) {
      return {
        title: "Air Sec Détecté",
        advice: `L'humidité est très basse (${humidity}%). Votre barrière cutanée risque de se fragiliser.`,
        recommendation: "Utilisez un sérum à l'Acide Hyaluronique et un brumisateur.",
        icon: "💧"
      };
    }

    if (temp < 10) {
      return {
        title: "Protection Froid",
        advice: `Il fait froid (${temp}°C). La micro-circulation ralentit et la peau tiraille.`,
        recommendation: "Privilégiez une crème riche aux Céramides pour sceller l'hydratation.",
        icon: "❄️"
      };
    }

    if (temp > 28) {
      return {
        title: "Chaleur Intense",
        advice: `Température élevée (${temp}°C). Production de sébum accrue et pores dilatés.`,
        recommendation: "Utilisez un nettoyant doux et un gel hydratant non-comédogène.",
        icon: "🔥"
      };
    }

    return {
      title: "Conditions Optimales",
      advice: "Le temps est clément pour votre peau aujourd'hui.",
      recommendation: "Maintenez votre routine habituelle avec un nettoyage doux.",
      icon: "✨"
    };
  }
};
