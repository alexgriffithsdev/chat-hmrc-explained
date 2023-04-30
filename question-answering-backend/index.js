const express = require("express");
const { PineconeClient } = require("@pinecone-database/pinecone");
const { getEmbedding, makeOpenAiChatRequest } = require("./openai-utils");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const port = 3002;

const pinecone = new PineconeClient();
pinecone.init({
  environment: process.env.PINECONE_ENV,
  apiKey: process.env.PINECONE_API_KEY,
});

app.post("/answer_question", async (req, res) => {
  const { chatQuery } = req.body;

  if (!chatQuery) return res.sendStatus(422);

  try {
    let isNoAnswer = false;

    const sanitizedChatQuery =
      "I am looking for individual advice only. " + chatQuery.slice(0, 200);

    const index = pinecone.Index(process.env.PINECONE_INDEX);

    // Get OpenAI embedded vector representation of user query
    const embedding = await getEmbedding({ content: sanitizedChatQuery });

    const queryRequest = {
      vector: embedding,
      topK: 2,
      includeValues: false,
      includeMetadata: true,
    };
    const queryResponse = await index.query({ queryRequest });

    if (!queryResponse?.matches) return res.sendStatus(500);

    isNoAnswer = queryResponse.matches[0].score < 0.8;

    let information = "";

    if (isNoAnswer) {
      information = "No HMRC guidelines found for this question";
    } else {
      // We would connect to a database here with the id from the pinecone response to get the actual text for the content
      const contents = [];

      contents.forEach((contentDoc) => {
        information += "Link: " + contentDoc.link;
        information += "\n" + contentDoc.content;
        information += "\n";
      });
    }

    // Construct prompt for ChatGPT
    const userContent = `Information: ${information}\nUser query: ${sanitizedChatQuery}`;
    const messages = [{ role: "user", content: userContent }];

    // Give the most relevant content from HMRC and the user's question to ChatGPT and ask it to generate an answer
    const chatGptResponse = await makeOpenAiChatRequest({
      systemPrompt:
        "You are a helpful HMRC assistant. Given some information from the UK government's website, you will answer a user's query regarding tax. You understand all laws and guidelines of HMRC. Your answer will be concise. Ask any follow up questions where necessary. You will only answer relevant questions.",
      messages,
    });

    console.log(chatGptResponse);

    return res.sendStatus(200);
  } catch (error) {
    console.log("Error in post /answer_question, error: ", error);
    return res.sendStatus(500);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
