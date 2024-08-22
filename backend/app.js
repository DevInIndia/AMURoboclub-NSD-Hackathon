require('dotenv').config();

const express = require("express");
const app = express();
const cors = require('cors');
const ExpressError = require("./utils/ExpressError.js");
const wrapAsync = require("./utils/wrapAsync.js");
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

app.post('/api/advanced-search', wrapAsync((req, res) => {
    const {temp, lumin, magni, color, spect, radii} = req.body;

    const query = {Temperature: temp, Relative_Luminosity: lumin, Absolute_Magnitude: magni, Color: color, Spectral_Class: spect,Relative_Radius: radii};
    res.json(query);
}));

app.post('/search', wrapAsync(async (req, res) => {
    let { name } = req.body;

    const response = await run(name);
    res.send(response);
}));

app.all("*", (req, res, next) => {
    throw new ExpressError(404, "Page Not Found!");
})

//Error handling Middleware
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;
    res.status(statusCode).send(message);
})

app.listen(8080, () => {
    console.log("App is listening at port 8080");
})