import React, { useState } from "react";
import { useLocale } from "../i18n";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

type PreviewEvent = {
  title: string;
  summary: string;
  timeStart: number;
  timeEnd: number | null;
  category: string;
  regionName: string;
  lat: number;
  lng: number;
  wikipediaUrl: string | null;
  sourceUrl: string;
};

type TopicIngestProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (events: PreviewEvent[]) => void;
};

export const TopicIngest: React.FC<TopicIngestProps> = ({ isOpen, onClose, onConfirm }) => {
  const { t, formatYear } = useLocale();
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<"idle" | "searching" | "preview" | "confirming" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [previewEvents, setPreviewEvents] = useState<PreviewEvent[]>([]);
  const [qid, setQid] = useState("");
  const [topicLabel, setTopicLabel] = useState("");

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setStatus("searching");
    setMessage("");
    setSuggestions([]);
    setPreviewEvents([]);

    try {
      const res = await fetch(`${API_BASE_URL}/ingestion/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unknown error");
      }

      // Handle zero results with suggestions
      if (data.events.length === 0 && data.suggestions) {
        setStatus("error");
        setMessage(t("noEventsFound"));
        setSuggestions(data.suggestions);
        return;
      }

      // Show preview
      setStatus("preview");
      setPreviewEvents(data.events);
      setQid(data.qid);
      setTopicLabel(data.topicLabel);
    } catch (err) {
      setStatus("error");
      setMessage(t("ingestError") + ": " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleConfirm = async () => {
    setStatus("confirming");
    setMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/ingestion/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicLabel, qid }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unknown error");
      }

      setStatus("success");
      setMessage(t("ingestSuccess", { count: data.inserted }));

      // Notify parent to update map
      onConfirm(previewEvents);

      // Auto close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setStatus("error");
      setMessage(t("ingestError") + ": " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleClose = () => {
    setTopic("");
    setStatus("idle");
    setMessage("");
    setSuggestions([]);
    setPreviewEvents([]);
    setQid("");
    setTopicLabel("");
    onClose();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setTopic(suggestion);
    setSuggestions([]);
    setStatus("idle");
    setMessage("");
  };

  return (
    <>
      {/* Backdrop */}
      <div className="topic-ingest-backdrop" onClick={handleClose} />

      {/* Dialog */}
      <div className="topic-ingest-dialog">
        <div className="topic-ingest-header">
          <h2>{t("ingestTopic")}</h2>
          <button
            className="topic-ingest-close"
            onClick={handleClose}
            type="button"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="topic-ingest-body">
          {/* Search form */}
          {status !== "preview" && status !== "success" && (
            <form onSubmit={handleSearch} className="topic-search-form">
              <div className="topic-search-input-group">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t("ingestPlaceholder")}
                  disabled={status === "searching"}
                  autoFocus
                />
                <button type="submit" disabled={status === "searching" || !topic.trim()}>
                  {status === "searching" ? "..." : t("search")}
                </button>
              </div>
            </form>
          )}

          {/* Status messages */}
          {status === "searching" && <p className="topic-status loading">{t("ingesting")}</p>}
          {status === "confirming" && <p className="topic-status loading">{t("confirmingIngest")}</p>}
          {status === "success" && <p className="topic-status success">{message}</p>}
          {status === "error" && <p className="topic-status error">{message}</p>}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="topic-suggestions">
              <p className="topic-suggestions-label">{t("trySuggestions")}</p>
              <div className="topic-suggestions-list">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="topic-suggestion-chip"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview results */}
          {status === "preview" && previewEvents.length > 0 && (
            <div className="topic-preview">
              <div className="topic-preview-header">
                <h3>{topicLabel}</h3>
                <p className="topic-preview-count">{previewEvents.length} {t("events")}</p>
              </div>

              <div className="topic-preview-list">
                {previewEvents.slice(0, 10).map((event, idx) => (
                  <div key={idx} className="topic-preview-item">
                    <div className="topic-preview-item-header">
                      <h4>{event.title}</h4>
                      <span className="topic-preview-item-year">
                        {formatYear(event.timeStart)}
                      </span>
                    </div>
                    <p className="topic-preview-item-summary">{event.summary}</p>
                    <div className="topic-preview-item-meta">
                      <span className="topic-preview-item-category">{event.category}</span>
                      <span className="topic-preview-item-region">{event.regionName}</span>
                    </div>
                  </div>
                ))}
                {previewEvents.length > 10 && (
                  <p className="topic-preview-more">
                    {t("andMoreEvents", { count: previewEvents.length - 10 })}
                  </p>
                )}
              </div>

              <div className="topic-preview-actions">
                <button
                  className="topic-btn topic-btn-secondary"
                  onClick={() => setStatus("idle")}
                  type="button"
                >
                  {t("back")}
                </button>
                <button
                  className="topic-btn topic-btn-primary"
                  onClick={handleConfirm}
                  type="button"
                  disabled={status === "confirming"}
                >
                  {status === "confirming" ? t("confirming") : t("confirm")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
