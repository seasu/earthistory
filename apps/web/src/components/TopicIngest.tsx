
import React, { useState } from "react";
import { useLocale } from "../i18n";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const TopicIngest: React.FC = () => {
    const { t } = useLocale();
    const [topic, setTopic] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleIngest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setStatus("loading");
        setMessage("");

        try {
            const res = await fetch(`${API_BASE_URL}/ingestion/topic`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Unknown error");
            }

            setStatus("success");
            setMessage(t("ingestSuccess", { count: data.inserted }));
            setTopic("");

            // Clear success message after 3 seconds
            setTimeout(() => {
                setStatus("idle");
                setMessage("");
            }, 5000);

        } catch (err) {
            setStatus("error");
            setMessage(t("ingestError") + (err instanceof Error ? err.message : String(err)));
        }
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
        </div>
    );
};
