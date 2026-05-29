"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Clock3,
  ExternalLink,
  Loader2,
  Search,
  Soup,
  UsersRound,
  X,
} from "lucide-react";

import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { formatMinutes } from "@/lib/recipes";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/types/recipes";
import type { NormalizedSpoonacularSearchResult } from "@/types/spoonacular";

const CUISINE_OPTIONS = [
  { label: "Any", value: "" },
  { label: "American", value: "american" },
  { label: "Italian", value: "italian" },
  { label: "Mexican", value: "mexican" },
  { label: "Mediterranean", value: "mediterranean" },
  { label: "Indian", value: "indian" },
  { label: "Chinese", value: "chinese" },
  { label: "Japanese", value: "japanese" },
  { label: "Thai", value: "thai" },
] as const;

const DIET_OPTIONS = [
  { label: "Any", value: "" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Gluten Free", value: "gluten free" },
  { label: "Ketogenic", value: "ketogenic" },
  { label: "Paleo", value: "paleo" },
  { label: "Pescetarian", value: "pescetarian" },
] as const;

const INTOLERANCE_OPTIONS = [
  { label: "Dairy", value: "dairy" },
  { label: "Egg", value: "egg" },
  { label: "Gluten", value: "gluten" },
  { label: "Peanut", value: "peanut" },
  { label: "Seafood", value: "seafood" },
  { label: "Sesame", value: "sesame" },
  { label: "Shellfish", value: "shellfish" },
  { label: "Soy", value: "soy" },
  { label: "Tree Nut", value: "tree nut" },
  { label: "Wheat", value: "wheat" },
] as const;

const MAX_READY_TIME_OPTIONS = [
  { label: "Any", value: "" },
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
  { label: "45 minutes", value: "45" },
  { label: "60 minutes", value: "60" },
] as const;

const RESULT_COUNT_OPTIONS = [8, 12, 16, 24] as const;
const POPULAR_SEARCHES = ["Chicken pasta", "Tacos", "Beef stew", "Pancakes", "Salmon"] as const;

type SearchApiResponse = {
  results?: NormalizedSpoonacularSearchResult[];
  totalResults?: number;
  error?: string;
};

type ImportApiResponse = {
  message?: string;
  alreadyImported?: boolean;
  recipe?: Recipe;
  error?: string;
};

type ImportedLookup = Record<number, { recipeId: string; alreadyImported: boolean }>;

type ToastState = {
  variant: "success" | "error";
  title: string;
  message: string;
  recipeId?: string;
};

export function RecipeImportBrowser() {
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [diet, setDiet] = useState("");
  const [maxReadyTime, setMaxReadyTime] = useState("");
  const [resultCount, setResultCount] = useState("12");
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const stored = window.localStorage.getItem("gravytime-recent-import-searches");

    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored) as unknown;
      return Array.isArray(parsed) ? parsed.map((entry) => String(entry)).slice(0, 5) : [];
    } catch {
      return [];
    }
  });

  const [results, setResults] = useState<NormalizedSpoonacularSearchResult[]>([]);
  const [totalResults, setTotalResults] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [previewRecipe, setPreviewRecipe] = useState<NormalizedSpoonacularSearchResult | null>(null);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [importedLookup, setImportedLookup] = useState<ImportedLookup>({});

  const [toast, setToast] = useState<ToastState | null>(null);
  const initialSearchRan = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const intoleranceCount = selectedIntolerances.length;

  const resultCopy = useMemo(() => {
    if (isSearching) {
      return "Searching recipes...";
    }

    if (totalResults !== null) {
      return `${results.length} shown of ${totalResults} found`;
    }

    return `${results.length} recipes shown`;
  }, [isSearching, results.length, totalResults]);

  const executeSearch = useCallback(async (searchOverride?: string) => {
    setIsSearching(true);
    setSearchError(null);

    const cleanQuery = (searchOverride ?? query).trim();
    if (cleanQuery) {
      setRecentSearches((current) => {
        const next = [cleanQuery, ...current.filter((item) => item.toLowerCase() !== cleanQuery.toLowerCase())].slice(0, 5);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("gravytime-recent-import-searches", JSON.stringify(next));
        }
        return next;
      });
    }

    const params = new URLSearchParams();
    const cleanedQuery = cleanQuery;

    if (cleanedQuery) {
      params.set("query", cleanedQuery);
    }

    if (cuisine) {
      params.set("cuisine", cuisine);
    }

    if (diet) {
      params.set("diet", diet);
    }

    if (selectedIntolerances.length > 0) {
      params.set("intolerances", selectedIntolerances.join(","));
    }

    if (maxReadyTime) {
      params.set("maxReadyTime", maxReadyTime);
    }

    params.set("number", resultCount);

    try {
      const response = await fetch(`/api/recipes/search?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => ({}))) as SearchApiResponse;

      if (!response.ok) {
        setResults([]);
        setTotalResults(null);
        setSearchError(payload.error ?? "Search could not be completed.");
        setHasSearched(true);
        return;
      }

      setResults(Array.isArray(payload.results) ? payload.results : []);
      setTotalResults(typeof payload.totalResults === "number" ? payload.totalResults : null);
      setHasSearched(true);
    } catch {
      setResults([]);
      setTotalResults(null);
      setSearchError("Could not connect to recipe search. Please try again.");
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, [cuisine, diet, maxReadyTime, query, resultCount, selectedIntolerances]);

  useEffect(() => {
    if (initialSearchRan.current) {
      return;
    }

    initialSearchRan.current = true;
    void executeSearch();
  }, [executeSearch]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  function showToast(nextToast: ToastState) {
    setToast(nextToast);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 5000);
  }

  function toggleIntolerance(value: string) {
    setSelectedIntolerances((current) => {
      if (current.includes(value)) {
        return current.filter((item) => item !== value);
      }

      return [...current, value];
    });
  }

  async function handleImport(recipe: NormalizedSpoonacularSearchResult) {
    const existingImport = importedLookup[recipe.id];

    if (existingImport) {
      showToast({
        variant: "success",
        title: "Already in your library",
        message: "This recipe is already saved in GravyTime.",
        recipeId: existingImport.recipeId,
      });
      return;
    }

    setImportingId(recipe.id);

    try {
      const response = await fetch("/api/recipes/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spoonacularId: recipe.id }),
      });

      const payload = (await response.json().catch(() => ({}))) as ImportApiResponse;

      if (!response.ok || !payload.recipe) {
        showToast({
          variant: "error",
          title: "Import failed",
          message: payload.error ?? "Recipe could not be imported. Please try again.",
        });
        return;
      }

      const savedRecipe = payload.recipe;

      setImportedLookup((current) => ({
        ...current,
        [recipe.id]: {
          recipeId: savedRecipe.id,
          alreadyImported: Boolean(payload.alreadyImported),
        },
      }));

      showToast({
        variant: "success",
        title: payload.alreadyImported ? "Already imported" : "Recipe imported",
        message:
          payload.message ??
          (payload.alreadyImported
            ? "This recipe was already saved to your library."
            : "Recipe saved to your GravyTime library."),
        recipeId: savedRecipe.id,
      });
    } catch {
      showToast({
        variant: "error",
        title: "Import failed",
        message: "Recipe could not be imported. Please try again.",
      });
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="rounded-2xl border bg-card p-4 shadow-subtle sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void executeSearch();
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-11 pl-10"
              placeholder="Search recipes like chicken, pasta, soup..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <FilterSelect
              label="Cuisine"
              options={CUISINE_OPTIONS}
              value={cuisine}
              onChange={setCuisine}
            />
            <FilterSelect label="Diet" options={DIET_OPTIONS} value={diet} onChange={setDiet} />
            <FilterSelect
              label="Max time"
              options={MAX_READY_TIME_OPTIONS}
              value={maxReadyTime}
              onChange={setMaxReadyTime}
            />
            <FilterSelect
              label="Results"
              options={RESULT_COUNT_OPTIONS.map((option) => ({
                label: String(option),
                value: String(option),
              }))}
              value={resultCount}
              onChange={setResultCount}
            />
            <Button className="h-11 gap-2 self-end" disabled={isSearching} type="submit">
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Search
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gravy-charcoal">Intolerances</p>
              <p className="text-xs text-muted-foreground">
                {intoleranceCount === 0 ? "Any" : `${intoleranceCount} selected`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTOLERANCE_OPTIONS.map((option) => {
                const isSelected = selectedIntolerances.includes(option.value);

                return (
                  <button
                    key={option.value}
                    aria-pressed={isSelected}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-gravy-gold bg-gravy-gold text-white shadow-subtle"
                        : "border-gravy-gold/25 bg-gravy-gold/10 text-gravy-brown hover:bg-gravy-gold/15",
                    )}
                    type="button"
                    onClick={() => toggleIntolerance(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </form>

      <section className="rounded-2xl border bg-card p-4 shadow-subtle sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Popular searches</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {POPULAR_SEARCHES.map((term) => (
            <button
              key={term}
              type="button"
              className="rounded-full border border-border bg-gravy-paper px-3 py-1.5 text-xs font-semibold text-gravy-charcoal transition hover:bg-secondary"
              onClick={() => {
                setQuery(term);
                void executeSearch(term);
              }}
            >
              {term}
            </button>
          ))}
        </div>

        {recentSearches.length > 0 ? (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent searches
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="rounded-full border border-gravy-gold/30 bg-gravy-gold/10 px-3 py-1.5 text-xs font-semibold text-gravy-brown transition hover:bg-gravy-gold/20"
                  onClick={() => {
                    setQuery(term);
                    void executeSearch(term);
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {searchError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-gravy-brown/35 bg-gravy-brown/10 p-4 text-sm text-gravy-brown">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{searchError}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border bg-card p-4 shadow-subtle sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gravy-charcoal">Browse results</h2>
            <p className="text-sm text-muted-foreground">{resultCopy}</p>
          </div>
          {hasSearched ? <Badge variant="neutral">Spoonacular</Badge> : null}
        </div>

        {isSearching ? (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-dashed bg-gravy-paper p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Looking up recipes...
          </div>
        ) : results.length > 0 ? (
          <div className="mt-5 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {results.map((result) => {
              const importMeta = importedLookup[result.id];

              return (
                <SpoonacularResultCard
                  key={result.id}
                  recipe={result}
                  importMeta={importMeta}
                  isImporting={importingId === result.id}
                  onImport={() => void handleImport(result)}
                  onPreview={() => setPreviewRecipe(result)}
                />
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed bg-gravy-paper p-8 text-center">
            <Badge variant="neutral">No results</Badge>
            <h3 className="mt-3 text-xl font-semibold text-gravy-charcoal">No recipes found</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Try broadening your search or removing one filter.
            </p>
          </div>
        )}
      </div>

      <RecipePreviewModal
        importMeta={previewRecipe ? importedLookup[previewRecipe.id] : undefined}
        isImporting={Boolean(previewRecipe && importingId === previewRecipe.id)}
        recipe={previewRecipe}
        onClose={() => setPreviewRecipe(null)}
        onImport={(recipe) => void handleImport(recipe)}
      />

      <ToastMessage toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

type SpoonacularResultCardProps = {
  recipe: NormalizedSpoonacularSearchResult;
  isImporting: boolean;
  importMeta?: { recipeId: string; alreadyImported: boolean };
  onPreview: () => void;
  onImport: () => void;
};

function SpoonacularResultCard({
  recipe,
  isImporting,
  importMeta,
  onPreview,
  onImport,
}: SpoonacularResultCardProps) {
  const badgeLabel = recipe.dishTypes[0] ?? recipe.diets[0] ?? "Recipe";
  const isImported = Boolean(importMeta);

  return (
    <article className="flex h-full min-h-[390px] flex-col overflow-hidden rounded-2xl border bg-card text-gravy-charcoal shadow-subtle transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="relative aspect-video overflow-hidden rounded-t-2xl bg-secondary">
        {recipe.image ? (
          <Image
            fill
            alt={recipe.title}
            className="object-cover"
            sizes="(min-width: 1536px) 22vw, (min-width: 1280px) 26vw, (min-width: 768px) 46vw, 100vw"
            src={recipe.image}
          />
        ) : (
          <RecipeImagePlaceholder />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-lg font-semibold leading-6 text-gravy-charcoal">{recipe.title}</h3>
            <Badge className="shrink-0" variant="blue">
              {badgeLabel}
            </Badge>
          </div>
          <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
            {recipe.summary || "Preview and import this recipe into your GravyTime library."}
          </p>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
            {formatMinutes(recipe.readyInMinutes)}
          </span>
          <span className="flex items-center gap-1.5">
            <UsersRound className="h-4 w-4 text-primary" aria-hidden="true" />
            {recipe.servings ? String(recipe.servings) : "Any"}
          </span>
          <span className="truncate">
            {(recipe.diets[0] ?? recipe.dishTypes[0] ?? "Family").slice(0, 12)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t p-4">
        <Button className="h-10 flex-1" type="button" variant="secondary" onClick={onPreview}>
          Preview
        </Button>
        <Button
          className="h-10 flex-1 gap-2"
          disabled={isImporting || isImported}
          type="button"
          variant={isImported ? "secondary" : "default"}
          onClick={onImport}
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Importing...
            </>
          ) : isImported ? (
            importMeta?.alreadyImported ? "Already Imported" : "Imported"
          ) : (
            "Import Recipe"
          )}
        </Button>
      </div>

      {importMeta ? (
        <div className="border-t border-border/60 bg-gravy-paper px-4 py-3">
          <Link className="text-sm font-medium text-primary hover:underline" href={`/recipes/${importMeta.recipeId}`}>
            View saved recipe
          </Link>
        </div>
      ) : null}
    </article>
  );
}

type RecipePreviewModalProps = {
  recipe: NormalizedSpoonacularSearchResult | null;
  isImporting: boolean;
  importMeta?: { recipeId: string; alreadyImported: boolean };
  onClose: () => void;
  onImport: (recipe: NormalizedSpoonacularSearchResult) => void;
};

function RecipePreviewModal({
  recipe,
  isImporting,
  importMeta,
  onClose,
  onImport,
}: RecipePreviewModalProps) {
  const isImported = Boolean(importMeta);

  return (
    <ModalShell
      isOpen={Boolean(recipe)}
      labelledBy="recipe-preview-title"
      describedBy="recipe-preview-description"
      panelClassName="max-h-[92vh] max-w-3xl"
      onClose={onClose}
    >
      {recipe ? (
        <>
          <header className="flex items-start justify-between gap-4 border-b bg-card px-4 py-4 sm:px-6">
            <div>
              <Badge variant="blue">Recipe preview</Badge>
              <h2 id="recipe-preview-title" className="mt-2 text-2xl font-semibold text-gravy-charcoal">
                {recipe.title}
              </h2>
            </div>
            <Button
              aria-label="Close preview"
              className="h-10 w-10 rounded-xl px-0"
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </header>

          <div className="space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="relative aspect-video overflow-hidden rounded-2xl border bg-secondary">
              {recipe.image ? (
                <Image
                  fill
                  alt={recipe.title}
                  className="object-cover"
                  sizes="(min-width: 1024px) 760px, 100vw"
                  src={recipe.image}
                />
              ) : (
                <RecipeImagePlaceholder iconClassName="h-16 w-16" />
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {(recipe.dishTypes.length > 0 ? recipe.dishTypes : recipe.diets).slice(0, 4).map((tag) => (
                <Badge key={tag} variant="blue">
                  {tag}
                </Badge>
              ))}
              {recipe.dishTypes.length === 0 && recipe.diets.length === 0 ? (
                <Badge variant="neutral">Family meal</Badge>
              ) : null}
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <PreviewMeta label="Ready time" value={formatMinutes(recipe.readyInMinutes)} />
              <PreviewMeta label="Servings" value={recipe.servings ? String(recipe.servings) : "Any"} />
              <PreviewMeta
                label="Diets"
                value={recipe.diets.length > 0 ? recipe.diets.slice(0, 2).join(", ") : "None listed"}
              />
            </div>

            <p id="recipe-preview-description" className="text-sm leading-6 text-muted-foreground">
              {recipe.summary || "Import this recipe to load full ingredients and instructions into GravyTime."}
            </p>

            {recipe.sourceUrl ? (
              <a
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                href={recipe.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                View original source
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
          </div>

          <footer className="flex flex-col gap-2 border-t bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            {importMeta ? (
              <Link className="text-sm font-medium text-primary hover:underline" href={`/recipes/${importMeta.recipeId}`}>
                View saved recipe
              </Link>
            ) : null}
            <Button className="h-11" type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              className="h-11 gap-2"
              disabled={isImporting || isImported}
              type="button"
              variant={isImported ? "secondary" : "default"}
              onClick={() => onImport(recipe)}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Importing...
                </>
              ) : isImported ? (
                importMeta?.alreadyImported ? "Already Imported" : "Imported"
              ) : (
                "Import Recipe"
              )}
            </Button>
          </footer>
        </>
      ) : null}
    </ModalShell>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
};

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      <select
        className="h-11 rounded-md border border-input bg-gravy-paper px-3 py-2 text-sm text-gravy-charcoal shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value || "any"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type PreviewMetaProps = {
  label: string;
  value: string;
};

function PreviewMeta({ label, value }: PreviewMetaProps) {
  return (
    <div className="rounded-xl border bg-gravy-paper p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold text-gravy-charcoal">{value}</p>
    </div>
  );
}

type ToastMessageProps = {
  toast: ToastState | null;
  onClose: () => void;
};

function ToastMessage({ toast, onClose }: ToastMessageProps) {
  if (!toast) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-[70] w-[min(24rem,calc(100vw-2rem))] rounded-2xl border bg-card p-4 shadow-soft lg:bottom-6">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            toast.variant === "success" ? "bg-primary/15 text-primary" : "bg-gravy-brown/15 text-gravy-brown",
          )}
        >
          {toast.variant === "success" ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gravy-charcoal">{toast.title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{toast.message}</p>
          {toast.recipeId ? (
            <Link className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" href={`/recipes/${toast.recipeId}`}>
              Open recipe
              <Soup className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        <button
          aria-label="Close notification"
          className="rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-gravy-charcoal"
          type="button"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
