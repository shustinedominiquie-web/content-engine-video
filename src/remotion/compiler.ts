import * as Babel from "@babel/standalone";
import { Lottie } from "@remotion/lottie";
import * as RemotionShapes from "@remotion/shapes";
import { ThreeCanvas } from "@remotion/three";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Freeze,
  Img,
  Loop,
  OffthreadVideo,
  Sequence,
  Series,
  Video,
  interpolate,
  interpolateColors,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";

export interface CompilationResult {
  Component: React.ComponentType | null;
  error: string | null;
}

// Strip imports and extract component body from LLM-generated code
// Safety layer in case LLM includes full ES6 syntax despite instructions
function extractComponentBody(code: string): string {
  // Strip all import statements (handles multi-line imports with newlines in braces)
  let cleaned = code;

  // Remove type imports: import type { ... } from "...";
  cleaned = cleaned.replace(
    /import\s+type\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g,
    "",
  );
  // Remove combined default + named imports: import X, { ... } from "...";
  cleaned = cleaned.replace(
    /import\s+\w+\s*,\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g,
    "",
  );
  // Remove multi-line named imports: import { ... } from "...";
  cleaned = cleaned.replace(
    /import\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g,
    "",
  );
  // Remove namespace imports: import * as X from "...";
  cleaned = cleaned.replace(
    /import\s+\*\s+as\s+\w+\s+from\s*["'][^"']+["'];?/g,
    "",
  );
  // Remove default imports: import X from "...";
  cleaned = cleaned.replace(/import\s+\w+\s+from\s*["'][^"']+["'];?/g, "");
  // Remove side-effect imports: import "...";
  cleaned = cleaned.replace(/import\s*["'][^"']+["'];?/g, "");

  cleaned = cleaned.trim();

  // Match all common export const arrow function patterns:
  //   export const MyAnimation = () => { ... }
  //   export const MyAnimation: React.FC = () => { ... }
  //   export const MyAnimation = (): JSX.Element => { ... }
  //   export const MyAnimation = () => <div/>   (expression body)
  const exportMatch = cleaned.match(
    /^([\s\S]*?)export\s+const\s+\w+(?:\s*:\s*[^=]+)?\s*=\s*\([^)]*\)(?:\s*:\s*[^=>{]+)?\s*=>\s*([\s\S]*)$/,
  );

  if (exportMatch) {
    const helpers = exportMatch[1].trim();
    let body = exportMatch[2].trim();

    if (body.startsWith("{")) {
      // Block body — find the matching closing brace using depth tracking
      let depth = 0;
      let endIndex = -1;
      for (let i = 0; i < body.length; i++) {
        if (body[i] === "{") depth++;
        else if (body[i] === "}") {
          depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
        }
      }
      if (endIndex !== -1) {
        body = body.slice(1, endIndex).trim();
      }
    } else {
      // Expression body — strip trailing semicolon and wrap in return
      body = body.replace(/;?\s*$/, "");
      body = `return (\n  ${body}\n);`;
    }

    return helpers ? `${helpers}\n\n${body}` : body;
  }

  return cleaned;
}

// Standalone compile function for use outside React components
export function compileCode(code: string): CompilationResult {
  if (!code?.trim()) {
    return { Component: null, error: "No code provided" };
  }

  try {
    const componentBody = extractComponentBody(code);
    const wrappedSource = `const DynamicAnimation = () => {\n${componentBody}\n};`;

    const transpiled = Babel.transform(wrappedSource, {
      presets: ["react", "typescript"],
      filename: "dynamic-animation.tsx",
    });

    if (!transpiled.code) {
      return { Component: null, error: "Transpilation failed" };
    }

    const Remotion = {
      AbsoluteFill,
      interpolate,
      interpolateColors,
      useCurrentFrame,
      useVideoConfig,
      spring,
      Sequence,
      Series,
      Loop,
      Freeze,
      Img,
      Video,
      Audio,
      OffthreadVideo,
      staticFile,
      random,
    };

    const wrappedCode = `${transpiled.code}\nreturn DynamicAnimation;`;

    const createComponent = new Function(
      "React",
      "Remotion",
      "RemotionShapes",
      "Lottie",
      "ThreeCanvas",
      "THREE",
      // Core Remotion
      "AbsoluteFill",
      "interpolate",
      "interpolateColors",
      "useCurrentFrame",
      "useVideoConfig",
      "spring",
      "Sequence",
      "Series",
      "Loop",
      "Freeze",
      "Img",
      "Video",
      "Audio",
      "OffthreadVideo",
      "staticFile",
      "random",
      // React hooks
      "useState",
      "useEffect",
      "useMemo",
      "useRef",
      "useCallback",
      // Shapes
      "Rect",
      "Circle",
      "Triangle",
      "Star",
      "Polygon",
      "Ellipse",
      "Heart",
      "Pie",
      "makeRect",
      "makeCircle",
      "makeTriangle",
      "makeStar",
      "makePolygon",
      "makeEllipse",
      "makeHeart",
      "makePie",
      // Transitions
      "TransitionSeries",
      "linearTiming",
      "springTiming",
      "fade",
      "slide",
      "wipe",
      "flip",
      "clockWipe",
      wrappedCode,
    );

    const Component = createComponent(
      React,
      Remotion,
      RemotionShapes,
      Lottie,
      ThreeCanvas,
      THREE,
      // Core Remotion
      AbsoluteFill,
      interpolate,
      interpolateColors,
      useCurrentFrame,
      useVideoConfig,
      spring,
      Sequence,
      Series,
      Loop,
      Freeze,
      Img,
      Video,
      Audio,
      OffthreadVideo,
      staticFile,
      random,
      // React hooks
      useState,
      useEffect,
      useMemo,
      useRef,
      useCallback,
      // Shapes
      RemotionShapes.Rect,
      RemotionShapes.Circle,
      RemotionShapes.Triangle,
      RemotionShapes.Star,
      RemotionShapes.Polygon,
      RemotionShapes.Ellipse,
      RemotionShapes.Heart,
      RemotionShapes.Pie,
      RemotionShapes.makeRect,
      RemotionShapes.makeCircle,
      RemotionShapes.makeTriangle,
      RemotionShapes.makeStar,
      RemotionShapes.makePolygon,
      RemotionShapes.makeEllipse,
      RemotionShapes.makeHeart,
      RemotionShapes.makePie,
      // Transitions
      TransitionSeries,
      linearTiming,
      springTiming,
      fade,
      slide,
      wipe,
      flip,
      clockWipe,
    );

    if (typeof Component !== "function") {
      return {
        Component: null,
        error: "Code must be a function that returns a React component",
      };
    }

    return { Component, error: null };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown compilation error";
    return { Component: null, error: errorMessage };
  }
}
