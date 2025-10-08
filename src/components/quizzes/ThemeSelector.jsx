import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { uploadImage } from "../../utils/mediaUpload";
import { Check, Palette, ImagePlus, X } from "lucide-react";

export default function ThemeSelector({
  selectedThemeId,
  onThemeSelect,
  customBackgroundUrl,
  onCustomBackgroundChange,
}) {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      const { data, error } = await supabase
        .from("themes")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;

      // Deduplicate themes by keying on visual properties to avoid duplicate options
      const uniqueMap = new Map();
      (data || []).forEach((theme) => {
        const key = [
          theme.name?.trim().toLowerCase(),
          theme.background_image_url || "",
          theme.primary_color || "",
          theme.secondary_color || "",
          theme.text_color || "",
        ].join("|");

        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, theme);
        }
      });

      const uniqueThemes = Array.from(uniqueMap.values());
      uniqueThemes.sort((a, b) => {
        if (a.is_default === b.is_default) {
          return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
        }
        return a.is_default ? -1 : 1;
      });

      setThemes(uniqueThemes);
    } catch (err) {
      console.error("Error fetching themes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeSelect = (themeId) => {
    onCustomBackgroundChange?.(null);
    onThemeSelect?.(themeId);
  };

  const handleCustomUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      onThemeSelect?.(null);
      onCustomBackgroundChange?.(url);
    } catch (err) {
      console.error("Failed to upload custom theme image:", err);
      setUploadError("Upload failed. Please try again or use a smaller image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading themes...</div>;
  }

  const isCustomSelected = !selectedThemeId && !!customBackgroundUrl;

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
              onClick={() => handleThemeSelect(theme.id)}
              className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                isSelected
                  ? "border-purple-600 ring-2 ring-purple-300"
                  : "border-gray-200 hover:border-purple-400"
              }`}
              style={{ height: "120px" }}
            >
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
                <div className="absolute inset-0 bg-black/30"></div>

                <div className="relative z-10 text-center px-2">
                  <p
                    className="text-sm font-semibold drop-shadow-lg"
                    style={{ color: theme.text_color || "#FFFFFF" }}
                  >
                    {theme.name}
                  </p>
                  {theme.is_default && (
                    <span className="text-xs bg-white/80 text-gray-800 px-2 py-0.5 rounded mt-1 inline-block">
                      Default
                    </span>
                  )}
                </div>

                {isSelected && (
                  <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full p-1">
                    <Check size={16} />
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {/* Upload custom image tile */}
        <label
          className={`relative rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center p-4 cursor-pointer transition-all ${
            uploading
              ? "border-purple-400 bg-purple-50 text-purple-600"
              : "border-gray-300 hover:border-purple-400 hover:bg-purple-50"
          }`}
          style={{ minHeight: "120px" }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCustomUpload}
          />
          <ImagePlus size={28} className="mx-auto mb-2 text-purple-600" />
          <p className="text-sm font-semibold text-gray-700">Upload Custom</p>
          <p className="text-xs text-gray-500 mt-1">
            {uploading ? "Uploading..." : "Use your own background"}
          </p>
        </label>
      </div>

      {uploadError && (
        <p className="mt-3 text-sm text-red-600">{uploadError}</p>
      )}

      {/* Selected custom background preview */}
      {customBackgroundUrl && (
        <div
          className={`mt-4 relative rounded-lg overflow-hidden border-2 transition-all ${
            isCustomSelected
              ? "border-purple-600 ring-2 ring-purple-300"
              : "border-gray-200"
          }`}
          style={{ height: "140px" }}
        >
          <button
            type="button"
            onClick={() => {
              onThemeSelect?.(null);
              onCustomBackgroundChange?.(customBackgroundUrl);
            }}
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: `url(${customBackgroundUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-label="Custom theme preview"
          />

          <div className="absolute inset-0 bg-black/30"></div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
            <div>
              <p className="text-sm font-semibold">Custom Theme</p>
              <p className="text-xs text-white/80">Using your uploaded image</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCustomBackgroundChange?.(null);
                const defaultTheme = themes.find((t) => t.is_default) || themes[0];
                if (defaultTheme) {
                  onThemeSelect?.(defaultTheme.id);
                }
              }}
              className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-white"
            >
              <X size={14} />
              Remove
            </button>
          </div>
        </div>
      )}

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

      {isCustomSelected && (
        <div className="mt-3">
          <p className="text-sm text-gray-600">
            Selected theme: <span className="font-semibold">Custom upload</span>
          </p>
        </div>
      )}
    </div>
  );
}
