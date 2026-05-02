import { useState, useEffect } from 'react';
import { Cloud, Sun, Droplets, Thermometer, Sparkles, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { weatherService, type WeatherData, type SkinAdvice } from '../../services/weatherService';

export function WeatherAdaptiveWidget() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [advice, setAdvice] = useState<SkinAdvice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const weatherData = await weatherService.getWeatherData();
      setData(weatherData);
      setAdvice(weatherService.getAdvice(weatherData));
    } catch (err) {
      console.error('Weather error:', err);
      setError('Impossible de récupérer la météo locale.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-gray-50 rounded mb-4"></div>
        <div className="flex gap-2">
          <div className="h-8 bg-gray-100 rounded w-1/4"></div>
          <div className="h-8 bg-gray-100 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (error || !data || !advice) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 text-red-500 mb-2">
          <AlertCircle size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Erreur Météo</span>
        </div>
        <p className="text-xs text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="text-[10px] font-bold text-teal-600 hover:text-teal-700 underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
      {/* Decorative Background */}
      <div className="absolute -right-4 -top-4 text-gray-50 opacity-10 group-hover:scale-110 transition-transform">
        {data.uvIndex > 5 ? <Sun size={120} /> : <Cloud size={120} />}
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Conseil Météo-IA</h3>
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                <MapPin size={8} />
                {data.city}
              </div>
            </div>
          </div>
          <button 
            onClick={fetchData} 
            aria-label="Actualiser les données météo"
            className="p-1.5 text-gray-400 hover:text-teal-600 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="text-xl font-black text-gray-800">{Math.round(data.temp)}°</div>
              <div className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase">
                <Thermometer size={8} /> Temp
              </div>
            </div>
            <div className="w-[1px] bg-gray-100"></div>
            <div className="flex flex-col items-center">
              <div className="text-xl font-black text-gray-800">{data.humidity}%</div>
              <div className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase">
                <Droplets size={8} /> Humid
              </div>
            </div>
            <div className="w-[1px] bg-gray-100"></div>
            <div className="flex flex-col items-center">
              <div className="text-xl font-black text-gray-800">{data.uvIndex}</div>
              <div className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase">
                <Sun size={8} /> UV
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-start gap-3">
            <span className="text-2xl pt-1">{advice.icon}</span>
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-1">{advice.title}</h4>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">{advice.advice}</p>
              <div className="py-1.5 px-3 bg-white rounded-lg border border-teal-100 text-[11px] font-bold text-teal-700 shadow-sm inline-block">
                {advice.recommendation}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
