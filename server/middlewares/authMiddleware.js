import { getAuth } from "@clerk/express";

export const protect = (req, res, next) => {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        req.userId = userId;

        next();
    } catch (error) {
        console.log("Auth error:", error);

        return res.status(401).json({
            error: error.message || "Unauthorized"
        });
    }
};