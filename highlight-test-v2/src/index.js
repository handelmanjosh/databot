import Resolver from '@forge/resolver';
import { Configuration, OpenAIApi } from "openai";
import api, { storage, route } from "@forge/api";
import tty from "tty";

const resolver = new Resolver();

resolver.define("getPageData", async (req) => {
  const contentId = req.context.extension.content.id;
  const response = await api.asApp().requestConfluence(route`/wiki/api/v2/pages/${contentId}?body-format=storage`, {
    headers: {
      "Accept": "application/json"
    }
  });
  console.log(`Response: ${response.status} ${response.statusText}`);
  const responseData = await response.json();
  const returnedData = responseData.body.storage.value
  return returnedData;
})
resolver.define('label', async (req) => {
  const contentId = req.context.extension.content.id;
  const bodyData = JSON.parse(req.payload.bodyData).map(label => ({
    prefix: "global",
    name: label.split(" ").join("-")
  }));
  const response = await api.asApp().requestConfluence(route`/wiki/rest/api/content/${contentId}/label`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(bodyData),
  })
  return response;
})
resolver.define('comment', async (req) => {
  const contentId = req.context.extension.content.id;
  const bodyData = {
    pageId: contentId,
    body: {
      representation: "storage",
      value: req.payload.bodyData
    }
  }
  const response = await api.asUser().requestConfluence(route`/wiki/api/v2/footer-comments`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyData),
  });
  return response;
})
resolver.define("write", async (req) => {
  const contentId = req.context.extension.content.id;
  const bodyData = {
    id: contentId,
    status: "current",
    title: "Test",
    body: {
      storage: {
        value: req.payload.data,
        representation: "storage"
      }
    },
    version: {
      number: Date.now(),
      message: "Updated page",
    }
  }
  const response = await api.asUser().requestConfluence(route`/wiki/api/v2/pages/{id}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyData)
  });
  console.log(`Response: ${response.status} ${response.statusText}`);
  return response;
})
resolver.define('getText', (req) => {
  return req;
});
resolver.define('addData', async (req) => {
    const {key, data} = req.payload;
    await addData(key, data);
});
resolver.define("retrieveData", async () => {
  const data = await retrieveData();

  return data;
});
resolver.define("deleteData", async (req) => {
  const {key} = req.payload;
  const d = await deleteData(key);
  return d;
})
resolver.define("deleteAllData", async () => {
  for (let i = 0; i < 11; i++) {
    await storage.delete(`${i}`);
  }
  await storage.set("NUM", 0);
})
async function deleteData(key) {
  let index = undefined;
  for (let i = 0; i < 10; i++) {
    const pair = await storage.get(`${i}`);
    if (pair && pair.key == key) {
      index = i;
    }
  }
  if (index !== undefined) {
    await storage.delete(`${index}`);
    for (let i = index; i < 10; i++) {
      const pair = await storage.get(`${i + 1}`);
      if (pair) {
        await storage.set(`${i}`, { key: pair.key, data: pair.data });
      } else {
        break;
      }
    }
  }
}
async function addData(key, data) {
  const num = await storage.get("NUM");
  let value;
  if (num && num.value != undefined && num.value != null && !Number.isNaN(num.value)) {
    const embeddingData = await generateEmbeddings(data);
    if (num.value == 10) {
      await storage.delete("0");
      for (let i = 1; i < 11; i++) {
        const pair = await storage.get(`${i}`);
        await storage.set(`${i - 1}`, { key: pair.key, data: pair.data, original: pair.original });
      }
      await storage.set("10", { key: key, data: embeddingData, original: data });
    } else {
      value = await storage.set(`${num.value + 1}`, { key: key, data: embeddingData, original: data });
      await storage.set("NUM", { value: num.value + 1 })
    }
  } else {
    const embeddingData = await generateEmbeddings(data);
    value = await storage.set("0", {key, data: embeddingData, original: data})
    await storage.set("NUM", { value: 0 })
  }
  return value;
}
async function retrieveData() {
  const num = await storage.get("NUM");
  let pairs = []
  if (num && num.value != undefined && num.value != null && !Number.isNaN(num.value)) {
    for (let i = 0; i <= num.value; i++) {
      const pair = await storage.get(`${i}`);
      if (pair.key && pair.data) {
        // this is different on purpose - dont need to send embedding to client
        pairs.push({ key: (pair.key || "No key provided"), data: pair.original });
      }
    }
  }
  return pairs
}
resolver.define('ai', async (req) => {
  const result = await makePrompt(req.payload.text, req.context.extension.selectedText, req.payload.embeddings);
  return result;
})
resolver.define('ai2', async (req) => {
  const result = await makePrompt(req.payload.text, req.payload.selectedContext, req.payload.embeddings);
  return result;
})
function findSimilarEmbeddingIndex(text, embeddings) {
  let distance = Infinity;
  let index = 0;
  for (let i = 0; i < embeddings.length; i++) {
    const embedding = embeddings[i];
    const newDistance = Math.sqrt(embedding.reduce((acc, curr) => {
      return acc + Math.pow(curr - text[i], 2);
    }, 0));
    if (newDistance < distance) {
      distance = newDistance;
      index = i;
    }
  }
  return index;
}
async function generateEmbeddings(text) {
  tty.isatty = () => { return false };
  const configuration = new Configuration({
    apiKey: "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",          // Replace with your actual API key
  });
  const openai = new OpenAIApi(configuration);
  const embeddings = await openai.createEmbedding({
    model: 'text-embedding-ada-002',
    input: text
  });
  console.log(embeddings.data.data[0].embedding);
  return embeddings.data.data[0].embedding;
}
export async function makePrompt(question, context, embeddings) {
  // Polyfilling tty.isatty due to a limitation in the Forge runtime
// This is done to prevent an error caused by a missing dependency
  tty.isatty = () => { return false };

// Create a configuration object for the OpenAI API
// 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
  const configuration = new Configuration({
    apiKey: "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",          // Replace with your actual API key
  });

// Log the API configuration for debugging purposes
  //console.log(configuration)

// Create an instance of the OpenAIApi with the provided configuration
const openai = new OpenAIApi(configuration);
  let embeddingData;
  if (embeddings) {
    const questionEmbeddings = await generateEmbeddings(question);
    let myEmbeddings = [];
    for (let i = 0; i < 11; i++) {
      const pair = await storage.get(`${i}`);
      if (pair && pair.data) {
        myEmbeddings.push(pair.data);
      }
    }
    const embeddingIndex = findSimilarEmbeddingIndex(questionEmbeddings, myEmbeddings);
    const pair = await storage.get(`${embeddingIndex}`);
    if (pair) {
      embeddingData = pair.original;
    }
  }
// Log the prompt that will be sent to the OpenAI API
  const prompt = `
        Given this context: "${context}"
        ${embeddings ? `And this relevant info: ${embeddingData}`: ""}
        Answer ${question}
        `
        
  console.log(prompt);
// Create a chat completion request using the OpenAI API
  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",  // Specify the model to use (GPT-3.5 Turbo)
    messages: [{
      role: "user",         // Role of the user in the conversation
      content: prompt       // The user's input prompt
    }]
  });
  console.log("made completion");
// Extract the response content from the API response
  const response = chatCompletion.data.choices[0].message.content;

// Log the generated response for debugging purposes
  //console.log("Prompt response - " + response);

// Return the generated response from the OpenAI API
  return response;
}


export const handler = resolver.getDefinitions();
