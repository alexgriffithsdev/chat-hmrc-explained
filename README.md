# ChatHMRC Code Explanation

Note: This and ChatHMRC is not endorsed or associated with HMRC. All content is for informational purposes only and is not financial advice.

Link to demo: https://chat-hmrc.vercel.app/

## Introduction

I had a few requests to explain how ChatHMRC works, so I have abstracted some of the code and simplified it to make it easier to explain. This is not really a tutorial, but a high-level overview with code.

Mainly the frontend is missing from this demo, as well as any persistent storage, authentication, etc.

## Step 1 - Get the content from gov.uk

The first challenge was to get all tax information from the https://www.gov.uk website.

There is tons of content on this website, but I ended up going with https://www.gov.uk/browse/tax. This seemed to be a good entry point to a lot of personal tax related guidelines.

### Web scraping with python

I used Python to scrape the https://www.gov.uk website just for simplicity.

You can view the scraping file in [this directory](python-scraping-scripts).

### First file [scrape-gov.py](python-scraping-scripts/scrape-gov.py)

I won't spend too much time explaining the code in this file. So to summarise, it starts at the parent page https://www.gov.uk/browse/tax before visiting each page in all the tax subtopics.

When it reaches a page with content on, it saves the subtopic link as well as all text on the page in a text file.

### Prerequisite: What are vector embeddings and how do they work for semantic search?

ChatGPT isn't aware of the up-to-date rules and guidelines on the gov.uk's website. So for each question supplied by the user, we need to fetch the relevant content that we scraped earlier and then supply this to ChatGPT.

So how do we get the relevant guidelines for an arbitrary question? **Semantic search**.

Vector embedding is a way to turn words or phrases into numbers that represent their meaning. This helps computers understand the meaning of language. In semantic search, these numbers are used to find documents that have similar meaning to a query, even if they don't use the exact same words.

### Second file [get-embeddings.py](python-scraping-scripts/get-embeddings.py)

In this file, we break the text for each page into chunks of 2000 characters or less. Before getting their vector embedding with OpenAI and then saving in Pinecone vector database https://www.pinecone.io/.

Pinecone is a convenient way to store vectors and quickly calculate the nearest vectors in terms of distance (how similar two pieces of text are in terms of their meaning).

Whereas OpenAI actually generates these embeddings using a LLM (large language model).

## Step 2 - Put it all together to answer questions

Next, we need an easy way to handle a user's question by querying our vector database and generating a response with ChatGPT.

Therefore I have included a simple NodeJS Express web server example [here](question-answering-backend/index.js). Please note that in the live version there is more logic to handle persistent storage, contextual follow up questions, auth, etc.

### How it works

Once we have everything scraped and set up it's easy to generate an answer from a user's question.

The first step is to get the most relevant content from our vector database. So we embed the user's question and then query Pinecone to get the 2 most relevant chunks of text.

From there, we pass the 2 chunks of text as well as the user's question to ChatGPT like:

```js
const prompt = `Information: ${2 most relevant text chunks}
                User question: ${user_query}`
```

We then set the scene by giving ChatGPT the system prompt:

```
You are a helpful HMRC assistant. Given some information from the UK government's website, you will answer a user's query regarding tax. You understand all laws and guidelines of HMRC. Your answer will be concise. Ask any follow up questions where necessary. You will only answer relevant questions.
```

Finally, we call the ChatGPT api and get a reponse!
