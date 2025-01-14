import { v2 as cloudinary } from "cloudinary"
import { extractPublicId } from "cloudinary-build-url"
import fs from "fs"

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        //file has been uploaded successful
        // console.log("file is uploaded on cloudinary",response.url);
        fs.existsSync(localFilePath)
        fs.unlinkSync(localFilePath)
        //better way to write above code
        // if (fs.existsSync(localFilePath)) {
        //     fs.unlinkSync(localFilePath);  // Delete the local file after successful upload
        //     console.log(`File ${localFilePath} was successfully deleted`);
        //   } else {
        //     console.warn(`File ${localFilePath} does not exist, skipping deletion`);
        //   }

        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteInCloudinary = async (fileUrl) => {
    try {
        if (!fileUrl) {
            return null
        }
        const publicId = extractPublicId(fileUrl)
        if (!publicId) {
            return null
        }

        let resourceType = "image"; // Default to image
        if (fileUrl.match(/\.(mp4|mkv|mov|avi)$/)) {
            resourceType = "video";
        } else if (fileUrl.match(/\.(mp3|wav)$/)) {
            resourceType = "raw"; // For audio or other file types
        }

        const res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
        return res;
    } catch (error) {
        return null;
    }
}


export {
    uploadOnCloudinary
    , deleteInCloudinary
}