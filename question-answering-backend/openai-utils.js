const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const getEmbedding = async ({ content }) => {
  const embeddingRes = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: content,
  });

  const embedding = embeddingRes.data.data[0].embedding;

  return embedding;
};

const makeOpenAiChatRequest = async ({
  systemPrompt,
  messages,
  temperature,
}) => {
  messages = [{ role: "system", content: systemPrompt }, ...messages];

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages,
    temperature: temperature || 0.5,
    max_tokens: 200,
  });

  const answer = completion.data.choices[0].message.content;
  return answer;
};

module.exports = {
  getEmbedding,
  makeOpenAiChatRequest,
};
