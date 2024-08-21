require('dotenv').config();

const express = require("express");
const app = express();
const axios = require('axios');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cors({
    origin: "http://localhost:5173/",
    methods: "GET,POST",
    credentials: true,
}));

app.options('*', cors({
    origin: "http://localhost:5173/",
    methods: "GET,POST",
    credentials: true,
}));

const nasaApiKey = process.env.nasaApiKey;
const n2yoApiKey = process.env.n2yoApiKey;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Route to get satellite data from N2YO
// app.get('/satellite/:satelliteId', async (req, res) => {
//     const { satelliteId } = req.params;
//     const observerLat = 28.706599; // example latitude
//     const observerLng = 77.178642; // example longitude
//     const observerAlt = 0; // altitude in meters
//     const seconds = 300;

//     try {
//         const n2yoResponse = await axios.get(`https://www.n2yo.com/rest/v1/satellite/positions/${satelliteId}/${observerLat}/${observerLng}/${observerAlt}/${seconds}/&apiKey=${n2yoApiKey}`);
//         res.json(n2yoResponse.data);
//     } catch (error) {
//         console.error('Error fetching satellite data:', error);
//         res.status(500).send('Error fetching satellite data');
//     }
// });

// // Route to get NASA Astronomy Picture of the Day (APOD)
// app.get('/nasa/apod', async (req, res) => {
//     try {
//         const nasaResponse = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${nasaApiKey}`);
//         res.json(nasaResponse.data);
//     } catch (error) {
//         console.error('Error fetching NASA data:', error);
//         res.status(500).send('Error fetching NASA data');
//     }
// });

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

app.get('/search', async (req, res) => {
    let { name } = req.body;

    const response = await run(name);
    res.json(response);

    // res.redirect("http://localhost:5173/advance", {response});
});

app.listen(8080, () => {
    console.log("App is listening at port 8080");
})