import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "en" | "zh-TW";

const STORAGE_KEY = "earthistory-locale";

const strings: Record<string, Record<Locale, string>> = {
  events: { en: "Events", "zh-TW": "\u4e8b\u4ef6" },
  eventsInView: { en: "{count} events in view", "zh-TW": "\u986f\u793a {count} \u500b\u4e8b\u4ef6" },
  loading: { en: "Loading...", "zh-TW": "\u8f09\u5165\u4e2d\u2026" },
  retry: { en: "Retry", "zh-TW": "\u91cd\u8a66" },
  noEvents: { en: "No events in this time window.", "zh-TW": "\u6b64\u6642\u9593\u7bc4\u570d\u5167\u7121\u4e8b\u4ef6" },
  filters: { en: "Filters", "zh-TW": "\u7be9\u9078" },
  category: { en: "Category", "zh-TW": "\u5206\u985e" },
  region: { en: "Region", "zh-TW": "\u5730\u5340" },
  youtube: { en: "YouTube", "zh-TW": "YouTube \u5f71\u7247" },
  keyword: { en: "Keyword", "zh-TW": "\u95dc\u9375\u5b57" },
  allCategories: { en: "All categories", "zh-TW": "\u6240\u6709\u5206\u985e" },
  allRegions: { en: "All regions", "zh-TW": "\u6240\u6709\u5730\u5340" },
  allYoutube: { en: "All videos", "zh-TW": "\u6240\u6709\u5f71\u7247" },
  withYoutube: { en: "With YouTube", "zh-TW": "\u6709 YouTube" },
  withoutYoutube: { en: "Without YouTube", "zh-TW": "\u7121 YouTube" },
  searchPlaceholder: { en: "Search...", "zh-TW": "\u641c\u5c0b\u2026" },
  regionLabel: { en: "Region: ", "zh-TW": "\u5730\u5340\uff1a" },
  timeLabel: { en: "Time: ", "zh-TW": "\u6642\u9593\uff1a" },
  precisionLabel: { en: "Precision: ", "zh-TW": "\u7cbe\u78ba\u5ea6\uff1a" },
  confidenceLabel: { en: "Confidence: ", "zh-TW": "\u4fe1\u5fc3\u5ea6\uff1a" },
  source: { en: "Source", "zh-TW": "\u4f86\u6e90" },
  collapse: { en: "Collapse event panel", "zh-TW": "\u6536\u5408\u4e8b\u4ef6\u9762\u677f" },
  expand: { en: "Expand event panel", "zh-TW": "\u5c55\u958b\u4e8b\u4ef6\u9762\u677f" },
  close: { en: "Close event panel", "zh-TW": "\u95dc\u9589\u4e8b\u4ef6\u9762\u677f" },
  closeEvents: { en: "Close events", "zh-TW": "\u95dc\u9589\u4e8b\u4ef6" },
  closeFilters: { en: "Close filters", "zh-TW": "\u95dc\u9589\u7be9\u9078" },
  toggleEvents: { en: "Toggle events", "zh-TW": "\u5207\u63db\u4e8b\u4ef6" },
  toggleFilters: { en: "Toggle filters", "zh-TW": "\u5207\u63db\u7be9\u9078" },
  prevEvent: { en: "Previous event", "zh-TW": "\u4e0a\u4e00\u500b\u4e8b\u4ef6" },
  nextEvent: { en: "Next event", "zh-TW": "\u4e0b\u4e00\u500b\u4e8b\u4ef6" },
  windowHint: { en: "\u00b150 years", "zh-TW": "\u00b150 \u5e74" },
  yearUnit: { en: "years", "zh-TW": "\u5e74" },
  customRange: { en: "Custom", "zh-TW": "\u81ea\u8a02" },
  fromYear: { en: "From year", "zh-TW": "\u8d77\u59cb\u5e74" },
  toYear: { en: "To year", "zh-TW": "\u7d50\u675f\u5e74" },
  apply: { en: "Apply", "zh-TW": "\u5957\u7528" },
  eventError: { en: "Event load error: ", "zh-TW": "\u4e8b\u4ef6\u8f09\u5165\u932f\u8aa4\uff1a" },
  regionError: { en: "Region error: ", "zh-TW": "\u5730\u5340\u932f\u8aa4\uff1a" },
  year: { en: "year", "zh-TW": "\u5e74" },
  decade: { en: "decade", "zh-TW": "\u5341\u5e74" },
  century: { en: "century", "zh-TW": "\u4e16\u7d00" },
  ingestTopic: { en: "Ingest Topic", "zh-TW": "\u4e3b\u984c\u64f4\u5145" },
  ingestPlaceholder: { en: "Enter topic (e.g. WWII)", "zh-TW": "\u8fe0\u5165\u4e3b\u984c (\u4f8b\uff1a\u4e8c\u6230)" },
  ingesting: { en: "Finding events...", "zh-TW": "\u6b63\u5728\u641c\u5c0b\u4e8b\u4ef6..." },
  ingestSuccess: { en: "Ingested {count} events!", "zh-TW": "\u6210\u529f\u532f\u5165 {count} \u500b\u4e8b\u4ef6\uff01" },
  ingestSuccessDev: { en: "[DEV] Found {count} events (not saved)", "zh-TW": "[\u958b\u767c\u6a21\u5f0f] \u627e\u5230 {count} \u500b\u4e8b\u4ef6\uff08\u672a\u5132\u5b58\uff09" },
  ingestError: { en: "Ingestion failed: ", "zh-TW": "\u532f\u5165\u5931\u6557\uff1a" },
  noEventsFound: { en: "No events found for this topic.", "zh-TW": "\u627e\u4e0d\u5230\u6b64\u4e3b\u984c\u7684\u4e8b\u4ef6\u3002" },
  trySuggestions: { en: "Try these instead:", "zh-TW": "\u8a66\u8a66\u9019\u4e9b\u4e3b\u984c\uff1a" },
  readMore: { en: "Read full article on Wikipedia", "zh-TW": "\u5728 Wikipedia \u95b1\u8b80\u5b8c\u6574\u6587\u7ae0" },
  dataFrom: { en: "Data from", "zh-TW": "\u8cc7\u6599\u4f86\u6e90\uff1a" },
  search: { en: "Search", "zh-TW": "\u641c\u5c0b" },
  confirmingIngest: { en: "Adding to database...", "zh-TW": "\u6b63\u5728\u52a0\u5165\u8cc7\u6599\u5eab..." },
  confirming: { en: "Confirming...", "zh-TW": "\u78ba\u8a8d\u4e2d..." },
  confirm: { en: "Confirm & Add", "zh-TW": "\u78ba\u8a8d\u4e26\u52a0\u5165" },
  back: { en: "Back", "zh-TW": "\u8fd4\u56de" },
  andMoreEvents: { en: "...and {count} more events", "zh-TW": "...\u4ee5\u53ca\u53e6\u5916 {count} \u500b\u4e8b\u4ef6" },
};

