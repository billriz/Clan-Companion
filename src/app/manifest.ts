import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plate Plan",
    short_name: "PlatePlan",
    description:
      "Plan meals, save recipes, import recipes, scan recipe cards, and build shopping lists.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#6D8B74",
    background_color: "#F6F3EE",
    lang: "en",
    categories: ["food", "lifestyle", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Recipes",
        short_name: "Recipes",
        description: "Open your saved recipes",
        url: "/recipes",
      },
      {
        name: "Meal Planner",
        short_name: "Planner",
        description: "Plan meals for the week",
        url: "/meal-planner",
      },
      {
        name: "Shopping List",
        short_name: "Shopping",
        description: "View shopping list",
        url: "/shopping-list",
      },
      {
        name: "Scan Recipe",
        short_name: "Scan",
        description: "Scan and import a recipe card",
        url: "/recipes/import/scan",
      },
    ],
  };
}
