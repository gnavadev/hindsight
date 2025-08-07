import React, { useState, useEffect, useRef, CSSProperties } from "react";
import { useQuery, useQueryClient } from "react-query";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";

import ScreenshotQueue from "../components/Queue/ScreenshotQueue";
import {
  Toast,
  ToastDescription,
  ToastMessage,
  ToastTitle,
  ToastVariant
} from "../components/ui/toast";
import { NewProblemStatementData, NewSolutionData } from "../../common/types/solutions"; 
import SolutionCommands from "../components/Solutions/SolutionCommands";
import Debug from "./Debug";

export const ContentSection = ({ title, content, isLoading }: { title: string; content: React.ReactNode; isLoading: boolean; }) => (
  <div className="space-y-2">
    <h2 className="text-[13px] font-medium text-white tracking-wide">{title}</h2>
    {isLoading ? (
      <div className="mt-4 flex">
        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
          Loading...
        </p>
      </div>
    ) : (
      <div className="text-[13px] leading-[1.4] text-gray-100 max-w-[600px]">
        {content}
      </div>
    )}
  </div>
);

export const ComplexitySection = ({ timeComplexity, spaceComplexity, isLoading }: { timeComplexity: string | null; spaceComplexity: string | null; isLoading: boolean; }) => (
    <div className="space-y-2">
        <h2 className="text-[13px] font-medium text-white tracking-wide">
            Complexity
        </h2>
        {isLoading ? (
        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
            Calculating complexity...
        </p>
        ) : (
        <div className="space-y-1">
            <div className="flex items-start gap-2 text-[13px] leading-[1.4] text-gray-100">
            <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
            <div>
                <strong>Time:</strong> {timeComplexity}
            </div>
            </div>
            <div className="flex items-start gap-2 text-[13px] leading-[1.4] text-gray-100">
            <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
            <div>
                <strong>Space:</strong> {spaceComplexity}
            </div>
            </div>
        </div>
        )}
    </div>
);

