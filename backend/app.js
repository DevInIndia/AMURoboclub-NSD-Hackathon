require('dotenv').config();

const express = require("express");
const app = express();
const axios = require('axios');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cors({
    origin: "http://localhost:5173",
    methods: "GET,POST",
    credentials: true,
}));

app.options('*', cors({
    origin: "http://localhost:5173",
    methods: "GET,POST",
    credentials: true,
}));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function run(name) {
    const prompt = `Give me the answer of ${name} in terms of astronomy and space`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
}

app.get("/", (req, res) => {
    res.send("Working");
})

app.post('/api/checkExoPlanet', async (req, res) => {
    const fluxData = {
        flux1: req.body.flux1,
        flux2: req.body.flux2,
        flux3: req.body.flux3,
        flux4: req.body.flux4,
        flux5: req.body.flux5
    };

    try {
        const response = await axios.post('http://localhost:5000/predict', fluxData);
        res.json(response.data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error communicating with AI/ML server');
    }
});

app.post('/search', async (req, res) => {
    let { name } = req.body;

    const response = await run(name);
    res.send(response);
});

app.listen(8080, () => {
    console.log("App is listening at port 8080");
})