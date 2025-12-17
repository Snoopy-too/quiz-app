import { supabase } from "../supabaseClient";

/**
 * Resize image before upload to optimize for mobile
 * Max width/height: 1200px
 * JPEG Quality: 0.8
 * Preserves PNG format for transparency
 */
const resizeImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Determine output format
        // If original was PNG, keep as PNG to preserve transparency. Otherwise JPEG.
        const isPng = file.type === 'image/png';
        const outputType = isPng ? 'image/png' : 'image/jpeg';
        const quality = isPng ? undefined : 0.8;

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }

          const ext = isPng ? 'png' : 'jpg';
          const newName = file.name.replace(/\.[^/.]+$/, "") + "." + ext;

          const newFile = new File([blob], newName, {
            type: outputType,
            lastModified: Date.now(),
          });
          resolve(newFile);
        }, outputType, quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Upload image to Supabase Storage with Resize optimization
 */
export const uploadImage = async (file, bucket = "quiz-images") => {
  try {
    // Resize image before upload
    const resizedFile = await resizeImage(file);

    // Determine extension from the resized file
    const fileExt = resizedFile.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, resizedFile);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

/**
 * Upload video to Supabase Storage
 */
export const uploadVideo = async (file, bucket = "quiz-videos") => {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading video:", error);
    throw error;
  }
};

/**
 * Upload GIF to Supabase Storage
 */
export const uploadGIF = async (file, bucket = "quiz-gifs") => {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading GIF:", error);
    throw error;
  }
};

/**
 * Upload avatar to Supabase Storage
 */
export const uploadAvatar = async (file, userId) => {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `avatar_${userId}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { data, error } = await supabase.storage
      .from("user-avatars")
      .upload(filePath, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("user-avatars")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    throw error;
  }
};

/**
 * Delete file from storage
 */
export const deleteFile = async (url, bucket) => {
  try {
    const filePath = url.split("/").pop();
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting file:", error);
  }
};
