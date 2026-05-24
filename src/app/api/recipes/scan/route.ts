import { NextResponse } from "next/server";

import {
  extractRecipeFromImage,
  RecipeScanExtractionError,
} from "@/lib/openai/recipe-scan";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeRecipeScanSourceType,
  RECIPE_SCAN_ALLOWED_MIME_TYPES,
  RECIPE_SCAN_HEIC_MIME_TYPES,
  RECIPE_SCAN_MAX_FILE_SIZE_BYTES,
} from "@/lib/validations/recipe-scan";

const RECIPE_SCAN_BUCKET = "recipe-scans";

export async function POST(request: Request) {
  // TODO: Apply shared app rate limiting here if/when a central middleware pattern exists.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to scan recipes." }, { status: 401 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please select an image to scan." }, { status: 400 });
  }

  const sourceTypeEntry = formData.get("sourceType");
  const sourceType = normalizeRecipeScanSourceType(
    typeof sourceTypeEntry === "string" ? sourceTypeEntry : "unknown",
  );

  if (file.size > RECIPE_SCAN_MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `Image is too large. Please upload an image smaller than ${Math.round(RECIPE_SCAN_MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB.`,
      },
      { status: 413 },
    );
  }

  if (RECIPE_SCAN_HEIC_MIME_TYPES.includes(file.type as (typeof RECIPE_SCAN_HEIC_MIME_TYPES)[number])) {
    return NextResponse.json(
      {
        error: "HEIC images are not supported yet. Please upload JPG, PNG, or WebP.",
      },
      { status: 400 },
    );
  }

  if (!RECIPE_SCAN_ALLOWED_MIME_TYPES.includes(file.type as (typeof RECIPE_SCAN_ALLOWED_MIME_TYPES)[number])) {
    return NextResponse.json(
      {
        error: "Unsupported image type. Please upload JPG, PNG, or WebP.",
      },
      { status: 400 },
    );
  }

  let imageArrayBuffer: ArrayBuffer;

  try {
    imageArrayBuffer = await file.arrayBuffer();
  } catch {
    return NextResponse.json(
      {
        error: "We couldn't read that file. Please try another image.",
      },
      { status: 400 },
    );
  }

  const uploadPath = buildUploadPath({
    userId: user.id,
    filename: file.name,
  });

  const uploadBuffer = Buffer.from(imageArrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(RECIPE_SCAN_BUCKET)
    .upload(uploadPath, uploadBuffer, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return NextResponse.json(
      {
        error: "Scan image upload failed. Please try again.",
      },
      { status: 500 },
    );
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(RECIPE_SCAN_BUCKET)
    .createSignedUrl(uploadPath, 60 * 60);

  if (signedUrlError) {
    return NextResponse.json(
      {
        error: "We uploaded your image but couldn't create a secure preview link. Please try again.",
      },
      { status: 500 },
    );
  }

  const imageDataUrl = `data:${file.type};base64,${uploadBuffer.toString("base64")}`;

  try {
    const extracted = await extractRecipeFromImage({
      imageDataUrl,
      sourceType,
    });

    return NextResponse.json(
      {
        extractedRecipe: extracted.extractedRecipe,
        rawText: extracted.rawText,
        confidence: extracted.confidence,
        missingFields: extracted.missingFields,
        warnings: extracted.warnings,
        originalImagePath: uploadPath,
        originalImageUrl: signedUrlData?.signedUrl ?? null,
        scanModel: extracted.scanModel,
      },
      { status: 200 },
    );
  } catch (error) {
    return mapScanError(error);
  }
}

function buildUploadPath({ userId, filename }: { userId: string; filename: string }) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const safeFilename = sanitizeFilename(filename);

  return `${userId}/${dateStamp}/${crypto.randomUUID()}-${safeFilename}`;
}

function sanitizeFilename(filename: string) {
  const trimmed = filename.trim().toLowerCase();

  if (!trimmed) {
    return "recipe-scan.jpg";
  }

  return trimmed.replace(/[^a-z0-9._-]/g, "-");
}

function mapScanError(error: unknown) {
  if (error instanceof RecipeScanExtractionError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    {
      error: "We couldn't read that recipe clearly. Try taking the photo in better light and make sure the full recipe is visible.",
    },
    { status: 502 },
  );
}
