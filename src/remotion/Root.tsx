import React from "react";
import { Composition } from "remotion";
import { DynamicComp } from "./DynamicComp";
import { AMPCommercial } from "./compositions/AMPCommercial";

// Block-body arrow function so extractComponentBody can parse it correctly
const defaultCode = `import { AbsoluteFill } from "remotion";
export const MyAnimation = () => {
  return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
};`;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DynamicComp"
        component={DynamicComp}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ code: defaultCode, durationInFrames: 180, fps: 30 }}
        calculateMetadata={({ props }) => ({
          durationInFrames: (props.durationInFrames as number) ?? 180,
          fps: (props.fps as number) ?? 30,
        })}
      />
      <Composition
        id="AMPCommercial"
        component={AMPCommercial}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ avatarVideoUrl: "" }}
      />
    </>
  );
};
