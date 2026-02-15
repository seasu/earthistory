
import { useState, useEffect } from "react";

type WikipediaData = {
    summary: string;
    imageUrl: string | null;
    contentUrl: string;
};

type UseWikipediaResult = {
    data: WikipediaData | null;
    isLoading: boolean;
    error: string | null;
};

export const useWikipedia = (
    wikiUrl: string | null,
    locale: string = "en"
): UseWikipediaResult => {
    const [data, setData] = useState<WikipediaData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!wikiUrl) {
            setData(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        const controller = new AbortController();
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Extract title from URL (e.g., https://en.wikipedia.org/wiki/Tiananmen_Square)
                // or support direct titles if we change schema later
                let title = "";
                let lang = locale === "zh-TW" ? "zh" : "en"; // Default fallback

                try {
                    const urlObj = new URL(wikiUrl);
                    const pathParts = urlObj.pathname.split("/");
                    title = decodeURIComponent(pathParts[pathParts.length - 1]);
                    // pivot: use the language from the provided URL if possible, otherwise use app locale
                    if (urlObj.hostname.includes("wikipedia.org")) {
                        lang = urlObj.hostname.split(".")[0];
                    }
                } catch {
                    // Fallback if wikiUrl is just a title or invalid URL
                    title = wikiUrl;
                }

                const endpoint = `https://${lang}.wikipedia.org/w/api.php`;
                const params = new URLSearchParams({
                    action: "query",
                    format: "json",
                    origin: "*", // Required for CORS
                    prop: "extracts|pageimages",
                    titles: title,
                    exintro: "true",
                    explaintext: "true",
                    pithumbsize: "500",
                    redirects: "true",
                });

                const res = await fetch(`${endpoint}?${params.toString()}`, {
                    signal: controller.signal,
                });

                if (!res.ok) {
                    throw new Error(`Wikipedia API error: ${res.status}`);
                }

                const json = await res.json();
                const pages = json.query?.pages;
                if (!pages) throw new Error("No pages found");

                const pageId = Object.keys(pages)[0];
                if (pageId === "-1") throw new Error("Page not found");

                const page = pages[pageId];

                setData({
                    summary: page.extract || "",
                    imageUrl: page.thumbnail?.source || null,
                    contentUrl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
                });
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(err instanceof Error ? err.message : "Failed to load Wikipedia data");
                    setData(null);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();
        return () => controller.abort();
    }, [wikiUrl, locale]);

    return { data, isLoading, error };
};
