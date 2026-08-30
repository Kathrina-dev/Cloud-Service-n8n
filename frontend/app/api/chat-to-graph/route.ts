import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_PROMPT = `
You are an AI assistant that translates natural language architecture requests into JSON nodes and edges for a React Flow graph.
You have the following node types available:
- ALB Load Balancer
- EC2 Instance
- RDS Database
- S3 Bucket
- Secrets Manager
- CloudWatch Logs
- ACM Certificate
- VPC Network

Your goal is to parse the user's prompt and return a JSON object with two arrays: \`newNodes\` and \`newEdges\`.
\`newNodes\` should contain objects with:
- \`id\`: A unique string id for new nodes (e.g. "chat-node-1")
- \`label\`: Must exactly match one of the available node types above.
- \`logicalName\`: A short, context-specific name based on the prompt (e.g., "Web Server" or "Database")

\`newEdges\` should contain objects with:
- \`source\`: The id of the source node
- \`target\`: The id of the target node

If the user mentions connecting to an existing node in the graph, use the existing node's ID from the provided currentGraph instead of creating a new node for it. The IDs of existing nodes will be provided in the currentGraph payload.

Output Format:
You MUST output ONLY valid JSON. Do not include markdown blocks like \`\`\`json.
{
  "newNodes": [{ "id": "chat-node-1", "label": "EC2 Instance", "logicalName": "App Server" }],
  "newEdges": [{ "source": "chat-node-1", "target": "existing-node-id" }]
}
`;

export async function POST(request: Request) {
  try {
    const { prompt, currentGraph } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing in the environment variables.' },
        { status: 500 }
      );
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        { role: 'user', parts: [{ text: `Current Graph: ${JSON.stringify(currentGraph)}\n\nUser Request: ${prompt}` }] }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1,
      }
    });

    const aiResponseText = response.text;
    if (!aiResponseText) {
      throw new Error('AI returned empty response.');
    }

    let cleanJson = aiResponseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }

    const parsedData = JSON.parse(cleanJson);
    
    return NextResponse.json(parsedData, { status: 200 });
  } catch (error: any) {
    console.error('Error in chat-to-graph:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
