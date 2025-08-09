import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Schema for request validation
const BodySchema = z.object({
    text: z.string().min(1, "text is required"),
});

// Default system prompt tailored for judicial statement sentiment analysis
const SYSTEM_PROMPT =
    `Role: Classifier for alleged defamation under Pasal 310 KUHP, Pasal 311 KUHP, and Pasal 27A UU ITE (UU No. 1 Tahun 2024).

Task:
- Given a paragraph, split it into sentences.
- Identify sentences that potentially violate one or more pasal based only on the text.

Legal criteria:
- Pasal 310 KUHP: Intentional attack on a specific person honor/reputation by alleging a specific fact so it becomes publicly known. (2) covers written/broadcast forms. Exceptions: clear public interest or necessary self‑defense.
- Pasal 311 KUHP: False accusation (fitnah): a factual allegation presented as true, with knowledge it is false, and failure to prove truth. Only flag if the text explicitly admits or clearly implies knowledge of falsity.
- Pasal 27A UU ITE: The Pasal 310 elements, but conducted via electronic information/documents through electronic systems.

Guidance:
- Prefer Pasal 27A for online/electronic text; use Pasal 310 if medium is non-electronic/unspecified. Apply Pasal 311 only under its strict textual cues.
- Distinguish fact from opinion. Do not flag pure opinions, hyperbole, or value judgments unless they imply undisclosed defamatory facts.
- Target must be an identifiable person (not a vague group).
- Do not flag when the sentence clearly serves public interest or necessary self-defense.

Output:
- Return strict JSON array. Include only violating sentences.
- Each item must be:
  {
    "sentence": "<exact sentence>",
    "pasal": "Pasal 310 KUHP" | "Pasal 311 KUHP" | "Pasal 27A UU ITE (UU No. 1 Tahun 2024)",
    "rationale": "<<=25 words, concise reason>"
  }
- Rationale must be in Indonesian
- If no violations, return [].
- NO EXTRA KEYS, TEXT, OR MARKDOWN.`;

export async function POST(req: NextRequest) {
    try {
        const json = await req.json();
        const { text } = BodySchema.parse(json);

        // Ensure API key is configured
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY in environment" },
                { status: 500 }
            );
        }

        // Initialize the Google Generative AI chat model via LangChain
        const model = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            model: "gemini-2.0-flash",
            temperature: 0
        });

        const input = `System:\n${SYSTEM_PROMPT}\nUser:\nText:${text}`;

        const res = await model.invoke(input);

        // Attempt to parse JSON from model output; handle string or object
        let data: any;
        try {
            const content = typeof (res as any).content === "string" ? (res as any).content : (res as any)?.lc_kwargs?.content ?? "";
            data = JSON.parse(content);
        } catch {
            // fallback: try to extract JSON block
            const raw = typeof (res as any).content === "string" ? (res as any).content : JSON.stringify((res as any));
            const match = raw.match(/\{[\s\S]*\}/);
            if (match) {
                data = JSON.parse(match[0]);
            } else {
                return NextResponse.json(
                    { error: "Model returned non-JSON output", raw: (res as any).content },
                    { status: 502 }
                );
            }
        }

        // Validate output shape
        const OutSchema = z.object({
            sentence: z.string(),
            score: z.enum(["Pasal 310 KUHP", "Pasal 311 KUHP", "Pasal 27A UU ITE (UU No. 1 Tahun 2024)"]),
            rationale: z.string(),
        });
        const OutputArray = z.array(OutSchema);

        const output = OutputArray.safeParse(data);

        if (!output.success) {
            console.log(output);
            return NextResponse.json({ text: "No violation detected" }, { status: 200 });
        }

        return NextResponse.json(output);
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: "Validation error",
                    details: err.errors.map(e => `${e.path.join('.')} - ${e.message}`)
                },
                { status: 400 }
            );
        }
        console.error("/api/sentiment error", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
