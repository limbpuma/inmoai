"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Mic, MicOff, Settings, X, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { VoiceIndicator } from "./VoiceIndicator";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { localeSpeechCodes, type Locale } from "@/i18n/config";

interface SearchBarProps {
    onSearch?: (query: string) => void;
    onQueryChange?: (query: string) => void;
    className?: string;
    variant?: "default" | "hero" | "minimal";
    placeholder?: string;
    isLoading?: boolean;
    defaultValue?: string;
}

export function SearchBar({
    onSearch,
    onQueryChange,
    className,
    variant = "default",
    placeholder,
    isLoading = false,
    defaultValue = "",
}: SearchBarProps) {
    const t = useTranslations("search");
    const tc = useTranslations("common");
    const locale = useLocale() as Locale;
    const resolvedPlaceholder = placeholder ?? (variant === "minimal" ? t("placeholderMinimal") : t("placeholder"));
    const [query, setQuery] = useState(defaultValue);
    const [showSuggestions, setShowSuggestions] = useState(false);
    // Track if component is mounted to avoid hydration mismatch
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Voice search hook
    const {
        status: voiceStatus,
        transcript,
        interimTranscript,
        error: voiceError,
        isSupported: voiceSupported,
        isListening,
        startListening,
        stopListening,
    } = useVoiceSearch({
        language: localeSpeechCodes[locale],
        onResult: useCallback((text: string, isFinal: boolean) => {
            setQuery(text);
            onQueryChange?.(text);
        }, [onQueryChange]),
        onEnd: useCallback((finalTranscript: string) => {
            if (finalTranscript.trim()) {
                setQuery(finalTranscript);
                onQueryChange?.(finalTranscript);
                // Auto-search after voice input completes
                onSearch?.(finalTranscript);
            }
        }, [onSearch, onQueryChange]),
    });

    useEffect(() => {
        setQuery(defaultValue);
    }, [defaultValue]);

    // Update query when transcript changes
    useEffect(() => {
        if (transcript) {
            setQuery(transcript);
        }
    }, [transcript]);

    const handleSearch = () => {
        if (isListening) {
            stopListening();
        }
        onSearch?.(query);
        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
        if (e.key === "Escape") {
            setShowSuggestions(false);
            if (isListening) {
                stopListening();
            }
        }
    };

    const handleVoiceClick = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const handleClear = () => {
        setQuery("");
        onQueryChange?.("");
        setShowSuggestions(false);
    };

    const isHero = variant === "hero";
    const showVoiceIndicator = isMounted && (voiceStatus !== "idle" || voiceError);

    return (
        <div className={cn("relative w-full mx-auto", isHero ? "max-w-3xl" : "max-w-2xl", className)}>
            <div className={cn(
                "flex items-center w-full rounded-full border bg-background/95 backdrop-blur-sm shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20",
                isHero ? "h-16 px-4 py-2 text-lg shadow-xl border-transparent" : "h-12 px-4",
                isListening && "ring-2 ring-primary/50 border-primary/30"
            )}>
                <Search className={cn("text-muted-foreground ml-2 mr-3", isHero ? "h-6 w-6" : "h-5 w-5")} />
                <input
                    className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground w-full h-full"
                    placeholder={isListening ? t("listening") : resolvedPlaceholder}
                    value={isListening && interimTranscript ? query + interimTranscript : query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onQueryChange?.(e.target.value);
                        setShowSuggestions(e.target.value.length > 0);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.length > 0 && setShowSuggestions(true)}
                    disabled={isLoading || isListening}
                />

                {query && !isListening && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="mr-1 h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
                        onClick={handleClear}
                        tabIndex={-1}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}

                <div className="flex items-center gap-1 pl-2 border-l border-border/50">
                    {isMounted && voiceSupported && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "rounded-full transition-colors",
                                isListening
                                    ? "text-primary bg-primary/10 hover:bg-primary/20"
                                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                            )}
                            onClick={handleVoiceClick}
                            disabled={isLoading}
                            title={isListening ? t("stopRecording") : t("voiceSearch")}
                        >
                            {isListening ? (
                                <MicOff className={cn(isHero ? "h-5 w-5" : "h-4 w-4")} />
                            ) : (
                                <Mic className={cn(isHero ? "h-5 w-5" : "h-4 w-4")} />
                            )}
                        </Button>
                    )}

                    {!isHero && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary rounded-full hover:bg-primary/10 transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    )}

                    {isHero && (
                        <Button
                            className="rounded-full ml-2 h-12 px-8 shadow-md"
                            onClick={handleSearch}
                            disabled={isLoading || isListening}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t("searching")}
                                </>
                            ) : (
                                tc("search")
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Voice Indicator */}
            {showVoiceIndicator && (
                <VoiceIndicator
                    status={voiceStatus}
                    error={voiceError}
                    interimTranscript={interimTranscript}
                />
            )}

            {/* Dynamic Suggestions (Mock) */}
            {isHero && showSuggestions && !showVoiceIndicator && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 space-y-2">
                        <div className="text-xs font-medium text-muted-foreground px-2 uppercase tracking-wider">{t("suggestions")}</div>
                        <button
                            className="w-full flex items-center px-4 py-3 hover:bg-muted/50 rounded-xl transition-colors text-left group"
                            onClick={() => {
                                const suggestion = t("suggestion1");
                                setQuery(suggestion);
                                onQueryChange?.(suggestion);
                                onSearch?.(suggestion);
                                setShowSuggestions(false);
                            }}
                        >
                            <Search className="h-4 w-4 text-muted-foreground mr-3 group-hover:text-primary" />
                            <span>{t("suggestion1")}</span>
                            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <button
                            className="w-full flex items-center px-4 py-3 hover:bg-muted/50 rounded-xl transition-colors text-left group"
                            onClick={() => {
                                const suggestion = t("suggestion2");
                                setQuery(suggestion);
                                onQueryChange?.(suggestion);
                                onSearch?.(suggestion);
                                setShowSuggestions(false);
                            }}
                        >
                            <Search className="h-4 w-4 text-muted-foreground mr-3 group-hover:text-primary" />
                            <span>{t("suggestion2")}</span>
                            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                    <div className="bg-muted/30 px-4 py-3 text-xs text-muted-foreground flex justify-between items-center border-t border-border/50">
                        <span>{t("pressEnter")}</span>
                        <span className="flex items-center gap-2">
                            <span className="bg-background border rounded px-1.5 py-0.5 shadow-sm">esc</span> {t("toClose")}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
