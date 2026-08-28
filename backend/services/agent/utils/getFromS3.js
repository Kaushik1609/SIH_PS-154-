import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { s3 } from "../config/s3.js"
import { GetObjectCommand } from "@aws-sdk/client-s3"

export const getFromS3 = async (filename, expiresIn = 600) => {
    if (filename && filename.startsWith("data:")) {
        return filename // already data URI
    }

    if (process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_ACCESS_KEY_ID.includes("add aws")) {
        try {
            return await getSignedUrl(
                s3,
                new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: filename
                }),
                { expiresIn }
            )
        } catch (err) {
            console.log("[S3] getSignedUrl failed:", err.message)
        }
    }
    return filename
}