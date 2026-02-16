
import React, { useEffect, useState } from "react";
import { useLocale } from "../i18n";
import { useWikipedia } from "../hooks/useWikipedia";

type EventRecord = {
    id: number;
    title: string;
    summary: string; // Database summary (fallback)
    category: string;
    regionName: string;
    precisionLevel: "year" | "decade" | "century";
    confidenceScore: number;
    timeStart: number;
    timeEnd: number | null;
    sourceUrl: string;
    lat: number;
    lng: number;
    imageUrl: string | null; // Database image (fallback)
    imageAttribution: string | null;
    wikipediaUrl: string | null;
    youtubeVideoId: string | null;
};

type EventDetailProps = {
    event: EventRecord;
    isMobile?: boolean;
};

export const EventDetail: React.FC<EventDetailProps> = ({
    event,
    isMobile = false,
}) => {
    const { t, formatYear, tCategory, tPrecision, locale } = useLocale();

    // Fetch live data from Wikipedia
    const { data: wikiData, isLoading: isWikiLoading, error: wikiError } = useWikipedia(
        event.wikipediaUrl,
        locale
    );

    // Determine what to show
    // Priority: YouTube > Wikipedia Image > Database Image
    // Priority: Wikipedia Summary > Database Summary

    const displaySummary = wikiData?.summary || event.summary;
    const displayImage = wikiData?.imageUrl || event.imageUrl;
    // If we have wiki data, use the wiki content URL, otherwise the database wiki URL or source URL
    const displaySourceUrl = wikiData?.contentUrl || event.wikipediaUrl || event.sourceUrl;

    const renderHero = () => {
        if (event.youtubeVideoId) {
            return (
                <div className={isMobile ? "mobile-card-hero mobile-card-hero-video" : "event-detail-hero event-detail-hero-video"}>
                    <iframe
                        src={`https://www.youtube.com/embed/${event.youtubeVideoId}`}
                        title={event.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            );
        }

        if (displayImage) {
            return (
                <div className={isMobile ? "mobile-card-hero" : "event-detail-hero"}>
                    <img
                        src={displayImage}
                        alt={event.title}
                        loading="lazy"
                        onError={(e) => {
                            (e.target as HTMLImageElement).parentElement!.style.display = "none";
                        }}
                    />
                    {/* We might not have attribution for Wiki images easily available in the simple API response yet, 
              but we could add it back if the DB had it or if we parse it from Wiki metadata later. 
              For now keeping DB attribution if using DB image. */}
                    {!wikiData && event.imageAttribution && (
                        <span className="image-attribution">{event.imageAttribution}</span>
                    )}
                </div>
            );
        }

        return null;
    };

    return (
        <>
            {renderHero()}

            <div className={isMobile ? "mobile-card-body" : "event-detail-body"}>
                <p className="pill">{tCategory(event.category)}</p>
                <h3>{event.title}</h3>

                {isMobile && (
                    <p className="mobile-card-time">
                        {formatYear(event.timeStart)}
                        {event.timeEnd ? ` \u2013 ${formatYear(event.timeEnd)}` : ""}
                    </p>
                )}

                <div className="event-summary-container">
                    {isWikiLoading && <p className="status loading">{t("loading")}...</p>}
                    <p className="event-summary">
                        {displaySummary}
                    </p>
                    {wikiError && <p className="status error" style={{ fontSize: '0.8em' }}>Wiki Error: {wikiError}</p>}
                </div>

                <ul>
                    <li>{t("regionLabel")}{event.regionName}</li>
                    {!isMobile && (
                        <li>
                            {t("timeLabel")}{formatYear(event.timeStart)}
                            {event.timeEnd ? ` \u2013 ${formatYear(event.timeEnd)}` : ""}
                        </li>
                    )}
                    <li>{t("precisionLabel")}{tPrecision(event.precisionLevel)}</li>
                    <li>{t("confidenceLabel")}{(event.confidenceScore * 100).toFixed(0)}%</li>
                </ul>

                <div className="event-detail-links">
                    <a href={event.sourceUrl} rel="noreferrer" target="_blank">
                        {t("source")}
                    </a>
                    {/* If we have a wiki link (either from DB or resolved), show it */}
                    {(event.wikipediaUrl || wikiData?.contentUrl) && (
                        <a
                            href={displaySourceUrl}
                            rel="noreferrer"
                            target="_blank"
                            className="wikipedia-link"
                        >
                            {t("readMore")} →
                        </a>
                    )}
                </div>

                {/* License Attribution */}
                <div className="event-detail-attribution">
                    <p className="attribution-text">
                        📚 {t("dataFrom")}{" "}
                        <a
                            href="https://www.wikidata.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="attribution-link"
                        >
                            Wikidata
                        </a>{" "}
                        (
                        <a
                            href="https://creativecommons.org/publicdomain/zero/1.0/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="attribution-link"
                        >
                            CC0
                        </a>
                        )
                        {(event.wikipediaUrl || wikiData) && (
                            <>
                                {" "}&{" "}
                                <a
                                    href="https://www.wikipedia.org"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="attribution-link"
                                >
                                    Wikipedia
                                </a>{" "}
                                (
                                <a
                                    href="https://creativecommons.org/licenses/by-sa/4.0/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="attribution-link"
                                >
                                    CC BY-SA 4.0
                                </a>
                                )
                            </>
                        )}
                    </p>
                </div>
            </div>
        </>
    );
};
