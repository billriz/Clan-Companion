"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, FileImage, Loader2, RefreshCcw, Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { RecipeScanReviewForm } from "@/components/recipes/recipe-scan-review-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  normalizeRecipeScanSourceType,
  recipeScanApiResponseSchema,
  RECIPE_SCAN_ALLOWED_MIME_TYPES,
  RECIPE_SCAN_HEIC_MIME_TYPES,
  RECIPE_SCAN_MAX_FILE_SIZE_BYTES,
  type RecipeScanApiResponse,
  type RecipeScanSavePayload,
} from "@/lib/validations/recipe-scan";
import { cn } from "@/lib/utils";

const SOURCE_TYPE_OPTIONS = [
  { label: "Recipe card", value: "recipe_card" },
  { label: "Cookbook snippet", value: "cookbook_snippet" },
  { label: "Handwritten recipe", value: "handwritten_recipe" },
  { label: "Printed recipe", value: "printed_recipe" },
  { label: "Not sure", value: "unknown" },
] as const;

export function RecipeScanClient() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<string>("unknown");
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scanResult, setScanResult] = useState<RecipeScanApiResponse | null>(null);
  const [reviewValues, setReviewValues] = useState<RecipeScanSavePayload | null>(null);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const applySelectedFile = useCallback(
    (file: File) => {
      const validationError = validateScanFile(file);

      if (validationError) {
        setExtractError(validationError);
        return;
      }

      setExtractError(null);
      setSaveError(null);
      setSavedRecipeId(null);
      setScanResult(null);
      setReviewValues(null);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [previewUrl],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: readonly { errors: readonly { message: string }[] }[]) => {
      if (fileRejections.length > 0) {
        const firstError = fileRejections[0]?.errors?.[0]?.message;
        setExtractError(firstError || "Unsupported file type. Please upload JPG, PNG, or WebP.");
        return;
      }

      const file = acceptedFiles[0];

      if (!file) {
        return;
      }

      applySelectedFile(file);
    },
    [applySelectedFile],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noKeyboard: true,
    multiple: false,
    maxFiles: 1,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/heic": [],
      "image/heif": [],
    },
    maxSize: RECIPE_SCAN_MAX_FILE_SIZE_BYTES,
  });

  const fileSummary = useMemo(() => {
    if (!selectedFile) {
      return null;
    }

    return `${selectedFile.name} (${formatBytes(selectedFile.size)})`;
  }, [selectedFile]);

  function clearSelectedFile() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractError(null);
    setSaveError(null);
    setScanResult(null);
    setReviewValues(null);
    setSavedRecipeId(null);
  }

  async function handleExtract() {
    if (!selectedFile) {
      setExtractError("Please select an image before extracting.");
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    setSaveError(null);
    setSavedRecipeId(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("sourceType", normalizeRecipeScanSourceType(sourceType));

    try {
      const response = await fetch("/api/recipes/scan", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      if (!response.ok) {
        setExtractError(
          typeof payload.error === "string"
            ? payload.error
            : "We couldn't read that recipe clearly. Try another image.",
        );
        return;
      }

      const parsedPayload = recipeScanApiResponseSchema.safeParse(payload);

      if (!parsedPayload.success) {
        setExtractError("We had trouble reading that recipe. Try cropping the image and scanning again.");
        return;
      }

      const parsedResult = parsedPayload.data;
      setScanResult(parsedResult);
      setReviewValues(buildReviewValues(parsedResult));

      if (!parsedResult.extractedRecipe.isRecipe) {
        setExtractError("This image may not contain a recipe. Please review carefully or try another photo.");
      }
    } catch {
      setExtractError("Recipe extraction failed. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSave() {
    if (!reviewValues) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/recipes/scan/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reviewValues),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        recipe?: { id: string };
        error?: string;
      };

      if (!response.ok || !payload.recipe) {
        setSaveError(payload.error ?? "Recipe could not be saved. Please review and try again.");
        return;
      }

      setSavedRecipeId(payload.recipe.id);
    } catch {
      setSaveError("Recipe could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const statusMessage = isExtracting
    ? "Reading your recipe... This may take a moment for handwritten or blurry recipes."
    : isSaving
      ? "Saving recipe..."
      : null;

  return (
    <div className="space-y-6">
      {savedRecipeId ? (
        <section
          className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-plate-charcoal sm:p-5"
          role="status"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <p className="font-semibold">Recipe saved successfully.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className={cn(buttonVariants(), "h-9")} href={`/recipes/${savedRecipeId}`}>
                  View Recipe
                </Link>
                <Link className={cn(buttonVariants({ variant: "secondary" }), "h-9")} href="/recipes">
                  Back to Recipes
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-plate-charcoal">Upload Recipe Image</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Drag and drop an image, choose a file, or take a photo with your camera.
            </p>
          </div>

          {selectedFile ? (
            <Button className="gap-2" type="button" variant="secondary" onClick={clearSelectedFile}>
              <X className="h-4 w-4" aria-hidden="true" />
              Remove image
            </Button>
          ) : null}
        </div>

        <div
          {...getRootProps()}
          className={`mt-5 rounded-2xl border-2 border-dashed p-6 text-center transition ${
            isDragActive ? "border-primary bg-primary/10" : "border-border bg-plate-paper"
          }`}
        >
          <input {...getInputProps()} aria-label="Upload recipe image" />

          {previewUrl ? (
            <div className="space-y-4">
              <div className="relative mx-auto aspect-[4/3] max-w-md overflow-hidden rounded-xl border bg-white">
                <Image alt="Selected recipe preview" className="object-contain" fill src={previewUrl} />
              </div>
              {fileSummary ? <p className="text-sm text-muted-foreground">{fileSummary}</p> : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-plate-charcoal">
                {isDragActive ? "Drop the image here" : "Drop a recipe image here"}
              </p>
              <p className="text-xs text-muted-foreground">JPG, PNG, or WebP up to 8MB</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button className="gap-2" type="button" variant="secondary" onClick={open}>
              <FileImage className="h-4 w-4" aria-hidden="true" />
              Choose File
            </Button>
            <Button
              className="gap-2"
              type="button"
              variant="secondary"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              Take Photo
            </Button>
            <input
              ref={cameraInputRef}
              className="hidden"
              accept="image/*"
              capture="environment"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  applySelectedFile(file);
                }

                event.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="scan-source-type">Source type</Label>
            <select
              id="scan-source-type"
              className="h-11 w-full rounded-md border border-input bg-plate-paper px-3 text-sm text-plate-charcoal shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value)}
            >
              {SOURCE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            className="h-11 w-full"
            disabled={isExtracting || isSaving || !selectedFile}
            type="button"
            onClick={handleExtract}
          >
            {isExtracting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Reading your recipe...
              </span>
            ) : (
              "Extract Recipe"
            )}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
        <Badge variant="blue">Scanning tips</Badge>
        <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
          <li>Use good lighting.</li>
          <li>Crop to just the recipe.</li>
          <li>Avoid shadows on the card or page.</li>
          <li>Make sure ingredients and directions are visible.</li>
          <li>For cookbook pages, capture the full recipe.</li>
          <li>For handwritten cards, place it on a flat surface.</li>
        </ul>
      </section>

      {extractError ? (
        <section className="rounded-2xl border border-plate-terracotta/30 bg-plate-terracotta/10 p-4 text-sm text-plate-terracotta">
          {extractError}
        </section>
      ) : null}

      <div aria-live="polite" className="sr-only" role="status">
        {statusMessage || "Ready"}
      </div>

      {statusMessage && !reviewValues ? (
        <section className="rounded-2xl border border-plate-blue/30 bg-plate-blue/10 p-4 text-sm text-plate-blue">
          {statusMessage}
        </section>
      ) : null}

      {reviewValues ? (
        <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-4 rounded-2xl border bg-white p-4 shadow-subtle sm:p-5">
            <h2 className="text-lg font-semibold text-plate-charcoal">Original Image</h2>

            {scanResult?.originalImageUrl || previewUrl ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-plate-paper">
                <Image
                  alt="Original uploaded recipe scan"
                  className="object-contain"
                  fill
                  src={scanResult?.originalImageUrl ?? previewUrl ?? ""}
                />
              </div>
            ) : null}

            <p className="text-sm text-muted-foreground">
              Review and edit extracted details before saving to your recipe library.
            </p>

            <Button className="w-full gap-2" type="button" variant="secondary" onClick={clearSelectedFile}>
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Try Another Image
            </Button>
          </aside>

          <RecipeScanReviewForm
            isSaving={isSaving}
            saveError={saveError}
            values={reviewValues}
            onCancel={() => router.push("/recipes/import")}
            onChange={setReviewValues}
            onRescan={clearSelectedFile}
            onSave={handleSave}
          />
        </section>
      ) : null}
    </div>
  );
}

function buildReviewValues(scanResult: RecipeScanApiResponse): RecipeScanSavePayload {
  const extractedRecipe = scanResult.extractedRecipe;

  return {
    title: extractedRecipe.title ?? "",
    description: extractedRecipe.description,
    servings: extractedRecipe.servings,
    prepTimeMinutes: extractedRecipe.prepTimeMinutes,
    cookTimeMinutes: extractedRecipe.cookTimeMinutes,
    totalTimeMinutes: extractedRecipe.totalTimeMinutes,
    ingredients:
      extractedRecipe.ingredients.length > 0
        ? extractedRecipe.ingredients
        : [
            {
              originalText: "",
              quantity: null,
              unit: null,
              name: null,
              preparation: null,
              optional: false,
              confidence: 0,
            },
          ],
    instructions:
      extractedRecipe.instructions.length > 0
        ? extractedRecipe.instructions
        : [
            {
              stepNumber: 1,
              text: "",
              confidence: 0,
            },
          ],
    notes: extractedRecipe.notes,
    tags: extractedRecipe.tags,
    cuisine: extractedRecipe.cuisine,
    mealType: extractedRecipe.mealType,
    sourceType: extractedRecipe.sourceType,
    confidenceScore: extractedRecipe.confidenceScore,
    missingFields: extractedRecipe.missingFields,
    warnings: Array.from(new Set([...scanResult.warnings, ...extractedRecipe.warnings])),
    rawExtractedText: scanResult.rawText || extractedRecipe.rawExtractedText,
    originalImagePath: scanResult.originalImagePath,
    originalImageUrl: scanResult.originalImageUrl,
    scanModel: scanResult.scanModel,
  };
}

function validateScanFile(file: File) {
  if (file.size > RECIPE_SCAN_MAX_FILE_SIZE_BYTES) {
    return "File is too large. Please upload an image smaller than 8MB.";
  }

  if (RECIPE_SCAN_HEIC_MIME_TYPES.includes(file.type as (typeof RECIPE_SCAN_HEIC_MIME_TYPES)[number])) {
    return "HEIC images are not supported yet. Please upload JPG, PNG, or WebP.";
  }

  if (!RECIPE_SCAN_ALLOWED_MIME_TYPES.includes(file.type as (typeof RECIPE_SCAN_ALLOWED_MIME_TYPES)[number])) {
    return "Unsupported file type. Please upload JPG, PNG, or WebP.";
  }

  return null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
