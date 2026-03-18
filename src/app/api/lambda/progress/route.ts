import {
  AwsRegion,
  getRenderProgress,
  speculateFunctionName,
} from "@remotion/lambda/client";
import { DISK, RAM, REGION, TIMEOUT } from "../../../../../config.mjs";
import { ProgressRequest, ProgressResponse } from "../../../../../types/schema";
import { executeApi } from "../../../../helpers/api-response";

export const POST = executeApi<ProgressResponse, typeof ProgressRequest>(
  ProgressRequest,
  async (req, body) => {
    const renderProgress = await getRenderProgress({
      bucketName: body.bucketName,
      functionName: speculateFunctionName({
        diskSizeInMb: DISK,
        memorySizeInMb: RAM,
        timeoutInSeconds: TIMEOUT,
      }),
      region: REGION as AwsRegion,
      renderId: body.id,
    });

    if (renderProgress.fatalErrorEncountered) {
      return {
        type: "error",
        message: renderProgress.errors[0]?.message ?? "An unknown render error occurred",
      };
    }

    if (renderProgress.done) {
      if (!renderProgress.outputFile) {
        return {
          type: "error",
          message: "Render completed but no output file was produced",
        };
      }
      return {
        type: "done",
        url: renderProgress.outputFile,
        size: renderProgress.outputSizeInBytes ?? 0,
      };
    }

    return {
      type: "progress",
      progress: Math.max(0.03, renderProgress.overallProgress),
    };
  },
);
