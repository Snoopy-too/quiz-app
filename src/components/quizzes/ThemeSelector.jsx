import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { uploadImage } from "../../utils/mediaUpload";
import { Check, Palette, ImagePlus, X, Pencil, Trash2, User } from "lucide-react";

export default function ThemeSelector({
  selectedThemeId,
  onThemeSelect,
  customBackgroundUrl,
  onCustomBackgroundChange,
}) {
  const [themes, setThemes] = useState([]);
  const [userThemes, setUserThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const fileInputRef = useRef(null);

  // Modal state for naming theme
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState(null);
  const [themeName, setThemeName] = useState("");
  const [savingTheme, setSavingTheme] = useState(false);

  // Edit mode state
  const [editingThemeId, setEditingThemeId] = useState(null);
  const [editingName, setEditingName] = useState("");

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState(null);
  const [deletingTheme, setDeletingTheme] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId !== null) {
      fetchThemes();
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    setCurrentUserId(data?.user?.id || null);
  };

  const fetchThemes = async () => {
    try {
      // Fetch global themes (no created_by or is_default)
      const { data: globalData, error: globalError } = await supabase
        .from("themes")
        .select("*")
        .or("created_by.is.null,is_default.eq.true")
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (globalError) throw globalError;

      // Fetch user's custom themes
      let userData = [];
      if (currentUserId) {
        const { data: userThemesData, error: userError } = await supabase
          .from("themes")
          .select("*")
          .eq("created_by", currentUserId)
          .order("created_at", { ascending: false });

        if (!userError) {
          userData = userThemesData || [];
        }
      }

      // Deduplicate global themes
      const uniqueMap = new Map();
      (globalData || []).forEach((theme) => {
        const key = [
          theme.name?.trim().toLowerCase(),
          theme.background_image_url || "",
          theme.primary_color || "",
          theme.secondary_color || "",
        ].join("|");

        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, theme);
        }
      });

      const uniqueGlobalThemes = Array.from(uniqueMap.values());
      uniqueGlobalThemes.sort((a, b) => {
        if (a.is_default === b.is_default) {
          return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
        }
        return a.is_default ? -1 : 1;
      });

      setThemes(uniqueGlobalThemes);
      setUserThemes(userData);
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
      // Show naming modal instead of directly setting
      setPendingImageUrl(url);
      setThemeName("");
      setShowNameModal(true);
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

  const handleSaveCustomTheme = async () => {
    if (!pendingImageUrl || !themeName.trim()) return;

    setSavingTheme(true);
    try {
      const { data, error } = await supabase
        .from("themes")
        .insert([
          {
            name: themeName.trim(),
            background_image_url: pendingImageUrl,
            primary_color: "#667eea",
            secondary_color: "#764ba2",
            text_color: "#FFFFFF",
            is_default: false,
            created_by: currentUserId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add to user themes and select it
      setUserThemes((prev) => [data, ...prev]);
      onCustomBackgroundChange?.(null);
      onThemeSelect?.(data.id);

      // Close modal and reset
      setShowNameModal(false);
      setPendingImageUrl(null);
      setThemeName("");
    } catch (err) {
      console.error("Failed to save custom theme:", err);
      setUploadError("Failed to save theme. Please try again.");
    } finally {
      setSavingTheme(false);
    }
  };

  const handleCancelCustomTheme = () => {
    setShowNameModal(false);
    setPendingImageUrl(null);
    setThemeName("");
  };

  const handleStartEditName = (theme, e) => {
    e.stopPropagation();
    setEditingThemeId(theme.id);
    setEditingName(theme.name || "");
  };

  const handleSaveEditName = async (themeId, e) => {
    e?.stopPropagation();
    if (!editingName.trim()) return;

    try {
      const { error } = await supabase
        .from("themes")
        .update({ name: editingName.trim() })
        .eq("id", themeId)
        .eq("created_by", currentUserId);

      if (error) throw error;

      // Update local state
      setUserThemes((prev) =>
        prev.map((t) => (t.id === themeId ? { ...t, name: editingName.trim() } : t))
      );
      setEditingThemeId(null);
      setEditingName("");
    } catch (err) {
      console.error("Failed to update theme name:", err);
    }
  };

  const handleCancelEdit = (e) => {
    e?.stopPropagation();
    setEditingThemeId(null);
    setEditingName("");
  };

  const handleOpenDeleteModal = (theme, e) => {
    e.stopPropagation();
    setThemeToDelete(theme);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setThemeToDelete(null);
    setDeleteError(null);
  };

  const confirmDeleteTheme = async () => {
    if (!themeToDelete) return;

    setDeletingTheme(true);
    setDeleteError(null);
    try {
      const { error } = await supabase
        .from("themes")
        .delete()
        .eq("id", themeToDelete.id)
        .eq("created_by", currentUserId);

      if (error) {
        if (error.code === "23503") {
          throw new Error("This theme is being used by one or more quizzes. You must change the theme of those quizzes before you can delete this theme.");
        }
        throw error;
      }

      // Remove from local state
      setUserThemes((prev) => prev.filter((t) => t.id !== themeToDelete.id));

      // If this was the selected theme, clear selection
      if (selectedThemeId === themeToDelete.id) {
        const defaultTheme = themes.find((t) => t.is_default) || themes[0];
        if (defaultTheme) {
          onThemeSelect?.(defaultTheme.id);
        }
      }

      handleCloseDeleteModal();
    } catch (err) {
      console.error("Failed to delete theme:", err);
      setDeleteError(err.message || "Failed to delete theme. It might be in use.");
    } finally {
      setDeletingTheme(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading themes...</div>;
  }

  const isCustomSelected = !selectedThemeId && !!customBackgroundUrl;

  const renderThemeCard = (theme, isUserTheme = false) => {
    const isSelected = selectedThemeId === theme.id;
    const isEditing = editingThemeId === theme.id;

    return (
      <button
        key={theme.id}
        type="button"
        onClick={() => !isEditing && handleThemeSelect(theme.id)}
        className={`relative rounded-lg overflow-hidden border-2 transition-all group ${isSelected
          ? "border-blue-700 ring-2 ring-cyan-300"
          : "border-gray-200 hover:border-cyan-400"
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
            {isEditing ? (
              <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="px-2 py-1 text-sm rounded border border-white/50 bg-white/90 text-gray-800 w-full"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEditName(theme.id, e);
                    if (e.key === "Escape") handleCancelEdit(e);
                  }}
                />
                <div className="flex gap-1 justify-center">
                  <button
                    onClick={(e) => handleSaveEditName(theme.id, e)}
                    className="px-2 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-2 py-0.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                {isUserTheme && !theme.is_default && (
                  <span className="text-xs bg-blue-500/80 text-white px-2 py-0.5 rounded mt-1 inline-flex items-center gap-1">
                    <User size={10} />
                    My Theme
                  </span>
                )}
              </>
            )}
          </div>

          {isSelected && !isEditing && (
            <div className="absolute top-2 right-2 bg-blue-700 text-white rounded-full p-1">
              <Check size={16} />
            </div>
          )}

          {/* Edit/Delete buttons for user themes */}
          {isUserTheme && !isEditing && (
            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => handleStartEditName(theme, e)}
                className="p-1 bg-white/90 text-gray-700 rounded hover:bg-white"
                title="Rename theme"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={(e) => handleOpenDeleteModal(theme, e)}
                className="p-1 bg-white/90 text-red-600 rounded hover:bg-white"
                title="Delete theme"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-3">
        <Palette className="inline mr-2" size={18} />
        Quiz Theme
      </label>

      {/* User's Custom Themes */}
      {userThemes.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
            <User size={14} />
            My Custom Themes
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {userThemes.map((theme) => renderThemeCard(theme, true))}
          </div>
        </div>
      )}

      {/* Global Themes */}
      <div>
        {userThemes.length > 0 && (
          <h4 className="text-sm font-medium text-gray-600 mb-2">Built-in Themes</h4>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {themes.map((theme) => renderThemeCard(theme, false))}

          {/* Upload custom image tile */}
          <label
            className={`relative rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center p-4 cursor-pointer transition-all ${uploading
              ? "border-cyan-400 bg-blue-50 text-blue-700"
              : "border-gray-300 hover:border-cyan-400 hover:bg-blue-50"
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
            <ImagePlus size={28} className="mx-auto mb-2 text-blue-700" />
            <p className="text-sm font-semibold text-gray-700">Upload Custom</p>
            <p className="text-xs text-gray-500 mt-1">
              {uploading ? "Uploading..." : "Create your own theme"}
            </p>
          </label>
        </div>
      </div>

      {uploadError && (
        <p className="mt-3 text-sm text-red-600">{uploadError}</p>
      )}

      {/* Legacy custom background preview (for quizzes that already have one) */}
      {customBackgroundUrl && (
        <div
          className={`mt-4 relative rounded-lg overflow-hidden border-2 transition-all ${isCustomSelected
            ? "border-blue-700 ring-2 ring-cyan-300"
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
              <p className="text-sm font-semibold">Unsaved Custom Background</p>
              <p className="text-xs text-white/80">Save it as a theme to reuse</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Convert to saved theme
                  setPendingImageUrl(customBackgroundUrl);
                  setThemeName("");
                  setShowNameModal(true);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                Save as Theme
              </button>
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
        </div>
      )}

      {selectedThemeId && (
        <div className="mt-3">
          <p className="text-sm text-gray-600">
            Selected theme:{" "}
            <span className="font-semibold">
              {[...themes, ...userThemes].find((t) => t.id === selectedThemeId)?.name}
            </span>
          </p>
        </div>
      )}

      {isCustomSelected && (
        <div className="mt-3">
          <p className="text-sm text-gray-600">
            Selected theme: <span className="font-semibold">Custom upload (not saved)</span>
          </p>
        </div>
      )}
      {/* Name Theme Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Name Your Theme</h3>

              {/* Preview */}
              {pendingImageUrl && (
                <div
                  className="w-full h-32 rounded-lg mb-4 bg-cover bg-center"
                  style={{ backgroundImage: `url(${pendingImageUrl})` }}
                />
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Theme Name
                </label>
                <input
                  type="text"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  placeholder="e.g., Ocean Sunset, Mountain View..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && themeName.trim()) handleSaveCustomTheme();
                    if (e.key === "Escape") handleCancelCustomTheme();
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveCustomTheme}
                  disabled={!themeName.trim() || savingTheme}
                  className="flex-1 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {savingTheme ? "Saving..." : "Save Theme"}
                </button>
                <button
                  onClick={handleCancelCustomTheme}
                  disabled={savingTheme}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-bold">Delete Theme?</h3>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-semibold text-gray-800">"{themeToDelete?.name}"</span>?
                This action cannot be undone.
              </p>
              <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg mb-6 border border-amber-100">
                <strong>Please note:</strong> If this quiz is currently using this theme, you must select a different theme and <strong>SAVE the quiz</strong> before you can delete it.
              </p>

              {deleteError && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={confirmDeleteTheme}
                  disabled={deletingTheme}
                  className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                  {deletingTheme ? "Deleting..." : "Yes, Delete Theme"}
                </button>
                <button
                  onClick={handleCloseDeleteModal}
                  disabled={deletingTheme}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
