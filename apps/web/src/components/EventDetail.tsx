
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

                {/* Title with Wikipedia icon on the right */}
                <div className="event-title-row">
                    <h3>{event.title}</h3>
                    {(event.wikipediaUrl || wikiData?.contentUrl) && (
                        <a
                            href={displaySourceUrl}
                            rel="noreferrer"
                            target="_blank"
                            className="wikipedia-icon-link"
                            title={t("readMore")}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="wikipedia-icon">
                                <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-.93L8.45 5.125c-.25-.458-.506-.797-.766-.991-.261-.193-.57-.289-.928-.289l-.355-.027c-.141-.016-.215-.074-.215-.173v-.446l.049-.045s2.905-.005 3.802 0l.052.045v.447c0 .08-.08.143-.241.167l-.461.029c-.344.025-.558.112-.644.249-.09.137-.033.436.171.896l2.143 4.457 2.093-4.213c.139-.281.21-.488.21-.619 0-.173-.085-.296-.256-.375-.098-.045-.481-.067-1.15-.067l-.075-.05v-.431l.055-.045s2.509 0 3.398.005l.05.05v.436c-.001.119-.075.181-.225.181-.391.025-.697.125-.916.301-.22.175-.511.55-.877 1.122L13.846 9.98l2.966 5.852s.011.001.03-.002c.016-.002.094-.042.234-.119 1.395-.765 2.479-1.837 3.182-2.969.703-1.132 1.055-2.43 1.055-3.895 0-1.416-.318-2.726-.955-3.93-.637-1.204-1.517-2.146-2.641-2.828C16.596.487 15.272.146 13.743.146c-1.41 0-2.688.269-3.834.807-1.146.538-2.057 1.291-2.731 2.258s-1.012 2.073-1.012 3.316c0 1.302.421 2.385 1.264 3.249.843.864 1.948 1.296 3.316 1.296.645 0 1.178-.085 1.598-.254.421-.17.782-.427 1.085-.77l.223-.285-.028-.135z"/>
                            </svg>
                        </a>
                    )}
                </div>

                {/* Time displayed prominently below title */}
                <p className={isMobile ? "mobile-card-time" : "event-detail-time"}>
                    {formatYear(event.timeStart)}
                    {event.timeEnd ? ` \u2013 ${formatYear(event.timeEnd)}` : ""}
                </p>

                <div className="event-summary-container">
                    {isWikiLoading && <p className="status loading">{t("loading")}...</p>}
                    <p className="event-summary">
                        {displaySummary}
                    </p>
                    {wikiError && <p className="status error" style={{ fontSize: '0.8em' }}>Wiki Error: {wikiError}</p>}
                </div>

                <ul>
                    <li>{t("regionLabel")}{event.regionName}</li>
                    <li>{t("precisionLabel")}{tPrecision(event.precisionLevel)}</li>
                    <li>{t("confidenceLabel")}{(event.confidenceScore * 100).toFixed(0)}%</li>
                </ul>

                <div className="event-detail-links">
                    <a href={event.sourceUrl} rel="noreferrer" target="_blank">
                        {t("source")}
                    </a>
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
