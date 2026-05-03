import React from 'react';

interface AiResponseFormatterProps {
  response: string;
}

/**
 * Composant pour formater les réponses de l'IA avec une esthétique premium
 */
const AiResponseFormatter: React.FC<AiResponseFormatterProps> = ({ response }) => {
  // Fonction pour formater le texte (gras, listes, badges)
  const formatText = (text: string) => {
    // 1. Remplacer les points par des sauts de ligne si c'est une liste
    let formatted = text.split('\n').map((line, index) => {
      const lineKey = `line-${index}-${line.substring(0, 10)}`;
      
      // Détection des titres ou sections (ex: "Conseils :")
      if (line.includes(':') && line.length < 50) {
        return (
          <h4 key={lineKey} className="text-primary font-bold mt-4 mb-2">
            {line}
          </h4>
        );
      }

      // Détection des listes à puces
      if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        return (
          <li key={lineKey} className="ml-4 mb-1 list-disc text-gray-700">
            {line.trim().substring(1).trim()}
          </li>
        );
      }

      // Texte normal avec support basique du gras (**texte**)
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={lineKey} className="mb-2 text-gray-800 leading-relaxed">
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              const partKey = `part-${i}-${part.substring(2, 7)}`;
              return (
                <strong key={partKey} className="text-secondary font-semibold">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });

    return formatted;
  };

  return (
    <div className="ai-response-container p-4 bg-white rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-gradient-to-tr from-primary to-secondary rounded-full flex items-center justify-center text-white mr-3">
          <span className="text-xs font-bold">AI</span>
        </div>
        <span className="text-sm font-medium text-gray-500">Expert DeepSkyn</span>
      </div>
      
      <div className="ai-content-body">
        {formatText(response)}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400 italic">
        <span>* Analyse basée sur votre dernier scan cutané.</span>
        <div className="flex space-x-2">
          <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">Hydratation</span>
          <span className="px-2 py-0.5 bg-green-50 text-green-500 rounded-full">Précision</span>
        </div>
      </div>
    </div>
  );
};

export default AiResponseFormatter;