const categoryMap: Record<string, Record<Locale, string>> = {
  civilization: { en: "civilization", "zh-TW": "\u6587\u660e" },
  politics: { en: "politics", "zh-TW": "\u653f\u6cbb" },
  war: { en: "war", "zh-TW": "\u6230\u722d" },
  culture: { en: "culture", "zh-TW": "\u6587\u5316" },
  religion: { en: "religion", "zh-TW": "\u5b97\u6559" },
  technology: { en: "technology", "zh-TW": "\u79d1\u6280" },
  exploration: { en: "exploration", "zh-TW": "\u63a2\u7d22" },
  science: { en: "science", "zh-TW": "\u79d1\u5b78" },
};

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatYear: (value: number) => string;
  tCategory: (cat: string) => string;
  tPrecision: (p: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const detectInitialLocale = (): Locale => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "zh-TW") return stored;
  } catch { /* ignore */ }
  const lang = navigator.language;
  if (lang.startsWith("zh")) return "zh-TW";
  return "en";
};

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let text = strings[key]?.[locale] ?? strings[key]?.en ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }, [locale]);

  const formatYear = useCallback((value: number): string => {
    if (locale === "zh-TW") {
      if (value < 0) return `\u897f\u5143\u524d ${Math.abs(value)} \u5e74`;
      return `\u897f\u5143 ${value} \u5e74`;
    }
    if (value < 0) return `${Math.abs(value)} BCE`;
    return `${value} CE`;
  }, [locale]);

  const tCategory = useCallback((cat: string): string => {
    return categoryMap[cat]?.[locale] ?? cat;
  }, [locale]);

  const tPrecision = useCallback((p: string): string => {
    return strings[p]?.[locale] ?? p;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, formatYear, tCategory, tPrecision }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
};