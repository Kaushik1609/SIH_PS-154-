import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3 } from "../config/s3.js"

export const uploadToS3 = async (filename, buffer, contentType) => {
    if (process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_ACCESS_KEY_ID.includes("add aws")) {
        try {
            await s3.send(
                new PutObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Body: buffer,
                    Key: filename,
                    ContentType: contentType
                })
            )
            return filename
        } catch (err) {
            console.log("[S3] S3 upload failed, using data URI fallback:", err.message)
        }
    }
    return `data:${contentType};base64,${buffer.toString("base64")}`
}