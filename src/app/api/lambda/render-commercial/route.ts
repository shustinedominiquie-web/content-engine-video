import {
  AwsRegion,
  renderMediaOnLambda,
  speculateFunctionName,
} from "@remotion/lambda/client";
import { NextResponse } from "next/server";
import { DISK, RAM, REGION, SITE_NAME, TIMEOUT } from "../../../../../config.mjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { avatarVideoUrl, width, height, durationInFrames } = body;

    if (!avatarVideoUrl) {
      return NextResponse.json(
        { type: "error", message: "avatarVideoUrl is required" },
        { status: 400 },
      );
    }

    if (
      !process.env.AWS_ACCESS_KEY_ID &&
      !process.env.REMOTION_AWS_ACCESS_KEY_ID
    ) {
      return NextResponse.json(
        { type: "error", message: "AWS credentials not configured. Set REMOTION_AWS_ACCESS_KEY_ID in your environment variables." },
        { status: 500 },
      );
    }

    if (
      !process.env.AWS_SECRET_ACCESS_KEY &&
      !process.env.REMOTION_AWS_SECRET_ACCESS_KEY
    ) {
      return NextResponse.json(
        { type: "error", message: "AWS credentials not configured. Set REMOTION_AWS_SECRET_ACCESS_KEY in your environment variables." },
        { status: 500 },
      );
    }

    // Trim AWS credentials to avoid ERR_INVALID_CHAR
    for (const key of [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "REMOTION_AWS_ACCESS_KEY_ID",
      "REMOTION_AWS_SECRET_ACCESS_KEY",
    ]) {
      if (process.env[key]) {
        process.env[key] = process.env[key]!.trim();
      }
    }

    const result = await renderMediaOnLambda({
      codec: "h264",
      functionName: speculateFunctionName({
        diskSizeInMb: DISK,
        memorySizeInMb: RAM,
        timeoutInSeconds: TIMEOUT,
      }),
      region: REGION as AwsRegion,
      serveUrl: SITE_NAME,
      composition: "AMPCommercial",
      inputProps: { avatarVideoUrl },
      framesPerLambda: 60,
      downloadBehavior: {
        type: "download",
        fileName: "amp-commercial.mp4",
      },
    });

    return NextResponse.json({
      type: "success",
      data: {
        renderId: result.renderId,
        bucketName: result.bucketName,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { type: "error", message: (err as Error).message },
      { status: 500 },
    );
  }
}
