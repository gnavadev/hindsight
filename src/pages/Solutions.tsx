import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "react-query";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/cjs/styles/prism";
import ReactMarkdown from "react-markdown";
import ScreenshotQueue from "../components/features/Queue/ScreenshotQueue";
import {
  Toast,
  ToastDescription,
  ToastTitle,
  ToastVariant,
  ToastMessage,
} from "../components/ui";
import {
  NewProblemStatementData,
  NewSolutionData,
} from "../../common/types/solutions";
import SolutionCommands from "../components/features/Solutions/SolutionCommands";
import { Theme, useTheme } from "../contexts/ThemeContext";
import Debug from "./Debug";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats code by removing markdown code fences if present
 */
const formatCodeContent = (content: string): string => {
  if (typeof content !== "string") return "";

  // Remove markdown code blocks
  return content
    .replace(/^```[\w]*\n/gm, "")
    .replace(/\n```$/gm, "")
    .trim();
};

/**
 * Normalizes language identifier for syntax highlighting
 */
const normalizeLanguage = (lang: string | null | undefined): string => {
  if (!lang) return "text";

  return lang
    .toLowerCase()
    .replace("c++", "cpp")
    .replace("c#", "csharp")
    .split(/[\s(]/)[0];
};

// ============================================================================
// CONTENT SECTION COMPONENT
// ============================================================================

export const ContentSection = ({
  title,
  content,
  isLoading,
  theme,
  enableMarkdown = false,
}: {
  title: string;
  content: React.ReactNode;
  isLoading: boolean;
  theme: Theme;
  enableMarkdown?: boolean;
}) => (
  <div className="space-y-2">
    <h2
      className={
        theme === "osrs"
          ? "osrs-header"
          : "text-[13px] font-semibold text-white tracking-wide"
      }
    >
      {title}
    </h2>
    {isLoading ? (
      <div className="mt-4 flex">
        <p
          className={
            theme === "osrs"
              ? "osrs-content"
              : "text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse"
          }
        >
          Loading...
        </p>
      </div>
    ) : (
      <div
        className={
          theme === "osrs"
            ? "osrs-content"
            : "text-[13px] leading-relaxed text-gray-100 max-w-[600px]"
        }
      >
        {enableMarkdown && typeof content === "string" ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-white">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-gray-200">{children}</em>
                ),
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 bg-gray-800/80 rounded text-xs font-mono text-blue-300">
                    {children}
                  </code>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 mb-3">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 mb-3">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-bold mb-2 text-white">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold mb-2 text-white">{children}</h3>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-blue-400/50 pl-3 italic text-gray-300 my-2">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          content
        )}
      </div>
    )}
  </div>
);

// ============================================================================
// COMPLEXITY SECTION COMPONENT
// ============================================================================

