import express from "express";
import formidable from 'formidable';
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import FormData from "form-data";

dotenv.config();
const app = express();
const PORT = 5000;

app.use(cors());

app.post("/api/uploadToIPFS", (req, res) => {
  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Form parsing error" });
    console.log("Fields:", fields);
    console.log("Files:", files);

    // Ensure that a file(image) exists
    if (Object.keys(files).length === 0) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    try {
      const image = files.image[0];
      const { title, description, location, totalCampaigns } = fields;

      const fileStream = fs.createReadStream(image.filepath);
      const formData = new FormData();  // using imported not built-in FormData to properly handle filestream. Built-in FormData doesn't support filestream.
      formData.append("file", fileStream, {
        filename: image.originalFilename,
        contentType: image.mimetype,  
      });

      const pinataApiKey = process.env.PINATA_API_KEY;
      const pinataSecret = process.env.PINATA_API_SECRET;

      const imgResponse = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataSecret,
          },
        }
      );

      const imageUrl = `https://gateway.pinata.cloud/ipfs/${imgResponse.data.IpfsHash}`;

      const metadata = {
        title: title[0],
        description: description[0],
        location: location[0],
        image: imageUrl,
      };

      const fileName = `campaign_metadata_${totalCampaigns}`;
      const jsonResponse = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
          pinataContent: metadata,
          pinataMetadata: { name: fileName },
        },
        {
          headers: {
            "Content-Type": "application/json",
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataSecret,
          },
        }
      );

      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${jsonResponse.data.IpfsHash}`;
      console.log("Metadata URL:", metadataUrl);
      return res.status(200).json({ metadataUrl });

    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ error: "Failed to upload" });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Local server running on http://localhost:${PORT}`);
});
