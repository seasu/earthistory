
import React, { useState } from "react";
import { useLocale } from "../i18n";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const INGEST_ENDPOINTS = [`${API_BASE_URL}/ingestion/topic`, `${API_BASE_URL}/topic`] as const;

type IngestResponse = {
    error?: string;
    message?: string;
    scanned?: number;
    inserted?: number;
    devMode?: boolean;
    suggestions?: string[];
};

export const TopicIngest: React.FC = () => {
    const { t } = useLocale();
    const [topic, setTopic] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const postTopic = async (url: string, value: string) => {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic: value }),
        });

        let data: IngestResponse = {};
        try {
            data = (await response.json()) as IngestResponse;
        } catch {
            // Keep empty object for non-JSON error responses.
        }

        return { response, data };
    };

    const handleIngest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setStatus("loading");
        setMessage("");
        setSuggestions([]);

        try {
            let lastResponse: Response | null = null;
            let data: IngestResponse = {};

            for (const endpoint of INGEST_ENDPOINTS) {
                const result = await postTopic(endpoint, topic);
                lastResponse = result.response;
                data = result.data;

                if (result.response.ok || result.response.status !== 404) {
                    break;
                }
            }

            if (!lastResponse) {
                throw new Error("Request failed");
            }

            if (!lastResponse.ok) {
                throw new Error(data.error || data.message || `Request failed with status ${lastResponse.status}`);
            }

            // Handle zero results with suggestions
            if (data.scanned === 0 && data.suggestions) {
                setStatus("error");
                setMessage(t("noEventsFound"));
                setSuggestions(data.suggestions);
                return;
            }

            setStatus("success");
            // In dev mode, show scanned count; in production, show inserted count
            const count = data.devMode ? (data.scanned ?? 0) : (data.inserted ?? 0);
            const messageKey = data.devMode ? "ingestSuccessDev" : "ingestSuccess";
            setMessage(t(messageKey, { count }));
            setTopic("");

            // Clear success message after 5 seconds
            setTimeout(() => {
                setStatus("idle");
                setMessage("");
            }, 5000);

        } catch (err) {
            setStatus("error");
            setMessage(t("ingestError") + ": " + (err instanceof Error ? err.message : String(err)));
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setTopic(suggestion);
        setSuggestions([]);
        setStatus("idle");
        setMessage("");
    };

    return (
        <div className="topic-ingest-container">
            <h3>{t("ingestTopic")}</h3>
            <form onSubmit={handleIngest} className="ingest-form">
                <div className="ingest-input-group">
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={t("ingestPlaceholder")}
                        disabled={status === "loading"}
                    />
                    <button type="submit" disabled={status === "loading" || !topic.trim()}>
                        {status === "loading" ? "..." : "Go"}
                    </button>
                </div>
            </form>

            {status === "loading" && <p className="ingest-status loading">{t("ingesting")}</p>}
            {status === "success" && <p className="ingest-status success">{message}</p>}
            {status === "error" && <p className="ingest-status error">{message}</p>}

            {suggestions.length > 0 && (
                <div className="suggestions">
                    <p className="suggestions-label">{t("trySuggestions")}</p>
                    <div className="suggestions-list">
                        {suggestions.map((suggestion, idx) => (
                            <button
                                key={idx}
                                className="suggestion-chip"
                                onClick={() => handleSuggestionClick(suggestion)}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
