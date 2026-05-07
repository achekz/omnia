import User from "../models/User.js";

// Role: Recupere les donnees necessaires.
export const getAllUsers = async () => {
  return await User.find().select("-password");
};