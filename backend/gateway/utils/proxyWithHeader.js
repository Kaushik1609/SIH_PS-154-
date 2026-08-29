import proxy from "express-http-proxy"

export const proxyWithHeader = (serviceUrl) => {
    return proxy(serviceUrl, {
        limit: "50mb",
        parseReqBody: false,
        timeout: 120000,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId || "operator-user"
            }
            return proxyReqOpts
        },
        proxyErrorHandler: (err, res, next) => {
            if (res.headersSent) {
                return next(err)
            }
            res.status(502).json({
                message: `Gateway proxy error to ${serviceUrl}: ${err.message}`
            })
        }
    })
}