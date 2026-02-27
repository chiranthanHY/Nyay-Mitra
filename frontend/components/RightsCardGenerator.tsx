"use client";

import { useState, useRef, useCallback } from "react";
import { Shield, Download, X, Loader2, ChevronRight, Phone, Scale, BookOpen, AlertTriangle } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface RightsCardData {
    title: string;
    situation: string;
    situation_summary: string;
    icon: string;
    language: string;
    your_rights: string[];
    they_cannot: string[];
    do_next: string[];
    emergency_contacts: string[];
    relevant_laws: string[];
    is_mock?: boolean;
}

interface SituationOption {
    id: string;
    label: string;
    icon: string;
    description: string;
    color: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SITUATIONS: SituationOption[] = [
    {
        id: "arrested",
        label: "Arrested / Detained",
        icon: "🚔",
        description: "Police arrested or detained you",
        color: "#EF4444",
    },
    {
        id: "evicted",
        label: "Being Evicted",
        icon: "🏠",
        description: "Landlord is forcing you out",
        color: "#F59E0B",
    },
    {
        id: "fired",
        label: "Fired from Job",
        icon: "💼",
        description: "Wrongfully terminated by employer",
        color: "#8B5CF6",
    },
    {
        id: "cheated",
        label: "Cheated by Vendor",
        icon: "🛒",
        description: "Consumer fraud or scam victim",
        color: "#10B981",
    },
];

const LANGUAGES = [
    { id: "English", label: "English", native: "English" },
    { id: "Hindi", label: "Hindi", native: "हिन्दी" },
    { id: "Kannada", label: "Kannada", native: "ಕನ್ನಡ" },
];

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
    isOpen: boolean;
    onClose: () => void;
    location: string;
}

