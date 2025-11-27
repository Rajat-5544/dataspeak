import { NextRequest, NextResponse } from "next/server";
import { generateSQLFromQuestion } from "@/lib/llm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, schema } = body;

    // Validate input
    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required and must be a string" },
        { status: 400 }
      );
    }

    if (!schema || typeof schema !== "string") {
      return NextResponse.json(
        { error: "Schema is required and must be a string" },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Google Gemini API key is not configured. Please set GOOGLE_GEMINI_API_KEY environment variable.",
        },
        { status: 500 }
      );
    }

    // Generate SQL from natural language question
    const sql = await generateSQLFromQuestion(question, schema);

    return NextResponse.json({
      success: true,
      sql,
    });
  } catch (error) {
    console.error("LLM API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate SQL query",
      },
      { status: 500 }
    );
  }
}

