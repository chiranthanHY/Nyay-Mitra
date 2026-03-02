"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Send, ChevronDown, Image, X, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface GradientColors {
    topLeft: string;
    topRight: string;
    bottomRight: string;
    bottomLeft: string;
}

interface ThemeGradients {
    light: GradientColors;
    dark: GradientColors;
}

interface DropdownOption {
    id: string;
    label: string;
    value: string;
}

interface GradientAIChatInputProps {
    placeholder?: string;
    onSend?: (message: string) => void;
    onFileAttach?: () => void;
    enableAnimations?: boolean;
    className?: string;
    disabled?: boolean;

    // Dropdown options
    dropdownOptions?: DropdownOption[];
    onOptionSelect?: (option: DropdownOption) => void;

    // Gradient customization - now theme-aware
    mainGradient?: ThemeGradients;
    outerGradient?: ThemeGradients;
    innerGradientOpacity?: number;
    buttonBorderColor?: {
        light: string;
        dark: string;
    };

    // Shadow customization
    enableShadows?: boolean;
    shadowOpacity?: number;
    shadowColor?: {
        light: string;
        dark: string;
    };
}

export function GradientAIChatInput({
    placeholder = "Send message...",
    onSend,
    enableAnimations = true,
    className,
    disabled = false,

    // Dropdown options with defaults
    dropdownOptions = [
        { id: "option1", label: "ChatGPT", value: "chatgpt" },
        { id: "option2", label: "Claude", value: "claude" },
        { id: "option3", label: "Gemini", value: "gemini" }
    ],
    onOptionSelect,

    // Theme-aware gradient defaults
    mainGradient = {
        light: {
            topLeft: "#F5E9AD",
            topRight: "#F6B4AD",
            bottomRight: "#F5ABA0",
            bottomLeft: "#F5DCBA"
        },
        dark: {
            topLeft: "#B8905A",    // Much darker amber
            topRight: "#B86B42",   // Much darker orange
            bottomRight: "#A8502D", // Very deep orange-red
            bottomLeft: "#B89E6E"  // Much darker golden
        }
    },
    outerGradient = {
        light: {
            topLeft: "#E5D99D",
            topRight: "#E6A49D",
            bottomRight: "#E59B90",
            bottomLeft: "#E5CCBA"
        },
        dark: {
            topLeft: "#996F40",    // Very dark outer border
            topRight: "#99532D",
            bottomRight: "#8A3F22",
            bottomLeft: "#997D50"
        }
    },
    innerGradientOpacity = 0.1,
    buttonBorderColor = {
        light: "#DBDBD8",  // Light gray for light mode
        dark: "#4A4A4A"    // Darker gray for dark mode
    },

    // Shadow defaults
    enableShadows = true,
    shadowOpacity = 1,
    shadowColor = {
        light: "rgb(0, 0, 0)", // Black shadow for light mode
        dark: "rgb(184, 107, 66)" // Orange shadow for dark mode
    },
}: GradientAIChatInputProps) {
    const [message, setMessage] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const [selectedOption, setSelectedOption] = useState<DropdownOption | null>(null);
    const shouldReduceMotion = useReducedMotion();
    const shouldAnimate = enableAnimations && !shouldReduceMotion;
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { theme } = useTheme();

    // Fix hydration mismatch - only apply theme after mounting
    useEffect(() => {
        setMounted(true);
    }, []);

    // Get current theme's gradients - default to light mode for SSR
    const isDark = mounted && theme === "dark";
    const currentMainGradient = isDark ? mainGradient.dark : mainGradient.light;
    const currentOuterGradient = isDark ? outerGradient.dark : outerGradient.light;
    const currentButtonBorderColor = isDark ? buttonBorderColor.dark : buttonBorderColor.light;
    const currentShadowColor = isDark ? shadowColor.dark : shadowColor.light;

    // Hardcoded background colors since Tailwind v4 CSS-first config
    // doesn't pick up tailwind.config.ts custom colors
    const bgColor = isDark ? "#0A0A0F" : "#ffffff";
    const textColor = isDark ? "#F0F0FF" : "#0a0a0f";
    const mutedTextColor = isDark ? "#6B7280" : "#6B7280";
    const popoverBg = isDark ? "#111118" : "#ffffff";
    const accentBg = isDark ? "rgba(124, 58, 237, 0.15)" : "#f4f4f5";

    // Utility function to convert hex or rgb to rgba
    const hexToRgba = (color: string, alpha: number): string => {
        // Handle RGB format: rgb(r, g, b)
        if (color.startsWith('rgb(')) {
            const rgbValues = color.slice(4, -1).split(',').map(val => parseInt(val.trim()));
            return `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, ${alpha})`;
        }

        // Handle hex format
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        // Fallback - return as is if neither format
        return color;
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && onSend && !disabled) {
            onSend(message.trim());
            setMessage("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleFileAttachment = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setAttachedFiles(prev => [...prev, ...files]);
        e.target.value = ''; // Reset input
    };

    const removeFile = (index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Placeholder color for the textarea
    const placeholderColor = isDark ? "#555566" : "#9CA3AF";

    return (
        <motion.div
            className={cn("relative", className)}
            initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8,
            }}
        >
            {/* Glow effect behind the container */}
            <div
                style={{
                    position: "absolute",
                    inset: "-4px",
                    borderRadius: "24px",
                    background: `conic-gradient(from 45deg at 50% 50%,
                        ${currentMainGradient.topLeft},
                        ${currentMainGradient.topRight},
                        ${currentMainGradient.bottomRight},
                        ${currentMainGradient.bottomLeft},
                        ${currentMainGradient.topLeft}
                    )`,
                    opacity: 0.3,
                    filter: "blur(12px)",
                    pointerEvents: "none",
                }}
            />

            {/* Main container with gradient border */}
            <div
                style={{
                    position: "relative",
                    borderRadius: "20px",
                    padding: "3px",
                    background: `conic-gradient(from 45deg at 50% 50%,
                        ${currentMainGradient.topLeft},
                        ${currentMainGradient.topRight},
                        ${currentMainGradient.bottomRight},
                        ${currentMainGradient.bottomLeft},
                        ${currentMainGradient.topLeft}
                    )`,
                }}
            >
                {/* Inner fill — masks gradient, leaving only the border */}
                <div
                    style={{
                        backgroundColor: bgColor,
                        borderRadius: "17px",
                        padding: "16px 20px 12px 20px",
                        position: "relative",
                    }}
                >
                    {/* Top row: Textarea + Send */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
                        {/* Textarea */}
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            disabled={disabled}
                            rows={1}
                            style={{
                                flex: 1,
                                resize: "none",
                                border: "none",
                                background: "transparent",
                                color: textColor,
                                fontSize: "15px",
                                lineHeight: "24px",
                                padding: "6px 0",
                                minHeight: "36px",
                                maxHeight: "120px",
                                outline: "none",
                                boxShadow: "none",
                                fontFamily: "inherit",
                                opacity: disabled ? 0.5 : 1,
                            }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = "auto";
                                target.style.height = Math.min(target.scrollHeight, 120) + "px";
                            }}
                        />

                        {/* Send button */}
                        <motion.button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={disabled || !message.trim()}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                border: "none",
                                cursor: disabled || !message.trim() ? "not-allowed" : "pointer",
                                opacity: disabled || !message.trim() ? 0.35 : 1,
                                background: message.trim()
                                    ? `linear-gradient(135deg, ${currentMainGradient.topLeft}, ${currentMainGradient.topRight})`
                                    : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                                color: message.trim() ? "#fff" : mutedTextColor,
                                flexShrink: 0,
                                marginTop: "2px",
                            }}
                            whileHover={shouldAnimate && message.trim() ? { scale: 1.08 } : {}}
                            whileTap={shouldAnimate && message.trim() ? { scale: 0.92 } : {}}
                        >
                            <Send style={{ width: "16px", height: "16px" }} />
                        </motion.button>
                    </div>

                    {/* Bottom row: Attach File + Select + File pills */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>

                        {/* Attach File button */}
                        <motion.button
                            type="button"
                            onClick={handleFileAttachment}
                            disabled={disabled}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "5px 14px",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: isDark ? "#9CA3AF" : "#6B7280",
                                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                border: `1px solid ${currentButtonBorderColor}`,
                                borderRadius: "999px",
                                cursor: disabled ? "not-allowed" : "pointer",
                                opacity: disabled ? 0.5 : 1,
                                fontFamily: "inherit",
                            }}
                            whileHover={shouldAnimate ? { scale: 1.03 } : {}}
                            whileTap={shouldAnimate ? { scale: 0.97 } : {}}
                        >
                            <Image style={{ width: "13px", height: "13px" }} aria-hidden="true" />
                            <span>Attach File</span>
                        </motion.button>

                        {/* Dropdown selector */}
                        <div style={{ position: "relative" }} ref={dropdownRef}>
                            <motion.button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                disabled={disabled}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "5px 14px",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: isDark ? "#9CA3AF" : "#6B7280",
                                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                    border: `1px solid ${currentButtonBorderColor}`,
                                    borderRadius: "999px",
                                    cursor: disabled ? "not-allowed" : "pointer",
                                    opacity: disabled ? 0.5 : 1,
                                    fontFamily: "inherit",
                                }}
                                whileHover={shouldAnimate ? { scale: 1.03 } : {}}
                                whileTap={shouldAnimate ? { scale: 0.97 } : {}}
                            >
                                <span>{selectedOption ? selectedOption.label : "Select"}</span>
                                <ChevronDown
                                    style={{
                                        width: "12px",
                                        height: "12px",
                                        transition: "transform 0.2s",
                                        transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                                    }}
                                />
                            </motion.button>

                            {/* Dropdown menu */}
                            {isDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                    style={{
                                        position: "absolute",
                                        bottom: "100%",
                                        marginBottom: "8px",
                                        left: 0,
                                        backgroundColor: popoverBg,
                                        border: `1px solid ${currentButtonBorderColor}`,
                                        borderRadius: "12px",
                                        boxShadow: "0 -8px 30px rgba(0,0,0,0.3)",
                                        minWidth: "160px",
                                        zIndex: 50,
                                        padding: "4px",
                                    }}
                                >
                                    {dropdownOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => {
                                                setSelectedOption(option);
                                                onOptionSelect?.(option);
                                                setIsDropdownOpen(false);
                                            }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                width: "100%",
                                                textAlign: "left" as const,
                                                padding: "8px 10px",
                                                fontSize: "13px",
                                                borderRadius: "8px",
                                                border: "none",
                                                cursor: "pointer",
                                                color: textColor,
                                                backgroundColor: selectedOption?.id === option.id ? accentBg : "transparent",
                                                fontFamily: "inherit",
                                            }}
                                            onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = accentBg; }}
                                            onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = selectedOption?.id === option.id ? accentBg : "transparent"; }}
                                        >
                                            <span style={{ flex: 1 }}>{option.label}</span>
                                            {selectedOption?.id === option.id && (
                                                <Check style={{ width: "14px", height: "14px", color: currentMainGradient.topLeft }} />
                                            )}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </div>

                        {/* Spacer to push file pills right */}
                        <div style={{ flex: 1 }} />

                        {/* File pills */}
                        {attachedFiles.length > 0 && attachedFiles.map((file, index) => (
                            <div
                                key={`${file.name}-${index}`}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "4px 12px",
                                    fontSize: "12px",
                                    color: isDark ? "#9CA3AF" : "#6B7280",
                                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                    border: `1px solid ${currentButtonBorderColor}`,
                                    borderRadius: "999px",
                                }}
                            >
                                <span style={{ maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{file.name}</span>
                                <button
                                    onClick={() => removeFile(index)}
                                    style={{
                                        width: "16px",
                                        height: "16px",
                                        borderRadius: "50%",
                                        border: "none",
                                        background: "rgba(255,255,255,0.1)",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: 0,
                                        color: mutedTextColor,
                                    }}
                                >
                                    <X style={{ width: "10px", height: "10px" }} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ display: "none" }}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />

            {/* Dynamic placeholder color */}
            <style>{`
                textarea::placeholder {
                    color: ${placeholderColor} !important;
                    opacity: 1;
                }
            `}</style>
        </motion.div>
    );
}
