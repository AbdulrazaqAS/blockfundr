import formidable from 'formidable';
import fs from 'fs';
import axios from 'axios';
import FormData from "form-data";

export const config = {
  api: {
    bodyParser: false, // Allow file uploads, make vercel not parse it automatically
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {  // fields for texts, files for files
    if (err) {  // if error while parsing form
      console.error("Form parse error:", err);
      return res.status(500).json({ error: 'Error parsing form' });
    }

    console.log("Fields:", fields);
    console.log("Files:", files);

    // Ensure that a file(image) exists
    if (Object.keys(files).length === 0) {
        return res.status(400).json({ error: "No image uploaded" });
    }

    try {
      const image = files.image[0];
      const { title, description, location, totalCampaigns } = fields;

      // Upload image
      const fileStream = fs.createReadStream(image.filepath);  // read image
      const formData = new FormData();
      formData.append("file", fileStream, {
          filename: image.originalFilename,
          contentType: image.mimetype,
      });
      
      const pinataApiKey = process.env.PINATA_API_KEY;
      const pinataSecret = process.env.PINATA_API_SECRET;

      const imgResponse = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecret,
        },
      });

      const imageUrl = `https://gateway.pinata.cloud/ipfs/${imgResponse.data.IpfsHash}`;

      // Upload metadata
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
      console.error("Pinata upload error:", error);
      return res.status(500).json({ error: 'Failed to upload to IPFS' });
    }
  });
}