export const ComplexitySection = ({
  timeComplexity,
  spaceComplexity,
  isLoading,
  theme,
}: {
  timeComplexity: string | null;
  spaceComplexity: string | null;
  isLoading: boolean;
  theme: Theme;
}) => (
  <div className="space-y-2">
    <h2
      className={
        theme === "osrs"
          ? "osrs-header"
          : "text-[13px] font-semibold text-white tracking-wide"
      }
    >
      Complexity Analysis
    </h2>
    {isLoading ? (
      <p
        className={
          theme === "osrs"
            ? "osrs-content"
            : "text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse"
        }
      >
        Calculating complexity...
      </p>
    ) : (
      <div
        className={theme === "osrs" ? "osrs-content space-y-1" : "space-y-1"}
      >
        <div
          className={
            theme === "osrs"
              ? ""
              : "flex items-start gap-2 text-[13px] leading-relaxed text-gray-100"
          }
        >
          {theme === "default" && (
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400/80 mt-2 shrink-0" />
          )}
          <div>
            <span className="font-medium">Time:</span>{" "}
            {timeComplexity && (
              <ReactMarkdown
                components={{
                  p: ({ children }) => <>{children}</>, // Use fragment to keep it inline
                  strong: ({ children }) => (
                    <strong className="font-semibold text-white">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-200">{children}</em>
                  ),
                  code: ({ children }) => (
                    <code className="px-1.5 py-0.5 bg-gray-800/80 rounded text-xs font-mono text-blue-300">
                      {children}
                    </code>
                  ),
                }}
              >
                {timeComplexity}
              </ReactMarkdown>
            )}
          </div>
        </div>
        <div
          className={
            theme === "osrs"
              ? ""
              : "flex items-start gap-2 text-[13px] leading-relaxed text-gray-100"
          }
        >
          {theme === "default" && (
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400/80 mt-2 shrink-0" />
          )}
          <div>
            <span className="font-medium">Space:</span>{" "}
            {spaceComplexity && (
              <ReactMarkdown
                components={{
                  p: ({ children }) => <>{children}</>, // Use fragment to keep it inline
                  strong: ({ children }) => (
                    <strong className="font-semibold text-white">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-200">{children}</em>
                  ),
                  code: ({ children }) => (
                    <code className="px-1.5 py-0.5 bg-gray-800/80 rounded text-xs font-mono text-blue-300">
                      {children}
                    </code>
                  ),
                }}
              >
                {spaceComplexity}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);

// ============================================================================
// CODE EXPLANATION COMPONENT
// ============================================================================

const CodeExplanationSection = ({
  explanations,
  isLoading,
  theme,
}: {
  explanations?: Array<{ part: string; explanation: string }>;
  isLoading: boolean;
  theme: Theme;
}) => {
  if (!explanations || explanations.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2
        className={
          theme === "osrs"
            ? "osrs-header"
            : "text-[13px] font-semibold text-white tracking-wide"
        }
      >
        Code Explanation
      </h2>
      {isLoading ? (
        <p
          className={
            theme === "osrs"
              ? "osrs-content"
              : "text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse"
          }
        >
          Loading explanation...
        </p>
      ) : (
        <div className="space-y-3">
          {explanations.map((item, index) => (
            <div
              key={index}
              className={
                theme === "osrs"
                  ? "osrs-explanation-block"
                  : "bg-black/20 p-3 rounded-md border-l-2 border-blue-400/50"
              }
            >
              <p
                className={
                  theme === "osrs"
                    ? "osrs-explanation-title"
                    : "text-sm font-medium text-blue-300 mb-1"
                }
              >
                {item.part}
              </p>
              <div className="prose prose-invert prose-sm max-w-none text-[13px] leading-relaxed text-gray-200">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="mb-3 last:mb-0 leading-relaxed text-gray-200">
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-white">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-gray-200">{children}</em>
                    ),
                    code: ({ children }) => (
                      <code className="px-1.5 py-0.5 bg-gray-800/80 rounded text-xs font-mono text-blue-300">
                        {children}
                      </code>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 mb-3">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1 mb-3">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="leading-relaxed">{children}</li>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-bold mb-2 text-white">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold mb-2 text-white">{children}</h3>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-blue-400/50 pl-3 italic text-gray-300 my-2">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {item.explanation}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SOLUTION SECTION COMPONENT
// ============================================================================

const SolutionSection = ({
  title,
  content,
  isLoading,
  language,
  theme,
}: {
  title: string;
  content: string;
  isLoading: boolean;
  language?: string | null;
  theme: Theme;
}) => {
  const [copied, setCopied] = useState(false);

  // 1. FORCEFUL LANGUAGE DETECTION
  console.log(language)
  const displayLanguage = useMemo(() => {
    // Priority 1: Prop passed from backend (if valid)
    if (language && language !== "text" && language !== "unknown") {
        return normalizeLanguage(language);
    }

    // Priority 2: Regex check on the content string
    // We check for ```python, ```javascript, etc.
    const match = content.match(/^```(\w+)/);
    if (match && match[1]) {
        return normalizeLanguage(match[1]);
    }

    // Priority 3: Hard Fallback
    // If we have absolutely no clue, use "javascript".
    // Why? Because generic C-style syntax highlighting (colors for strings, numbers, braces)
    // looks better than plain white text for 90% of languages (Java, C, C++, JS, TS, Rust).
    return "javascript"; 
  }, [language, content]);

  console.log(displayLanguage)

  // 2. Format content (strip markdown fences for the Highlighter)
  const formattedContent = useMemo(() => formatCodeContent(content), [content]);

  const copyToClipboard = async () => {
    if (typeof formattedContent === "string") {
      try {
        await window.electronAPI.copyText(formattedContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Electron clipboard copy failed:", err);
      }
    }
  };

  return (
    <div className="space-y-2 relative">
      <h2
        className={
          theme === "osrs"
            ? "osrs-header"
            : "text-[13px] font-semibold text-white tracking-wide"
        }
      >
        {title}
      </h2>
      {isLoading ? (
        <div className="mt-4 flex">
          <p
            className={
              theme === "osrs"
                ? "osrs-content"
                : "text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse"
            }
          >
            Loading solution...
          </p>
        </div>
      ) : (
        <div className="w-full relative text-[13px]">
          <SyntaxHighlighter
            showLineNumbers={true}
            language={displayLanguage} 
            style={dracula}
            customStyle={{
              maxWidth: "100%",
              margin: 0,
              padding: "1rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "0.85rem",
              lineHeight: "1.5",
              borderRadius: "0.375rem",
              // Ensure background is set correctly for theme
              backgroundColor: theme === "osrs" ? "rgba(0,0,0,0.8)" : "#282a36", 
            }}
            wrapLongLines={true}
          >
            {formattedContent}
          </SyntaxHighlighter>

          {/* Debugging Overlay: Remove this after verifying colors work */}
          {/* <div className="absolute bottom-1 right-1 text-[9px] text-white/20 pointer-events-none">
             Lang: {displayLanguage}
          </div> */}

          <button
            onClick={copyToClipboard}
            className={
              theme === "osrs"
                ? "absolute top-2 right-2 text-xs osrs-button px-2 py-1 transition z-10"
                : "absolute top-2 right-2 text-xs text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white rounded px-2 py-1 transition z-10"
            }
            aria-label="Copy code to clipboard"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ANSWER RENDERER COMPONENT (for Q&A and Multiple Choice)
// ============================================================================

const AnswerRenderer = ({
  answer,
  isLoading,
  theme,
}: {
  answer?: { question: string; correct_option: string }[];
  isLoading: boolean;
  theme: Theme;
}) => {
  if (isLoading) {
    return (
      <div className="mt-2 flex">
        <p
          className={
            theme === "osrs"
              ? "osrs-content"
              : "text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse"
          }
        >
          Loading solution...
        </p>
      </div>
    );
  }

  if (!answer || !Array.isArray(answer)) {
    return null;
  }

  return (
    <div className="space-y-3">
      {answer.map((block, index) => (
        <div
          key={index}
          className={
            theme === "osrs"
              ? "osrs-mcq-block"
              : "bg-black/20 p-4 rounded-md border-l-2 border-green-400/50"
          }
        >
          <p
            className={
              theme === "osrs"
                ? ""
                : "text-[13px] leading-relaxed text-gray-200 mb-2"
            }
          >
            <span className="font-medium text-gray-100">Q:</span> {block.question}
          </p>
          <p
            className={
              theme === "osrs"
                ? "osrs-answer"
                : "text-[13px] font-semibold text-green-400 mt-2 pl-2"
            }
          >
            <span className="text-green-300">Answer:</span> {block.correct_option}
          </p>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN SOLUTIONS COMPONENT
// ============================================================================

interface SolutionsProps {
  setView: React.Dispatch<
    React.SetStateAction<"queue" | "solutions" | "debug">
  >;
}

const Solutions: React.FC<SolutionsProps> = ({ setView: _setView }) => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [debugProcessing, setDebugProcessing] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral",
  });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  // ============================================================================
  // DATA QUERIES
  // ============================================================================

  const { data: problemStatementData, isLoading: isProblemLoading } =
    useQuery<NewProblemStatementData | null>(["problem_statement"]);

  const { data: solution, isLoading: isSolutionLoading } =
    useQuery<NewSolutionData | null>(["solution"]);

  const { data: extraScreenshots = [], refetch: refetchScreenshots } = useQuery<
    Array<{ path: string; preview: string }>,
    Error
  >(["extras"], async () => {
    try {
      const existing = await window.electronAPI?.getScreenshots();
      return existing || [];
    } catch (error) {
      console.error("Error loading extra screenshots:", error);
      return [];
    }
  });

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  const problemType = problemStatementData?.problem_type as
    | "coding"
    | "multiple_choice"
    | "q_and_a"
    | "math"
    | "general_reasoning"
    | undefined;

  const language = useMemo(
    () => normalizeLanguage(problemStatementData?.details?.language),
    [problemStatementData?.details?.language]
  );

  const answerData = solution?.solution?.answer;
  const reasoningData = solution?.solution?.reasoning;
  const timeComplexityData = solution?.solution?.time_complexity ?? null;
  const spaceComplexityData = solution?.solution?.space_complexity ?? null;
  const codeExplanations = solution?.solution?.code_explanation;

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant });
    setToastOpen(true);
  };

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible);
    setTooltipHeight(height);
  };

  const handleDeleteExtraScreenshot = async (index: number) => {
    const screenshotToDelete = extraScreenshots[index];
    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      );
      if (response.success) {
        refetchScreenshots();
      } else {
        console.error("Failed to delete extra screenshot:", response.error);
        showToast(
          "Deletion Failed",
          "Could not delete screenshot. Please try again.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error deleting extra screenshot:", error);
      showToast(
        "Error",
        "An unexpected error occurred while deleting the screenshot.",
        "error"
      );
    }
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight;
        const contentWidth = contentRef.current.scrollWidth;

        if (isTooltipVisible) {
          contentHeight += tooltipHeight;
        }

        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(updateDimensions);

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    updateDimensions();

    // Event listener cleanup functions
    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetchScreenshots()),

      window.electronAPI.onResetView(() => {
        setIsResetting(true);
        queryClient.removeQueries(["solution"]);
        queryClient.removeQueries(["new_solution"]);
        refetchScreenshots();
        setTimeout(() => setIsResetting(false), 0);
      }),

      window.electronAPI.onSolutionStart(async () => {
        queryClient.setQueryData(["solution"], null);
      }),

      window.electronAPI.onDebugStart(() => setDebugProcessing(true)),

      window.electronAPI.onDebugSuccess((data) => {
        queryClient.setQueryData(["new_solution"], data);
        setDebugProcessing(false);
        refetchScreenshots();
        showToast(
          "Debug Complete",
          "Your code has been analyzed and corrected.",
          "success"
        );
      }),

      window.electronAPI.onDebugError(() => {
        showToast(
          "Processing Failed",
          "There was an error debugging your code.",
          "error"
        );
        setDebugProcessing(false);
      }),

      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no extra screenshots to process.",
          "neutral"
        );
      }),
    ];

    return () => {
      resizeObserver.disconnect();
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [isTooltipVisible, tooltipHeight, queryClient, refetchScreenshots]);

  // ============================================================================
  // RENDER SOLUTION CONTENT
  // ============================================================================

  const renderSolutionContent = () => {
    if (!answerData) return null;

    const listRenderTypes = ["multiple_choice", "q_and_a", "general_reasoning"];

    // Coding problems: Show code with syntax highlighting
    if (problemType === "coding") {
      return (
        <>
          <SolutionSection
            title="Solution"
            content={answerData as string}
            isLoading={isSolutionLoading}
            language={language}
            theme={theme}
          />

          {codeExplanations && codeExplanations.length > 0 && (
            <CodeExplanationSection
              explanations={codeExplanations}
              isLoading={isSolutionLoading}
              theme={theme}
            />
          )}

          <ComplexitySection
            timeComplexity={timeComplexityData}
            spaceComplexity={spaceComplexityData}
            isLoading={
              isSolutionLoading || !timeComplexityData || !spaceComplexityData
            }
            theme={theme}
          />
        </>
      );
    }

    // Q&A, Multiple Choice, General Reasoning: Show structured answers
    if (listRenderTypes.includes(problemType || "")) {
      return (
        <div className="space-y-2">
          <h2
            className={
              theme === "osrs"
                ? "osrs-header"
                : "text-[13px] font-semibold text-white tracking-wide"
            }
          >
            Solution
          </h2>
          <AnswerRenderer
            answer={answerData as { question: string; correct_option: string }[]}
            isLoading={isSolutionLoading}
            theme={theme}
          />
        </div>
      );
    }

    // Math and other types: Show in code box for better formatting
    return (
      <SolutionSection
        title="Solution"
        content={answerData as string}
        isLoading={isSolutionLoading}
        language="text"
        theme={theme}
      />
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      {!isResetting &&
        queryClient.getQueryData<NewSolutionData>(["new_solution"])?.solution ? (
        <Debug
          isProcessing={debugProcessing}
          setIsProcessing={setDebugProcessing}
        />
      ) : (
        <div
          ref={contentRef}
          className="relative flex flex-col space-y-3 px-4 py-3"
        >
          <Toast
            open={toastOpen}
            onOpenChange={setToastOpen}
            variant={toastMessage.variant}
            duration={3000}
          >
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </Toast>

          {/* Screenshot Queue */}
          {answerData && (
            <div className="bg-transparent w-fit">
              <div className="pb-3">
                <div className="space-y-3 w-fit">
                  <ScreenshotQueue
                    isLoading={debugProcessing}
                    screenshots={extraScreenshots}
                    onDeleteScreenshot={handleDeleteExtraScreenshot}
                    theme={theme}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Solution Commands */}
          <SolutionCommands
            extraScreenshots={extraScreenshots}
            onTooltipVisibilityChange={handleTooltipVisibilityChange}
          />

          {/* Main Content Container */}
          <div
            className={
              theme === "osrs"
                ? "w-full text-sm osrs-container rounded-md"
                : "w-full text-sm bg-black/60 rounded-md backdrop-blur-sm"
            }
          >
            <div className="rounded-lg overflow-hidden">
              <div className="px-4 py-3 space-y-4 max-w-full">
                {/* Problem Statement */}
                <ContentSection
                  title="Problem Statement"
                  content={problemStatementData?.problem_statement}
                  isLoading={isProblemLoading || !problemStatementData}
                  theme={theme}
                />

                {/* Loading State */}
                {problemStatementData && !answerData && (
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    <p
                      className={
                        theme === "osrs"
                          ? "osrs-content"
                          : "text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse"
                      }
                    >
                      Generating optimal solution...
                    </p>
                  </div>
                )}

                {/* Solution Content */}
                {answerData && (
                  <>
                    {/* Reasoning Section */}
                    {reasoningData && (
                      <ContentSection
                        title="Analysis & Reasoning"
                        content={reasoningData}
                        isLoading={isSolutionLoading}
                        theme={theme}
                        enableMarkdown={true}
                      />
                    )}

                    {/* Render appropriate solution format */}
                    {renderSolutionContent()}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Solutions;