export default function RightsCardGenerator({ isOpen, onClose, location }: Props) {
    const [step, setStep] = useState<"select" | "configure" | "result">("select");
    const [selectedSituation, setSelectedSituation] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState("English");
    const [isGenerating, setIsGenerating] = useState(false);
    const [cardData, setCardData] = useState<RightsCardData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const cardRef = useRef<HTMLDivElement>(null);

    const handleSituationSelect = (situationId: string) => {
        setSelectedSituation(situationId);
        setStep("configure");
    };

    const handleGenerate = useCallback(async () => {
        if (!selectedSituation) return;
        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch("/api/rights-card", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    situation: selectedSituation,
                    language: selectedLanguage,
                    location: location,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error: ${response.status}`);
            }

            const data: RightsCardData = await response.json();
            setCardData(data);
            setStep("result");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to generate card";
            if (message.includes("Failed to fetch") || message.includes("ECONNREFUSED")) {
                setError("Backend not connected. Please start the backend server.");
            } else {
                setError(message);
            }
        } finally {
            setIsGenerating(false);
        }
    }, [selectedSituation, selectedLanguage, location]);

    const handleDownload = useCallback(async () => {
        if (!cardRef.current) return;

        try {
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: "#0f0f1a",
                scale: 2,
                useCORS: true,
                logging: false,
            });
            const link = document.createElement("a");
            link.download = `NyayMitra-Rights-Card-${selectedSituation}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (err) {
            console.error("Download error:", err);
            setError("Failed to download. Please try again.");
        }
    }, [selectedSituation]);

    const handleBack = () => {
        if (step === "result") {
            setStep("configure");
            setCardData(null);
        } else if (step === "configure") {
            setStep("select");
            setSelectedSituation(null);
        }
    };

    const handleReset = () => {
        setStep("select");
        setSelectedSituation(null);
        setSelectedLanguage("English");
        setCardData(null);
        setError(null);
    };

    if (!isOpen) return null;

    const situationInfo = SITUATIONS.find((s) => s.id === selectedSituation);

    return (
        <div className="rights-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="rights-modal">
                {/* Header */}
                <div className="rights-modal-header">
                    <div className="rights-modal-header-left">
                        {step !== "select" && (
                            <button className="rights-back-btn" onClick={handleBack} aria-label="Go back">
                                <ChevronRight size={18} style={{ transform: "rotate(180deg)" }} />
                            </button>
                        )}
                        <Shield size={20} className="rights-header-icon" />
                        <div>
                            <h2 className="rights-modal-title">Know Your Rights</h2>
                            <p className="rights-modal-subtitle">
                                {step === "select" && "Select your situation"}
                                {step === "configure" && `${situationInfo?.icon} ${situationInfo?.label}`}
                                {step === "result" && "Your Rights Card"}
                            </p>
                        </div>
                    </div>
                    <button className="rights-close-btn" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="rights-modal-body">
                    {/* ── Step 1: Situation Select ── */}
                    {step === "select" && (
                        <div className="rights-situations">
                            <p className="rights-step-label">What happened to you?</p>
                            <div className="rights-situation-grid">
                                {SITUATIONS.map((sit) => (
                                    <button
                                        key={sit.id}
                                        id={`situation-${sit.id}`}
                                        className="rights-situation-card"
                                        style={{ "--sit-color": sit.color } as React.CSSProperties}
                                        onClick={() => handleSituationSelect(sit.id)}
                                    >
                                        <span className="rights-sit-icon">{sit.icon}</span>
                                        <span className="rights-sit-label">{sit.label}</span>
                                        <span className="rights-sit-desc">{sit.description}</span>
                                        <ChevronRight size={16} className="rights-sit-arrow" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Step 2: Configure ── */}
                    {step === "configure" && (
                        <div className="rights-configure">
                            <div className="rights-config-section">
                                <p className="rights-step-label">Choose language</p>
                                <div className="rights-lang-pills">
                                    {LANGUAGES.map((lang) => (
                                        <button
                                            key={lang.id}
                                            id={`lang-${lang.id}`}
                                            className={`rights-lang-pill ${selectedLanguage === lang.id ? "active" : ""}`}
                                            onClick={() => setSelectedLanguage(lang.id)}
                                        >
                                            <span className="rights-lang-native">{lang.native}</span>
                                            <span className="rights-lang-label">{lang.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rights-config-section">
                                <p className="rights-step-label">Your location</p>
                                <div className="rights-location-display">
                                    📍 {location || "Bengaluru, Karnataka"}
                                </div>
                            </div>

                            {error && (
                                <div className="rights-error">
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            <button
                                id="generate-card-btn"
                                className="rights-generate-btn"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="rights-spinner" />
                                        Generating your rights card...
                                    </>
                                ) : (
                                    <>
                                        <Shield size={18} />
                                        Generate Rights Card
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* ── Step 3: Result Card ── */}
                    {step === "result" && cardData && (
                        <div className="rights-result">
                            {/* Action buttons */}
                            <div className="rights-actions">
                                <button
                                    id="download-card-btn"
                                    className="rights-download-btn"
                                    onClick={handleDownload}
                                >
                                    <Download size={16} /> Download as Image
                                </button>
                                <button className="rights-new-btn" onClick={handleReset}>
                                    Generate Another
                                </button>
                            </div>

                            {/* The Card */}
                            <div className="rights-card-wrapper">
                                <div className="rights-card" ref={cardRef}>
                                    {/* Card Header */}
                                    <div className="rc-header" style={{ "--sit-color": situationInfo?.color || "#7C3AED" } as React.CSSProperties}>
                                        <div className="rc-header-top">
                                            <span className="rc-logo-icon">⚖️</span>
                                            <span className="rc-brand">NyayMitra • न्याय मित्र</span>
                                        </div>
                                        <div className="rc-title">{cardData.title}</div>
                                        <div className="rc-summary">{cardData.situation_summary}</div>
                                    </div>

                                    {/* Your Rights */}
                                    <div className="rc-section">
                                        <div className="rc-section-header rc-rights">
                                            <Scale size={14} />
                                            <span>✅ Your Rights</span>
                                        </div>
                                        <ul className="rc-list">
                                            {cardData.your_rights.map((r, i) => (
                                                <li key={i}>{r}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* They Cannot */}
                                    <div className="rc-section">
                                        <div className="rc-section-header rc-cannot">
                                            <AlertTriangle size={14} />
                                            <span>🚫 They Cannot</span>
                                        </div>
                                        <ul className="rc-list rc-list-cannot">
                                            {cardData.they_cannot.map((r, i) => (
                                                <li key={i}>{r}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Do Next */}
                                    <div className="rc-section">
                                        <div className="rc-section-header rc-next">
                                            <ChevronRight size={14} />
                                            <span>➡️ Do Next</span>
                                        </div>
                                        <ol className="rc-list rc-list-ordered">
                                            {cardData.do_next.map((r, i) => (
                                                <li key={i}>{r}</li>
                                            ))}
                                        </ol>
                                    </div>

                                    {/* Emergency Contacts */}
                                    <div className="rc-section rc-contacts-section">
                                        <div className="rc-section-header rc-contacts">
                                            <Phone size={14} />
                                            <span>📞 Emergency Contacts</span>
                                        </div>
                                        <div className="rc-contacts-grid">
                                            {cardData.emergency_contacts.map((c, i) => (
                                                <div key={i} className="rc-contact-item">{c}</div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Laws */}
                                    <div className="rc-section">
                                        <div className="rc-section-header rc-laws">
                                            <BookOpen size={14} />
                                            <span>📖 Relevant Laws</span>
                                        </div>
                                        <ul className="rc-list rc-list-laws">
                                            {cardData.relevant_laws.map((l, i) => (
                                                <li key={i}>{l}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Footer */}
                                    <div className="rc-footer">
                                        <div className="rc-footer-brand">
                                            ⚖️ NyayMitra — न्याय मित्र • Your AI Legal Companion
                                        </div>
                                        <div className="rc-footer-disclaimer">
                                            ⚠️ General information only. Not legal advice. Always consult a qualified lawyer.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