const SolutionSection = ({
  title,
  content,
  isLoading
}: {
  title: string;
  content: string;
  isLoading: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (typeof content === "string") {
      // Clean the string before copying
      const cleanedCode = content.replace(/^(```|""")\w*\n?/, '').replace(/\n?(```|""")$/, '').trim();
      navigator.clipboard.writeText(cleanedCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const cleanedCode = typeof content === 'string' 
    ? content.replace(/^(```|""")\w*\n?/, '').replace(/\n?(```|""")$/, '').trim()
    : '';

  return (
    <div className="space-y-2 relative">
      <h2 className="text-[13px] font-medium text-white tracking-wide">
        {title}
      </h2>
      {isLoading ? (
        <div className="mt-4 flex">
            <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
                Loading solution...
            </p>
        </div>
      ) : (
        <div className="w-full relative">
          <button
            onClick={copyToClipboard}
            className="absolute top-2 right-2 text-xs text-white bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition z-10"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <SyntaxHighlighter
            showLineNumbers
            language={"python"} // This could be made dynamic later
            style={dracula}
            customStyle={{
              maxWidth: "100%",
              margin: 0,
              padding: "1rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              backgroundColor: "rgba(22, 27, 34, 0.5)"
            }}
            wrapLongLines={true}
          >
            {cleanedCode}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
};

const AnswerRenderer = ({
  problemType,
  answer,
  isLoading
}: {
  problemType?: string;
  answer?: any;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <div className="mt-2 flex">
        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
          Loading solution...
        </p>
      </div>
    );
  }

  if (!answer) return null;

  if (problemType === 'coding') {
    return (
        <SolutionSection
            title="Solution"
            content={answer}
            isLoading={isLoading}
        />
    );
  }
  
  const questionBlocks = answer.split(/(?=###\s+Question\s+\d+)/).filter((block: string) => block.trim() !== '');
  return (
    <div className="space-y-2">
        <h2 className="text-[13px] font-medium text-white tracking-wide">Solution</h2>
        {questionBlocks.map((block: string, index: number) => (
            <div key={index} className="bg-black/20 p-3 rounded-md">
            <ReactMarkdown
                components={{
                h3: ({node, ...props}) => <h3 className="text-sm font-semibold mb-1 text-gray-200" {...props} />,
                p: ({node, ...props}) => <p className="text-xs text-gray-300" {...props} />,
                }}
            >
                {block}
            </ReactMarkdown>
            </div>
        ))}
    </div>
  );
};


interface SolutionsProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions" | "debug">>;
}

const Solutions: React.FC<SolutionsProps> = ({ setView: _setView }) => {
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: problemStatementData, isLoading: isProblemLoading } = useQuery<NewProblemStatementData | null>(
    ["problem_statement"],
    () => Promise.resolve(null),
    { staleTime: Infinity, enabled: false }
  );
  
  const { data: solution, isLoading: isSolutionLoading } = useQuery<NewSolutionData | null>(
    ["solution"],
    () => Promise.resolve(null),
    { staleTime: Infinity, enabled: false }
  );

  const { data: extraScreenshots = [], refetch: refetchScreenshots } = useQuery<
    Array<{ path: string; preview: string }>,
    Error
  >(
    ["extras"],
    async () => {
      try {
        const existing = await window.electronAPI?.getScreenshots();
        return existing || [];
      } catch (error) {
        console.error("Error loading extra screenshots:", error);
        return [];
      }
    },
    { staleTime: Infinity, cacheTime: Infinity }
  );
  
  const answerData = solution?.solution?.answer;
  const reasoningData = solution?.solution?.reasoning;
  const timeComplexityData = solution?.solution?.time_complexity ?? null;
  const spaceComplexityData = solution?.solution?.space_complexity ?? null;

  const [debugProcessing, setDebugProcessing] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessage>({ title: "", description: "", variant: "neutral" });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  const showToast = ( title: string, description: string, variant: ToastVariant) => {
    setToastMessage({ title, description, variant });
    setToastOpen(true);
  };
 
  const handleDeleteExtraScreenshot = async (index: number) => {
    const screenshotToDelete = extraScreenshots[index];
    try {
      const response = await window.electronAPI.deleteScreenshot(screenshotToDelete.path);
      if (response.success) {
        refetchScreenshots();
      } else {
        console.error("Failed to delete extra screenshot:", response.error);
      }
    } catch (error) {
      console.error("Error deleting extra screenshot:", error);
    }
  };
 
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
          height: contentHeight
        });
      }
    };
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }
    updateDimensions();
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
      }),
      window.electronAPI.onDebugError(() => {
        showToast("Processing Failed", "There was an error debugging your code.", "error");
        setDebugProcessing(false);
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast("No Screenshots", "There are no extra screenshots to process.", "neutral");
      })
    ];
 
    return () => {
      resizeObserver.disconnect();
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [isTooltipVisible, tooltipHeight, queryClient, refetchScreenshots]);
 
  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible);
    setTooltipHeight(height);
  };

  return (
    <>
      {!isResetting && queryClient.getQueryData<NewSolutionData>(["new_solution"])?.solution ? (
        <Debug
          isProcessing={debugProcessing}
          setIsProcessing={setDebugProcessing}
        />
      ) : (
        <div ref={contentRef} className="relative flex flex-col space-y-3 px-4 py-3">
            <Toast open={toastOpen} onOpenChange={setToastOpen} variant={toastMessage.variant} duration={3000} >
                <ToastTitle>{toastMessage.title}</ToastTitle>
                <ToastDescription>{toastMessage.description}</ToastDescription>
            </Toast>
          
          {answerData && (
            <div className="bg-transparent w-fit">
              <div className="pb-3">
                <div className="space-y-3 w-fit">
                  <ScreenshotQueue
                    isLoading={debugProcessing}
                    screenshots={extraScreenshots}
                    onDeleteScreenshot={handleDeleteExtraScreenshot}
                  />
                </div>
              </div>
            </div>
          )}

          <SolutionCommands
            extraScreenshots={extraScreenshots}
            onTooltipVisibilityChange={handleTooltipVisibilityChange}
          />
          
          <div className="w-full text-sm bg-black/60 rounded-md">
            <div className="rounded-lg overflow-hidden">
                <div className="px-4 py-3 space-y-4 max-w-full">
                    <ContentSection
                        title={"Problem Statement"}
                        content={problemStatementData?.problem_statement}
                        isLoading={isProblemLoading && !problemStatementData}
                    />
                    
                    {problemStatementData && !answerData && (
                        <div className="mt-4 flex">
                        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
                            Generating solution...
                        </p>
                        </div>
                    )}
                    
                    {answerData && (
                        <>
                        <ContentSection
                            title="Analysis / Reasoning"
                            content={reasoningData}
                            isLoading={isSolutionLoading}
                        />

                        {/* CHANGE: The conditional logic has been moved from here */}
                        <AnswerRenderer
                            problemType={problemStatementData?.problem_type} // Pass the latest data here
                            answer={answerData}
                            isLoading={isSolutionLoading}
                        />
                        
                        {problemStatementData?.problem_type === "coding" && (
                            <ComplexitySection
                            timeComplexity={timeComplexityData}
                            spaceComplexity={spaceComplexityData}
                            isLoading={!timeComplexityData || !spaceComplexityData}
                            />
                        )}
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
