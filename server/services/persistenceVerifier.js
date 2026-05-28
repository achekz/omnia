// Role du fichier: verifie que les ecritures critiques existent vraiment dans MongoDB.
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiResponse.js";

export function ensureMongoConnected(operationName = "database operation") {
  if (mongoose.connection.readyState !== 1) {
    console.error("[Persistence] MongoDB is not connected.", {
      operationName,
      readyState: mongoose.connection.readyState,
      database: mongoose.connection.name || null,
    });
    throw new ApiError(503, "Database is not connected. Please try again.");
  }
}

export async function assertDocumentPersisted(Model, id, label, extra = {}) {
  ensureMongoConnected(`verify ${label}`);

  const persisted = await Model.exists({ _id: id });
  if (!persisted) {
    console.error("[Persistence] Document was not found after save.", {
      label,
      id,
      model: Model.modelName,
      database: mongoose.connection.name || null,
      ...extra,
    });
    throw new ApiError(500, `${label} was not persisted to MongoDB`);
  }

  console.log("[Persistence] Document saved and verified.", {
    label,
    id: id?.toString?.() || id,
    model: Model.modelName,
    database: mongoose.connection.name || null,
    ...extra,
  });

  return true;
}
