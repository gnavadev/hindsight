import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "react-query";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
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
import { diffLines } from "diff";
import { Theme, useTheme } from "../contexts/ThemeContext";
import { NewSolutionData } from "../../common/types/solutions";

type DiffLine = {
  value: string;
  added?: boolean;
  removed?: boolean;
};

const CodeComparisonSection = ({
  oldCode,
  newCode,
  isLoading,
  theme,
}: {
  oldCode: string | null;
  newCode: string | null;
  isLoading: boolean;
  theme: Theme;
}) => {
  // Helper function to clean code for more accurate diffing
  const normalizeCode = (code: string) =>
    code
      .replace(/\r\n/g, "\n")
      .replace(/^(```|""")\w*\n?/, "")
      .replace(/\n?(```|""")$/, "")
      .trim();

  const { leftLines, rightLines } = React.useMemo(() => {
    if (!oldCode || !newCode) return { leftLines: [], rightLines: [] };

    const diff = diffLines(normalizeCode(oldCode), normalizeCode(newCode));
    const left: DiffLine[] = [];
    const right: DiffLine[] = [];

    diff.forEach((part) => {
      const lines = part.value.replace(/\n$/, "").split("\n");
      if (part.added) {
        right.push(...lines.map((line) => ({ value: line, added: true })));
        left.push(...Array(part.count).fill({ value: " " }));
      } else if (part.removed) {
        left.push(...lines.map((line) => ({ value: line, removed: true })));
        right.push(...Array(part.count).fill({ value: " " }));
      } else {
        left.push(...lines.map((line) => ({ value: line })));
        right.push(...lines.map((line) => ({ value: line })));
      }
    });
    return { leftLines: left, rightLines: right };
  }, [oldCode, newCode]);

  return (
    <div className="space-y-1.5">
      <h2
        className={
          theme === "osrs"
            ? "osrs-header"
            : "text-[13px] font-medium text-white tracking-wide"
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
        <div className="flex flex-row gap-0.5 bg-[#161b22] rounded-lg overflow-hidden">
          <div className="w-1/2 border-r border-gray-700">
            <div className="bg-[#2d333b] px-3 py-1.5">
              <h3 className="text-[11px] font-medium text-gray-200">
                Previous Version
              </h3>
            </div>
            <SyntaxHighlighter
              language="python"
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
              }}
              lineProps={(lineNumber) => ({
                style: {
                  display: "block",
                  backgroundColor: leftLines[lineNumber - 1]?.removed
                    ? "rgba(255, 0, 0, 0.2)"
                    : "transparent",
                },
              })}
            >
              {leftLines.map((line) => line.value || " ").join("\n")}
            </SyntaxHighlighter>
          </div>
          <div className="w-1/2">
            <div className="bg-[#2d333b] px-3 py-1.5">
              <h3 className="text-[11px] font-medium text-gray-200">
                New Version
              </h3>
            </div>
            <SyntaxHighlighter
              language="python"
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
              }}
              lineProps={(lineNumber) => ({
                style: {
                  display: "block",
                  backgroundColor: rightLines[lineNumber - 1]?.added
                    ? "rgba(0, 255, 0, 0.15)"
                    : "transparent",
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

interface DebugProps {
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
}

const Debug: React.FC<DebugProps> = ({ isProcessing, setIsProcessing }) => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral",
  });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipHeight, setTooltipHeight] = useState(0);

  const { data: originalSolution } = useQuery<NewSolutionData | null>([
    "solution",
  ]);
  const { data: newSolution, isLoading: isNewSolutionLoading } =
    useQuery<NewSolutionData | null>(["new_solution"]);
  const { data: extraScreenshots = [], refetch } = useQuery({
    queryKey: ["extras"],
    queryFn: async () => window.electronAPI.getScreenshots() || [],
  });

  const oldCode = originalSolution?.solution?.answer ?? null;
  const newCode = newSolution?.solution?.answer ?? null;
  const reasoning = newSolution?.solution?.reasoning;
  const timeComplexity = newSolution?.solution?.time_complexity;
  const spaceComplexity = newSolution?.solution?.space_complexity;

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant });
    setToastOpen(true);
  };

  const handleDeleteExtraScreenshot = async (index: number) => {
    const response = await window.electronAPI.deleteScreenshot(
      extraScreenshots[index].path
    );
    if (response.success) refetch();
    else {
      showToast("Error", "Failed to delete the screenshot.", "error");
      console.error("Failed to delete extra screenshot:", response.error);
    }
  };

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
    if (contentRef.current) resizeObserver.observe(contentRef.current);
    updateDimensions();

    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => refetch()),
      window.electronAPI.onDebugStart(() => setIsProcessing(true)),
      window.electronAPI.onDebugSuccess(() => {
        setIsProcessing(false);
        refetch();
      }),
      window.electronAPI.onDebugError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error debugging your code.",
          "error"
        );
        setIsProcessing(false);
        console.error("Processing error:", error);
      }),
    ];

    return () => {
      resizeObserver.disconnect();
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [isTooltipVisible, tooltipHeight, queryClient, refetch, setIsProcessing]);

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible);
    setTooltipHeight(height);
  };

  return (
    <div ref={contentRef} className="relative space-y-3 px-4 py-3">
      <Toast
        open={toastOpen}
        onOpenChange={setToastOpen}
        variant={toastMessage.variant}
        duration={3000}
      >
        <ToastTitle>{toastMessage.title}</ToastTitle>
        <ToastDescription>{toastMessage.description}</ToastDescription>
      </Toast>

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

      <SolutionCommands
        extraScreenshots={extraScreenshots}
        onTooltipVisibilityChange={handleTooltipVisibilityChange}
      />

      <div
        className={
          theme === "osrs"
            ? "w-full text-sm osrs-container rounded-md"
            : "w-full text-sm bg-black/60 rounded-md"
        }
      >
        <div className="rounded-lg overflow-hidden">
          <div className="px-4 py-3 space-y-4">
            <ContentSection
              theme={theme}
              title="Reasoning for Change"
              content={reasoning}
              isLoading={isProcessing || isNewSolutionLoading}
            />
            <CodeComparisonSection
              oldCode={oldCode}
              newCode={newCode}
              isLoading={isProcessing || isNewSolutionLoading}
              theme={theme}
            />
            <ComplexitySection
              timeComplexity={timeComplexity ?? null}
              spaceComplexity={spaceComplexity ?? null}
              isLoading={isProcessing || isNewSolutionLoading}
              theme={theme}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Debug;
