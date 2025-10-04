import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Check, Palette } from "lucide-react";

export default function ThemeSelector({ selectedThemeId, onThemeSelect }) {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      const { data, error } = await supabase
        .from("themes")
        .select("*")
        .order("is_default", { ascending: false });

      if (error) throw error;
      setThemes(data || []);
    } catch (err) {
      console.error("Error fetching themes:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading themes...</div>;
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-3">
        <Palette className="inline mr-2" size={18} />
        Quiz Theme
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {themes.map((theme) => {
          const isSelected = selectedThemeId === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onThemeSelect(theme.id)}
              className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                isSelected
                  ? "border-purple-600 ring-2 ring-purple-300"
                  : "border-gray-200 hover:border-purple-400"
              }`}
              style={{ height: "120px" }}
            >
              {/* Theme Preview */}
              <div
                className="w-full h-full flex items-center justify-center relative"
                style={{
                  background: theme.background_image_url
                    ? `url(${theme.background_image_url})`
                    : `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {/* Dark overlay for better text readability */}
                <div className="absolute inset-0 bg-black/30"></div>

                {/* Theme Name */}
                <div className="relative z-10 text-center">
                  <p
                    className="text-sm font-semibold drop-shadow-lg"
                    style={{ color: theme.text_color }}
                  >
                    {theme.name}
                  </p>
                  {theme.is_default && (
                    <span className="text-xs bg-white/80 text-gray-800 px-2 py-0.5 rounded mt-1 inline-block">
                      Default
                    </span>
                  )}
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full p-1">
                    <Check size={16} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedThemeId && (
        <div className="mt-3">
          <p className="text-sm text-gray-600">
            Selected theme:{" "}
            <span className="font-semibold">
              {themes.find((t) => t.id === selectedThemeId)?.name}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
