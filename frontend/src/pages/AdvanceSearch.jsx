import React, { useState } from "react";

const AdvancedSearch = () => {
  const [formData, setFormData] = useState({
    temp: "",
    lumin: "",
    magni: "",
    color: "",
    spect: "",
    radii: ""
  });
  const [searchedContent, setSearchedContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleInputChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setShowResults(true);
    setSearchedContent("Analyzing stellar parameters...");

    try {
      setTimeout(() => {
        const parameterSummary = Object.entries(formData)
          .filter(([_, value]) => value.trim() !== "")
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        
        setSearchedContent(`Advanced search completed!\n\nSearch parameters: ${parameterSummary}\n\nThis is a demonstration of the improved UI. In your actual implementation, uncomment the axios import and API call to get real results from your backend.`);
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('API Error:', error);
      setSearchedContent("Unable to process stellar search. Please ensure your backend server is running on http://localhost:8080");
      setIsLoading(false);
    }
  };

  const inputFields = [
    {
      label: "Temperature",
      field: "temp",
      placeholder: "Temperature in Kelvin (e.g., 5778)",
      type: "number",
      icon: "🌡️",
      description: "Surface temperature of the star"
    },
    {
      label: "Relative Luminosity",
      field: "lumin",
      placeholder: "Relative to Sun (e.g., 1.0)",
      type: "number",
      step: "0.01",
      icon: "✨",
      description: "Brightness relative to our Sun"
    },
    {
      label: "Absolute Magnitude",
      field: "magni",
      placeholder: "Absolute magnitude (e.g., 4.83)",
      type: "number",
      step: "0.01",
      icon: "🔆",
      description: "Intrinsic brightness of the star"
    },
    {
      label: "Color Index",
      field: "color",
      placeholder: "Color classification (1-6)",
      type: "number",
      min: 1,
      max: 6,
      icon: "🎨",
      description: "Color classification: 1=Blue, 2=Blue-White, 3=White, 4=Yellow, 5=Orange, 6=Red"
    },
    {
      label: "Spectral Class",
      field: "spect",
      placeholder: "Spectral class (1-6)",
      type: "number",
      min: 1,
      max: 6,
      icon: "📊",
      description: "Spectral classification: 1=O, 2=B, 3=A, 4=F, 5=G, 6=K/M"
    },
    {
      label: "Stellar Radius",
      field: "radii",
      placeholder: "Radius in solar radii (e.g., 1.0)",
      type: "number",
      step: "0.01",
      icon: "⭕",
      description: "Radius relative to our Sun"
    }
  ];

  const isFormValid = Object.values(formData).every(value => value.trim() !== "");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">

      <div className="bg-black/20 backdrop-blur-sm border-b border-purple-500/20 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-yellow-400 flex items-center space-x-2">
              <span>🔬</span>
              <span>Advanced Stellar Search</span>
            </h1>
            <a 
              href="/" 
              className="text-cyan-300 hover:text-white transition-colors duration-300 px-4 py-2 rounded-lg hover:bg-white/10 flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Simple Search</span>
            </a>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-purple-500/20 shadow-2xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">🌟 Stellar Parameter Search</h2>
            <p className="text-gray-300 leading-relaxed">
              Search for stars based on their physical characteristics. Enter precise values for temperature, 
              luminosity, magnitude, color, spectral class, and radius to find matching celestial objects in our database.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-purple-500/20 shadow-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {inputFields.map((field) => (
                <div key={field.field} className="space-y-3">
                  <label className="flex items-center space-x-2 text-white font-medium">
                    <span className="text-xl">{field.icon}</span>
                    <span>{field.label}</span>
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formData[field.field]}
                    onChange={handleInputChange(field.field)}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    required
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-cyan-400/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300"
                  />
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {field.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={!isFormValid || isLoading}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg flex items-center space-x-3 min-w-fit"
              >
                <span className="text-xl">🔍</span>
                <span>{isLoading ? 'Searching Cosmos...' : 'Search Stars'}</span>
              </button>
            </div>
          </div>

          {showResults && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-purple-500/20 shadow-2xl p-6 mt-8 animate-fade-in">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <span>📋</span>
                <span>Search Results</span>
              </h3>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl border border-purple-400/20 p-6 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center space-x-3 text-cyan-300">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                    <span>Analyzing stellar parameters across the cosmos...</span>
                  </div>
                ) : (
                  <div className="text-gray-100 whitespace-pre-wrap leading-relaxed">
                    {searchedContent}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-purple-500/20 p-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center space-x-2">
                <span>📚</span>
                <span>Spectral Classes</span>
              </h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div><span className="text-blue-400">1 - O:</span> Very hot, blue stars</div>
                <div><span className="text-blue-300">2 - B:</span> Hot, blue-white stars</div>
                <div><span className="text-white">3 - A:</span> White stars</div>
                <div><span className="text-yellow-200">4 - F:</span> Yellow-white stars</div>
                <div><span className="text-yellow-400">5 - G:</span> Yellow stars (like our Sun)</div>
                <div><span className="text-red-400">6 - K/M:</span> Cool, red stars</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-purple-500/20 p-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center space-x-2">
                <span>🎨</span>
                <span>Color Classifications</span>
              </h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div><span className="text-blue-400">1:</span> Blue stars</div>
                <div><span className="text-blue-300">2:</span> Blue-white stars</div>
                <div><span className="text-white">3:</span> White stars</div>
                <div><span className="text-yellow-400">4:</span> Yellow stars</div>
                <div><span className="text-orange-400">5:</span> Orange stars</div>
                <div><span className="text-red-400">6:</span> Red stars</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .container {
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          max-width: 1200px;
        }
      `}</style>
    </div>
  );
};

export default AdvancedSearch;