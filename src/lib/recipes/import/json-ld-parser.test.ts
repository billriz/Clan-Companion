import { describe, expect, it } from "vitest";

import { extractRecipeDraftsFromJsonLdHtml } from "@/lib/recipes/import/json-ld-parser";

describe("extractRecipeDraftsFromJsonLdHtml", () => {
  it("parses a single Recipe JSON-LD object", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "Weeknight Pasta",
            "description": "<p>Easy and fast.</p>",
            "recipeIngredient": ["1 lb pasta", "2 cups sauce"],
            "recipeInstructions": ["Boil pasta", "Add sauce"],
            "prepTime": "PT10M",
            "cookTime": "PT20M",
            "totalTime": "PT30M",
            "recipeYield": "4 servings",
            "image": "https://cdn.example.com/pasta.jpg",
            "author": {"@type": "Person", "name": "Chef Ada"}
          }
        </script>
      </head></html>
    `;

    const drafts = extractRecipeDraftsFromJsonLdHtml(html, "https://example.com/recipes/pasta");

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      title: "Weeknight Pasta",
      ingredients: ["1 lb pasta", "2 cups sauce"],
      instructions: ["Boil pasta", "Add sauce"],
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      totalTimeMinutes: 30,
      servings: 4,
      sourceUrl: "https://example.com/recipes/pasta",
      importMethod: "jsonld",
      author: "Chef Ada",
    });
  });

  it("parses Recipe objects from arrays and @type arrays", () => {
    const html = `
      <script type="application/ld+json">
        [
          {"@type": "WebSite", "name": "Example"},
          {
            "@type": ["Thing", "Recipe"],
            "name": "Array Recipe",
            "recipeIngredient": ["1 onion"],
            "recipeInstructions": [
              {"@type": "HowToStep", "text": "Chop the onion"}
            ]
          }
        ]
      </script>
    `;

    const drafts = extractRecipeDraftsFromJsonLdHtml(html, "https://foodblog.example/array-recipe");

    expect(drafts).toHaveLength(1);
    expect(drafts[0].title).toBe("Array Recipe");
    expect(drafts[0].ingredients).toEqual(["1 onion"]);
    expect(drafts[0].instructions).toEqual(["Chop the onion"]);
  });

  it("parses recipes from @graph and handles HowToSection", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Recipe",
              "name": "Sectioned Soup",
              "recipeIngredient": ["2 cups stock", "1 carrot"],
              "recipeInstructions": [
                {
                  "@type": "HowToSection",
                  "name": "For the soup",
                  "itemListElement": [
                    {"@type": "HowToStep", "text": "Bring stock to a simmer"},
                    {"@type": "HowToStep", "text": "Add chopped carrot"}
                  ]
                }
              ],
              "publisher": {"@type": "Organization", "name": "Soup Daily"}
            }
          ]
        }
      </script>
    `;

    const drafts = extractRecipeDraftsFromJsonLdHtml(html, "https://soups.example/sectioned-soup");

    expect(drafts).toHaveLength(1);
    expect(drafts[0].sourceName).toBe("Soup Daily");
    expect(drafts[0].instructions).toEqual([
      "For the soup:",
      "Bring stock to a simmer",
      "Add chopped carrot",
    ]);
  });
});
