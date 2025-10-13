import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "react-query";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import { diffLines } from "diff";
import { ComplexitySection, ContentSection } from "./Solutions";
import ScreenshotQueue from "../components/features/Queue/ScreenshotQueue";
import {
  Toast,
  ToastDescription,
  ToastMessage,
  ToastTitle,
  ToastVariant,
} from "../components/ui/Toast";
import SolutionCommands from "../components/features/Solutions/SolutionCommands";
import { Theme, useTheme } from "../contexts/ThemeContext";
import {
  NewSolutionData,
  NewProblemStatementData,
} from "../../common/types/solutions";

// ============================================================================
// TYPES
// ============================================================================

type DiffLine = {
  value: string;
  added?: boolean;
  removed?: boolean;
};

interface DebugProps {
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalizes code by removing markdown fences and normalizing line endings
 */
const normalizeCode = (code: string): string => {
  return code
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/^```[\w]*\n?/gm, "") // Remove opening code fences
    .replace(/\n?```$/gm, "") // Remove closing code fences
    .trim();
};

/**
 * Extracts language from problem data for syntax highlighting
 */
const getLanguageFromProblem = (
  problemData: NewProblemStatementData | null | undefined
): string => {
  if (!problemData?.details?.language) return "python";

  return problemData.details.language
    .toLowerCase()
    .replace("c++", "cpp")
    .replace("c#", "csharp")
    .split(/[\s(]/)[0];
};

/**
 * Safely extracts string code from solution answer
 */
const extractCodeString = (answer: any): string | null => {
  if (typeof answer === "string") {
    return answer;
  }
  return null;
};

// ============================================================================
// CODE COMPARISON COMPONENT
// ============================================================================

const CodeComparisonSection = ({
  oldCode,
  newCode,
  language,
  isLoading,
  theme,
}: {
  oldCode: string | null;
  newCode: string | null;
  language: string;
  isLoading: boolean;
  theme: Theme;
}) => {
  const { leftLines, rightLines } = useMemo(() => {
    if (!oldCode || !newCode) {
      return { leftLines: [], rightLines: [] };
    }

    const normalizedOld = normalizeCode(oldCode);
    const normalizedNew = normalizeCode(newCode);
    const diff = diffLines(normalizedOld, normalizedNew);

    const left: DiffLine[] = [];
    const right: DiffLine[] = [];

    diff.forEach((part) => {
      const lines = part.value.replace(/\n$/, "").split("\n");
      const lineCount = lines.length;

      if (part.added) {
        // Lines added in new version
        right.push(...lines.map((line) => ({ value: line, added: true })));
        left.push(...Array(lineCount).fill({ value: " " }));
      } else if (part.removed) {
        // Lines removed from old version
        left.push(...lines.map((line) => ({ value: line, removed: true })));
        right.push(...Array(lineCount).fill({ value: " " }));
      } else {
        // Unchanged lines
        left.push(...lines.map((line) => ({ value: line })));
        right.push(...lines.map((line) => ({ value: line })));
      }
    });

    return { leftLines: left, rightLines: right };
  }, [oldCode, newCode]);

  // Show helpful message if no code to compare
  if (!oldCode || !newCode) {
    return (
      <div className="space-y-2">
        <h2
          className={
            theme === "osrs"
              ? "osrs-header"
              : "text-[13px] font-semibold text-white tracking-wide"
          }
        >
          Code Comparison
        </h2>
        <p
          className={
            theme === "osrs"
              ? "osrs-content"
              : "text-[13px] text-gray-400 italic"
          }
        >
          No code available for comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2
        className={
          theme === "osrs"
            ? "osrs-header"
            : "text-[13px] font-semibold text-white tracking-wide"
        }
      >
        Code Comparison
      </h2>
      {isLoading ? (
        <div className="mt-3 flex">
          <p
            className={
              theme === "osrs"
                ? "osrs-content"
                : "text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse"
            }
          >
            Loading code comparison...
          </p>
        </div>
      ) : (
        <div className="flex flex-row gap-0.5 bg-[#161b22] rounded-lg overflow-hidden border border-gray-700/50">
          {/* Left Side - Original Code */}
          <div className="w-1/2 border-r border-gray-700">
            <div className="bg-[#2d333b] px-3 py-2 border-b border-gray-700/50">
              <h3 className="text-[11px] font-semibold text-red-300 uppercase tracking-wider">
                Previous Version
              </h3>
            </div>
            <SyntaxHighlighter
              language={language}
              style={dracula}
              showLineNumbers
              wrapLines
              customStyle={{
                margin: 0,
                padding: "1rem",
                backgroundColor:
                  theme === "osrs"
                    ? "rgba(0,0,0,0.8)"
                    : "rgba(22, 27, 34, 0.5)",
                fontSize: "0.75rem",
                lineHeight: "1.5",
              }}
              lineProps={(lineNumber) => ({
                style: {
                  display: "block",
                  backgroundColor: leftLines[lineNumber - 1]?.removed
                    ? "rgba(255, 60, 60, 0.2)"
                    : "transparent",
                  paddingLeft: leftLines[lineNumber - 1]?.removed
                    ? "0.5rem"
                    : "0",
                  borderLeft: leftLines[lineNumber - 1]?.removed
                    ? "3px solid rgba(255, 60, 60, 0.6)"
                    : "3px solid transparent",
                },
              })}
            >
              {leftLines.map((line) => line.value || " ").join("\n")}
            </SyntaxHighlighter>
          </div>

          {/* Right Side - New Code */}
          <div className="w-1/2">
            <div className="bg-[#2d333b] px-3 py-2 border-b border-gray-700/50">
              <h3 className="text-[11px] font-semibold text-green-300 uppercase tracking-wider">
                Corrected Version
              </h3>
            </div>
            <SyntaxHighlighter
              language={language}
              style={dracula}
              showLineNumbers
              wrapLines
              customStyle={{
                margin: 0,
                padding: "1rem",
                backgroundColor:
                  theme === "osrs"
                    ? "rgba(0,0,0,0.8)"
                    : "rgba(22, 27, 34, 0.5)",
                fontSize: "0.75rem",
                lineHeight: "1.5",
              }}
              lineProps={(lineNumber) => ({
                style: {
                  display: "block",
                  backgroundColor: rightLines[lineNumber - 1]?.added
                    ? "rgba(60, 255, 60, 0.15)"
                    : "transparent",
                  paddingLeft: rightLines[lineNumber - 1]?.added
                    ? "0.5rem"
                    : "0",
                  borderLeft: rightLines[lineNumber - 1]?.added
                    ? "3px solid rgba(60, 255, 60, 0.6)"
                    : "3px solid transparent",
                },
              })}
            >
              {rightLines.map((line) => line.value || " ").join("\n")}
            </SyntaxHighlighter>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN DEBUG COMPONENT
// ============================================================================

const Debug: React.FC<DebugProps> = ({ isProcessing, setIsProcessing }) => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral",
  });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipHeight, setTooltipHeight] = useState(0);

  // ============================================================================
  // DATA QUERIES
  // ============================================================================

  const { data: problemData } = useQuery<NewProblemStatementData | null>([
    "problem_statement",
  ]);

  const { data: originalSolution } = useQuery<NewSolutionData | null>([
    "solution",
  ]);

  const { data: newSolution, isLoading: isNewSolutionLoading } =
    useQuery<NewSolutionData | null>(["new_solution"]);

  const { data: extraScreenshots = [], refetch: refetchScreenshots } = useQuery<
    Array<{ path: string; preview: string }>,
    Error
  >({
    queryKey: ["extras"],
    queryFn: async () => {
      try {
        const screenshots = await window.electronAPI.getScreenshots();
        return screenshots || [];
      } catch (error) {
        console.error("Error loading extra screenshots:", error);
        return [];
      }
    },
  });

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  const language = useMemo(
    () => getLanguageFromProblem(problemData),
    [problemData]
  );

  const oldCode = useMemo(
    () => extractCodeString(originalSolution?.solution?.answer),
    [originalSolution]
  );

  const newCode = useMemo(
    () => extractCodeString(newSolution?.solution?.answer),
    [newSolution]
  );

  const reasoning = newSolution?.solution?.reasoning;
  const timeComplexity = newSolution?.solution?.time_complexity ?? null;
  const spaceComplexity = newSolution?.solution?.space_complexity ?? null;

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
        showToast(
          "Screenshot Deleted",
          "The screenshot was removed successfully.",
          "success"
        );
      } else {
        console.error("Failed to delete extra screenshot:", response.error);
        showToast(
          "Deletion Failed",
          "Could not delete the screenshot. Please try again.",
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
        const { scrollHeight, scrollWidth } = contentRef.current;
        const height = isTooltipVisible
          ? scrollHeight + tooltipHeight
          : scrollHeight;
        window.electronAPI.updateContentDimensions({
          width: scrollWidth,
          height,
        });
      }
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    updateDimensions();

    // Event listeners
    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetchScreenshots()),

      window.electronAPI.onResetView(() => {
        refetchScreenshots();
      }),

      window.electronAPI.onDebugStart(() => {
        setIsProcessing(true);
      }),

      window.electronAPI.onDebugSuccess(() => {
        setIsProcessing(false);
        refetchScreenshots();
        showToast(
          "Debug Complete",
          "Your code has been successfully corrected.",
          "success"
        );
      }),

      window.electronAPI.onDebugError((error: string) => {
        setIsProcessing(false);
        console.error("Debug processing error:", error);
        showToast(
          "Debug Failed",
          error || "There was an error debugging your code.",
          "error"
        );
      }),
    ];

    return () => {
      resizeObserver.disconnect();
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [
    isTooltipVisible,
    tooltipHeight,
    queryClient,
    refetchScreenshots,
    setIsProcessing,
  ]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div ref={contentRef} className="relative flex flex-col space-y-3 px-4 py-3">
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
      <div className="bg-transparent w-fit">
        <div className="pb-3">
          <div className="space-y-3 w-fit">
            <ScreenshotQueue
              screenshots={extraScreenshots}
              onDeleteScreenshot={handleDeleteExtraScreenshot}
              isLoading={isProcessing}
              theme={theme}
            />
          </div>
        </div>
      </div>

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
          <div className="px-4 py-3 space-y-4">
            {/* Reasoning Section */}
            <ContentSection
              theme={theme}
              title="Error Analysis & Fix"
              content={reasoning || "Analyzing the error..."}
              isLoading={isProcessing || isNewSolutionLoading || !reasoning}
              enableMarkdown={true}
            />

            {/* Code Comparison */}
            <CodeComparisonSection
              oldCode={oldCode}
              newCode={newCode}
              language={language}
              isLoading={isProcessing || isNewSolutionLoading}
              theme={theme}
            />

            {/* Complexity Analysis */}
            {(timeComplexity || spaceComplexity) && (
              <ComplexitySection
                timeComplexity={timeComplexity}
                spaceComplexity={spaceComplexity}
                isLoading={
                  isProcessing ||
                  isNewSolutionLoading ||
                  (!timeComplexity && !spaceComplexity)
                }
                theme={theme}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Debug;