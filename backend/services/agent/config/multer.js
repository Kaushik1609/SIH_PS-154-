import fs from "fs"
import path from "path"
import multer from "multer"
const uploadDir = path.resolve("./temp")

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir)
    },
    filename(req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`)
    },
})

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
        "text/html"
    ]

    if (
        allowedMimeTypes.includes(file.mimetype) ||
        file.mimetype.startsWith("image/") ||
        file.mimetype.startsWith("audio/") ||
        file.mimetype.startsWith("video/")
    ) {
        cb(null, true)
    } else {
        cb(new Error("Only PDF, DOCX, TXT, HTML, and Images are allowed."))
    }
}

export default multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 30 * 1024 * 1024
    }
})