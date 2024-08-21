require('dotenv').config();

const express = require("express");
const app = express();
const { GoogleGenerativeAI } = require("@google/generative-ai");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function run(name) {
    const prompt = `Give me the answer of ${name} in terms of astronomy and space`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
    // console.log(text);
}

app.get("/", (req, res) => {
    res.send("Working");
})

app.post('/search', async (req, res) => {
    let { name } = req.body;

    const response = await run(name);
    // res.redirect("/response", {response})
    res.send(response);
    // res.send("Response was sent in the console 1 window.");
});

app.listen(8080, () => {
    console.log("App is listening at port 8080");
})