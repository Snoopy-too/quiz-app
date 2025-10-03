import { supabase } from "../supabaseClient";

/**
 * Upload image to Supabase Storage
 */
export const uploadImage = async (file, bucket = "quiz-images") => {
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
