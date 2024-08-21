require('dotenv').config();

const express = require("express");
const app = express();
const axios = require("axios")

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Replace 'YOUR_NASA_API_KEY' with your actual NASA API key
const NASA_API_KEY = process.env.NASA_API_KEY;

// Function to fetch image URL from NASA API
async function fetchImageUrl(name) {
    try {
        const response = await axios.get(`https://images-api.nasa.gov/search?q=${name}&media_type=image`);
        const items = response.data.collection.items;
        if (items.length > 0) {
            return items[0].links[0].href;
        } else {
            throw new Error('No images found');
        }
    } catch (error) {
        console.error('Error fetching image URL:', error);
        throw error;
    }
}

app.get("/", (req, res) => {
    res.send("Working");
})

app.get("/get-image-url/:name", async (req, res) => {
    let name= req.params.name;
    console.log("This is the name of the getImage:", name);

    try {
      const imageUrl = await fetchImageUrl(name);
      // Assuming you have another route to handle the image URL
      res.redirect(`/handle-image-url?imageUrl=${encodeURIComponent(imageUrl)}`);
  } catch (error) {
      res.status(500).send('Error fetching image URL');
  }
})

// Route to handle the image URL
app.get('/handle-image-url', (req, res) => {
  const imageUrl = req.query.imageUrl;
  // Do something with the image URL, e.g., render a page with the image
  res.send(`<img src="${imageUrl}" alt="Image of ${req.query.name}">`);
});

app.listen(8080, () => {
    console.log("App is listening at port 8080");
})