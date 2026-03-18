import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  getInputProps,
} from "remotion";
import { compileCode } from "./compiler";

interface DynamicCompProps {
  code: string;
  [key: string]: unknown;
}

export const DynamicComp: React.FC = () => {
  const { code } = getInputProps() as DynamicCompProps;

  const [handle] = useState(() => delayRender("Compiling code..."));
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Step 1: compile the code and set state
  useEffect(() => {
    try {
      const result = compileCode(code);
      if (result.error) {
        setError(result.error);
      } else {
        setComponent(() => result.Component);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsReady(true);
    }
  }, [code]);

  // Step 2: only call continueRender AFTER React has re-rendered with the new
  // Component or error state — prevents Remotion from capturing blank frames
  useEffect(() => {
    if (isReady) {
      continueRender(handle);
    }
  }, [isReady, handle]);

  if (error) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#1a1a2e",
          justifyContent: "center",
          alignItems: "center",
          padding: 60,
        }}
      >
        <div
          style={{
            color: "#ff6b6b",
            fontSize: 42,
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            maxWidth: "80%",
          }}
        >
          Compilation Error
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 24,
            fontFamily: "monospace",
            marginTop: 24,
            textAlign: "center",
            maxWidth: "80%",
            wordBreak: "break-word",
          }}
        >
          {error}
        </div>
      </AbsoluteFill>
    );
  }

  if (!Component) {
    return null;
  }

  return <Component />;
};
